export type GitHubAuthType = 'github_app' | 'pat';

export interface GitHubAppCredentials {
  type: 'github_app';
  appId: number;
  privateKey: string;
  installationId: number;
}

export interface GitHubPatCredentials {
  type: 'pat';
  token: string;
}

export type GitHubCredentials = GitHubAppCredentials | GitHubPatCredentials;

export interface GitHubConfig {
  orgLogin: string;
}
