import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { SOURCE_TYPE } from '@compliance/shared';

import { BaseConnector } from '../../base-connector';
import type { GitHubConfig, GitHubCredentials } from './types';

export class GitHubConnector extends BaseConnector<GitHubCredentials, GitHubConfig> {
  private octokit!: Octokit;

  async connect(): Promise<void> {
    if (this.credentials.type === 'github_app') {
      const { appId, privateKey, installationId } = this.credentials;
      const auth = createAppAuth({ appId, privateKey });
      const installationAuth = await auth({ type: 'installation', installationId });

      this.octokit = new Octokit({ auth: installationAuth.token });
    } else {
      this.octokit = new Octokit({ auth: this.credentials.token });
    }
  }

  async healthCheck() {
    try {
      await this.octokit.orgs.get({ org: this.config.orgLogin });
      return { healthy: true };
    } catch (err) {
      return { healthy: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async *collect() {
    yield* this.collectOrgAuditLog();
    yield* this.collectRepoMetadata();
  }

  private async *collectOrgAuditLog() {
    const org = this.config.orgLogin;
    let cursor: string | undefined;

    while (true) {
      // The audit log endpoint is accessed via request() as it requires special scopes
      const response = await this.octokit.request('GET /orgs/{org}/audit-log', {
        org,
        per_page: 100,
        ...(cursor ? { after: cursor } : {}),
      });

      const events = response.data as Array<Record<string, unknown>>;
      if (!events || events.length === 0) break;

      for (const event of events) {
        yield {
          sourceType: SOURCE_TYPE.GITHUB,
          entityType: 'github:org:audit_log',
          entityId: String(event['_document_id'] ?? event['id'] ?? `${org}-${Date.now()}-${Math.random()}`),
          data: event,
          collectedAt: new Date(),
        };
      }

      if (events.length < 100) break;

      // The audit log API returns Link headers for pagination; use last item's id as cursor
      const last = events[events.length - 1];
      cursor = String(last?.['_document_id'] ?? '');
      if (!cursor) break;

      await new Promise((r) => setTimeout(r, 100));
    }
  }

  private async *collectRepoMetadata() {
    const org = this.config.orgLogin;

    const repos = await this.octokit.paginate(this.octokit.repos.listForOrg, {
      org,
      per_page: 100,
      type: 'all',
    });

    for (const repo of repos) {
      yield {
        sourceType: SOURCE_TYPE.GITHUB,
        entityType: 'github:repo:metadata',
        entityId: repo.full_name,
        data: {
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          archived: repo.archived,
          default_branch: repo.default_branch,
          visibility: repo.visibility,
        } as Record<string, unknown>,
        collectedAt: new Date(),
      };

      // Collect branch protection for non-archived repos
      if (!repo.archived && repo.default_branch) {
        yield* this.collectBranchProtection(org, repo.name, repo.default_branch);
      }
    }
  }

  private async *collectBranchProtection(
    org: string,
    repo: string,
    defaultBranch: string,
  ) {
    try {
      const response = await this.octokit.repos.getBranchProtection({
        owner: org,
        repo,
        branch: defaultBranch,
      });

      const protection = response.data;
      const requiredReviews = protection.required_pull_request_reviews;
      const statusChecks = protection.required_status_checks;

      yield {
        sourceType: SOURCE_TYPE.GITHUB,
        entityType: 'github:repo:branch_protection',
        entityId: `${org}/${repo}/${defaultBranch}`,
        data: {
          repo: `${org}/${repo}`,
          branch: defaultBranch,
          enabled: true,
          enforce_admins: protection.enforce_admins?.enabled ?? false,
          required_approving_review_count:
            requiredReviews?.required_approving_review_count ?? 0,
          dismiss_stale_reviews: requiredReviews?.dismiss_stale_reviews ?? false,
          require_code_owner_reviews: requiredReviews?.require_code_owner_reviews ?? false,
          required_status_checks:
            statusChecks?.contexts ?? [],
          strict_status_checks: statusChecks?.strict ?? false,
        } as Record<string, unknown>,
        collectedAt: new Date(),
      };

      // Separate facts for required_reviews and status_checks for finer-grained rules
      yield {
        sourceType: SOURCE_TYPE.GITHUB,
        entityType: 'github:repo:required_reviews',
        entityId: `${org}/${repo}/${defaultBranch}`,
        data: {
          repo: `${org}/${repo}`,
          required_approving_review_count:
            requiredReviews?.required_approving_review_count ?? 0,
          dismiss_stale_reviews: requiredReviews?.dismiss_stale_reviews ?? false,
          require_code_owner_reviews: requiredReviews?.require_code_owner_reviews ?? false,
        } as Record<string, unknown>,
        collectedAt: new Date(),
      };

      yield {
        sourceType: SOURCE_TYPE.GITHUB,
        entityType: 'github:repo:status_checks',
        entityId: `${org}/${repo}/${defaultBranch}`,
        data: {
          repo: `${org}/${repo}`,
          required_status_checks: statusChecks?.contexts ?? [],
          strict: statusChecks?.strict ?? false,
        } as Record<string, unknown>,
        collectedAt: new Date(),
      };
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        // No branch protection rule exists
        yield {
          sourceType: SOURCE_TYPE.GITHUB,
          entityType: 'github:repo:branch_protection',
          entityId: `${org}/${repo}/${defaultBranch}`,
          data: {
            repo: `${org}/${repo}`,
            branch: defaultBranch,
            enabled: false,
          } as Record<string, unknown>,
          collectedAt: new Date(),
        };
      } else if (status === 403) {
        // Insufficient scope — yield unknown state with note
        yield {
          sourceType: SOURCE_TYPE.GITHUB,
          entityType: 'github:repo:branch_protection',
          entityId: `${org}/${repo}/${defaultBranch}`,
          data: {
            repo: `${org}/${repo}`,
            branch: defaultBranch,
            enabled: null,
            error: 'Insufficient scope to read branch protection',
          } as Record<string, unknown>,
          collectedAt: new Date(),
        };
      }
      // Other errors bubble up
    }
  }
}
