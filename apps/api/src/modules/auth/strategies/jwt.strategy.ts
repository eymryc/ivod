import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions?: string[];
  mustChangePassword?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    const cacheKey = `rbac:user:${payload.sub}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    // `select` explicite plutôt que `include` (qui aurait renvoyé TOUTE la
    // ligne User, y compris passwordHash/passwordSetupTokenSha256) — ce
    // résultat devient req.user ET reste en cache Redis 60s ; il ne doit
    // jamais transporter de secrets.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        avatarUrl: true,
        isActive: true,
        mustChangePassword: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: { select: { code: true } },
                  },
                },
              },
            },
          },
        },
        userPermissions: { include: { permission: { select: { code: true } } } },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException({ code: 'AUTH_001', message: 'Token invalide' });
    }
    const roleCodes = user.userRoles.map((userRole) => userRole.role.code);
    const rolePermissions = user.userRoles.flatMap((userRole) =>
      userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.code),
    );
    const directPermissions = user.userPermissions.map(
      (userPermission) => userPermission.permission.code,
    );
    const permissions = [...new Set([...rolePermissions, ...directPermissions])];

    const result = {
      ...user,
      role: roleCodes[0] ?? payload.role,
      roles: roleCodes,
      permissions,
    };
    await this.redis.set(cacheKey, result, 60); // 60s TTL — invalidé via redis.del au changement de rôle
    return result;
  }
}
