import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { notificationPreferences } from '@compliance/db';
import type { DbClient } from '@compliance/db';
import { NOTIFICATION_EVENT, type NotificationEvent } from '@compliance/shared';

import { DB_CLIENT } from '../database/database.module.js';
import { ResendService } from './resend.service.js';
import {
  accessReviewAssignedTemplate,
  accessReviewDueTemplate,
  connectorFailureTemplate,
  controlRegressionTemplate,
} from './email-templates.js';

interface ControlRegressionPayload {
  event: typeof NOTIFICATION_EVENT.CONTROL_REGRESSION;
  to: string;
  userId: string;
  orgId: string;
  controlTitle: string;
  controlId: string;
  workspaceName: string;
  workspaceUrl: string;
}

interface ConnectorFailedPayload {
  event: typeof NOTIFICATION_EVENT.CONNECTOR_FAILED;
  to: string;
  userId: string;
  orgId: string;
  connectorType: string;
  workspaceName: string;
  errorMessage: string;
  workspaceUrl: string;
}

interface AccessReviewAssignedPayload {
  event: typeof NOTIFICATION_EVENT.ACCESS_REVIEW_ASSIGNED;
  to: string;
  userId: string;
  orgId: string;
  campaignName: string;
  workspaceName: string;
  dueDate: string;
  campaignUrl: string;
}

interface AccessReviewDuePayload {
  event: typeof NOTIFICATION_EVENT.ACCESS_REVIEW_DUE;
  to: string;
  userId: string;
  orgId: string;
  campaignName: string;
  workspaceName: string;
  dueDate: string;
  pendingCount: number;
  campaignUrl: string;
}

export type NotificationPayload =
  | ControlRegressionPayload
  | ConnectorFailedPayload
  | AccessReviewAssignedPayload
  | AccessReviewDuePayload;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly db: DbClient,
    private readonly resendService: ResendService,
  ) {}

  async notify(payload: NotificationPayload): Promise<void> {
    const isEnabled = await this.isEnabled(payload.userId, payload.orgId, payload.event);
    if (!isEnabled) return;

    let subject: string;
    let html: string;

    switch (payload.event) {
      case NOTIFICATION_EVENT.CONTROL_REGRESSION:
        ({ subject, html } = controlRegressionTemplate({
          controlTitle: payload.controlTitle,
          controlId: payload.controlId,
          workspaceName: payload.workspaceName,
          workspaceUrl: payload.workspaceUrl,
        }));
        break;
      case NOTIFICATION_EVENT.CONNECTOR_FAILED:
        ({ subject, html } = connectorFailureTemplate({
          connectorType: payload.connectorType,
          workspaceName: payload.workspaceName,
          errorMessage: payload.errorMessage,
          workspaceUrl: payload.workspaceUrl,
        }));
        break;
      case NOTIFICATION_EVENT.ACCESS_REVIEW_ASSIGNED:
        ({ subject, html } = accessReviewAssignedTemplate({
          campaignName: payload.campaignName,
          workspaceName: payload.workspaceName,
          dueDate: payload.dueDate,
          campaignUrl: payload.campaignUrl,
        }));
        break;
      case NOTIFICATION_EVENT.ACCESS_REVIEW_DUE:
        ({ subject, html } = accessReviewDueTemplate({
          campaignName: payload.campaignName,
          workspaceName: payload.workspaceName,
          dueDate: payload.dueDate,
          pendingCount: payload.pendingCount,
          campaignUrl: payload.campaignUrl,
        }));
        break;
      default:
        this.logger.warn(`Unhandled notification event: ${(payload as NotificationPayload).event}`);
        return;
    }

    await this.resendService.sendEmail(payload.to, subject, html);
  }

  async getPreferences(userId: string, orgId: string) {
    const existing = await this.db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.orgId, orgId),
        ),
      );

    // Return defaults for all events, merging with stored preferences
    const prefsMap = new Map(existing.map((p) => [p.eventType, p.enabled]));

    return Object.values(NOTIFICATION_EVENT).map((eventType) => ({
      eventType,
      enabled: prefsMap.get(eventType) ?? true,
    }));
  }

  async updatePreferences(
    userId: string,
    orgId: string,
    prefs: Array<{ eventType: string; enabled: boolean }>,
  ) {
    for (const pref of prefs) {
      const [existing] = await this.db
        .select({ id: notificationPreferences.id })
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.userId, userId),
            eq(notificationPreferences.orgId, orgId),
            eq(notificationPreferences.eventType, pref.eventType),
          ),
        )
        .limit(1);

      if (existing) {
        await this.db
          .update(notificationPreferences)
          .set({ enabled: pref.enabled, updatedAt: new Date() })
          .where(eq(notificationPreferences.id, existing.id));
      } else {
        await this.db.insert(notificationPreferences).values({
          userId,
          orgId,
          eventType: pref.eventType,
          enabled: pref.enabled,
        });
      }
    }

    return this.getPreferences(userId, orgId);
  }

  private async isEnabled(userId: string, orgId: string, eventType: NotificationEvent): Promise<boolean> {
    const [pref] = await this.db
      .select({ enabled: notificationPreferences.enabled })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.orgId, orgId),
          eq(notificationPreferences.eventType, eventType),
        ),
      )
      .limit(1);

    // Default to enabled if no explicit preference stored
    return pref?.enabled ?? true;
  }
}
