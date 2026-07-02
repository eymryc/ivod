import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MATURITY_ORDER: Record<string, number> = {
  ALL: 0,
  '-12': 1,
  '-16': 2,
  '-18': 3,
};

export interface UpsertParentalControlDto {
  maxMaturityRatingCode?: string;
  blockedGenreCodes?: string[];
  restrictedHoursStart?: number | null;
  restrictedHoursEnd?: number | null;
  requirePin?: boolean;
}

@Injectable()
export class ParentalControlsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveMaturityRatingId(code: string): Promise<string | null> {
    const ref = await this.prisma.refMaturityRating.findUnique({ where: { code }, select: { id: true } });
    return ref?.id ?? null;
  }

  async get(profileId: string) {
    return this.prisma.parentalControl.findUnique({
      where: { profileId },
      include: { maxMaturityRating: { select: { code: true, label: true } } },
    });
  }

  async upsert(profileId: string, dto: UpsertParentalControlDto) {
    const maxMaturityRatingId = dto.maxMaturityRatingCode
      ? await this.resolveMaturityRatingId(dto.maxMaturityRatingCode)
      : await this.resolveMaturityRatingId('ALL');

    return this.prisma.parentalControl.upsert({
      where: { profileId },
      create: {
        profileId,
        maxMaturityRatingId,
        blockedGenreCodes: dto.blockedGenreCodes ?? [],
        restrictedHoursStart: dto.restrictedHoursStart ?? null,
        restrictedHoursEnd: dto.restrictedHoursEnd ?? null,
        requirePin: dto.requirePin ?? false,
      },
      update: {
        ...(dto.maxMaturityRatingCode !== undefined && { maxMaturityRatingId: await this.resolveMaturityRatingId(dto.maxMaturityRatingCode) }),
        ...(dto.blockedGenreCodes !== undefined && { blockedGenreCodes: dto.blockedGenreCodes }),
        ...(dto.restrictedHoursStart !== undefined && { restrictedHoursStart: dto.restrictedHoursStart }),
        ...(dto.restrictedHoursEnd !== undefined && { restrictedHoursEnd: dto.restrictedHoursEnd }),
        ...(dto.requirePin !== undefined && { requirePin: dto.requirePin }),
      },
      include: { maxMaturityRating: { select: { code: true, label: true } } },
    });
  }

  async delete(profileId: string) {
    await this.prisma.parentalControl.deleteMany({ where: { profileId } });
    return { message: 'Contrôles parentaux supprimés' };
  }

  async checkAccess(
    profileId: string,
    maturityCode: string,
    genreCodes: string[],
  ): Promise<{ allowed: boolean; reason?: string }> {
    const control = await this.prisma.parentalControl.findUnique({
      where: { profileId },
      include: { maxMaturityRating: { select: { code: true } } },
    });
    if (!control) return { allowed: true };

    const { restrictedHoursStart, restrictedHoursEnd, blockedGenreCodes } = control;
    const maxMaturityRatingCode = control.maxMaturityRating?.code ?? 'ALL';

    if (restrictedHoursStart !== null && restrictedHoursEnd !== null) {
      const currentHour = new Date().getHours();
      const inRestrictedWindow =
        restrictedHoursStart <= restrictedHoursEnd
          ? currentHour >= restrictedHoursStart && currentHour < restrictedHoursEnd
          : currentHour >= restrictedHoursStart || currentHour < restrictedHoursEnd;

      if (inRestrictedWindow) {
        return { allowed: false, reason: 'RESTRICTED_HOURS' };
      }
    }

    const allowedLevel = MATURITY_ORDER[maxMaturityRatingCode] ?? 0;
    const contentLevel = MATURITY_ORDER[maturityCode] ?? 0;
    if (contentLevel > allowedLevel) {
      return { allowed: false, reason: 'MATURITY_RESTRICTED' };
    }

    const hasBlockedGenre = genreCodes.some((code) => blockedGenreCodes.includes(code));
    if (hasBlockedGenre) {
      return { allowed: false, reason: 'BLOCKED_GENRE' };
    }

    return { allowed: true };
  }
}
