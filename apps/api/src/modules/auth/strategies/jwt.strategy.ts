import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  plan: string;
  permissions?: string[];
  mustChangePassword?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
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

    return {
      ...user,
      role: roleCodes[0] ?? payload.role ?? user.role,
      roles: roleCodes,
      permissions,
    };
  }
}
