import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';

import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthGuard } from './auth/auth.guard.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';
import { AuditModule } from './audit/audit.module.js';
import { EvidenceModule } from './evidence/evidence.module.js';
import { SecretsModule } from './secrets/secrets.module.js';
import { ConnectorConfigsModule } from './connector-configs/connector-configs.module.js';
import { NormalizerModule } from './normalizer/normalizer.module.js';
import { RulesModule } from './rules/rules.module.js';
import { ReadinessModule } from './readiness/readiness.module.js';
import { ConnectorSyncModule } from './connector-sync/connector-sync.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    SecretsModule,
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    HealthModule,
    AuthModule,
    OrganizationsModule,
    WorkspacesModule,
    AuditModule,
    EvidenceModule,
    ConnectorConfigsModule,
    NormalizerModule,
    RulesModule,
    ReadinessModule,
    ConnectorSyncModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
