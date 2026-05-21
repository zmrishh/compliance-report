import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy.js';
import { AuthGuard } from './auth.guard.js';
import type { Env } from '../config/config.schema.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (_config: ConfigService<Env, true>) => ({
        // WorkOS JWTs are verified against WorkOS JWKS — we do not need a local secret.
        // The JwtStrategy handles fetching the JWKS from WorkOS.
        // JwtModule is imported here for the APP_GUARD and to provide JwtService if needed.
      }),
    }),
  ],
  providers: [JwtStrategy, AuthGuard],
  exports: [AuthGuard, JwtStrategy],
})
export class AuthModule {}
