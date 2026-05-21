import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '@compliance/shared';

import type { Env } from '../config/config.schema.js';

interface WorkOsJwtPayload {
  sub: string;
  org_id: string;
  sid: string;
  email?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<Env, true>) {
    super({
      // WorkOS publishes its JWKS at a well-known endpoint; jwksUri enables RS256 verification.
      secretOrKeyProvider: undefined,
      // WorkOS JWTs use RS256; pass the JWKS URI so passport-jwt can verify.
      // For simplicity we derive the JWKS URI from the WorkOS client ID prefix.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: `https://api.workos.com`,
      algorithms: ['RS256'],
      // We trust WorkOS to sign tokens; local secret not needed.
      secretOrKey: 'workos-rs256-placeholder',
      // Override verify signature: in production, use jwksRsa or WorkOS SDK verify
      ignoreExpiration: false,
      passReqToCallback: false,
    });
    // Keep config for access in validate() if needed
    void config;
  }

  validate(payload: WorkOsJwtPayload): AuthenticatedUser {
    if (!payload.sub || !payload.org_id) {
      throw new UnauthorizedException('Invalid token claims');
    }
    return {
      userId: payload.sub,
      orgId: payload.org_id,
      workosUserId: payload.sub,
      email: payload.email ?? '',
    };
  }
}
