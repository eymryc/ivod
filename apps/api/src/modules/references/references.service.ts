import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

export const REFERENCE_RESOURCES = [
  'genres', 'user-roles', 'user-plans', 'content-types', 'content-statuses',
  'content-visibilities', 'maturity-ratings', 'subscription-statuses',
  'payment-providers', 'payment-statuses', 'rightsholder-types',
  'monetization-types', 'territory-codes', 'crew-roles', 'award-types',
  'languages', 'countries', 'currencies',
] as const;

export type ReferenceResource = (typeof REFERENCE_RESOURCES)[number];

@Injectable()
export class ReferencesService {
  constructor(private prisma: PrismaService) {}

  async listAll() {
    const [
      genres, userRoles, userPlans, contentTypes, contentStatuses,
      contentVisibilities, maturityRatings, subscriptionStatuses,
      paymentProviders, paymentStatuses, rightsholderTypes, monetizationTypes,
      territoryCodes, crewRoles, awardTypes, languages, countries,
    ] = await this.prisma.$transaction([
      this.prisma.refGenre.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true, slug: true } }),
      this.prisma.refUserRole.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.refUserPlan.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true, priceFcfaMonthly: true, maxScreens: true, videoQuality: true, hasAds: true } }),
      this.prisma.refContentType.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true, typeCode: true } }),
      this.prisma.refContentStatus.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.refContentVisibility.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.refMaturityRating.findMany({ orderBy: { order: 'asc' }, select: { code: true, label: true, order: true } }),
      this.prisma.refSubscriptionStatus.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.refPaymentProvider.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.refPaymentStatus.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.refRightsholderType.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, label: true } }),
      this.prisma.refMonetizationType.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, label: true } }),
      this.prisma.refTerritoryCode.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, label: true } }),
      this.prisma.refCrewRole.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, label: true } }),
      this.prisma.refAwardType.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, label: true } }),
      this.prisma.refLanguage.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.refCountry.findMany({ where: { isActive: true }, orderBy: { label: 'asc' }, select: { isoCode: true, label: true, region: true } }),
    ]);

    return {
      genres, userRoles, userPlans, contentTypes, contentStatuses, contentVisibilities, maturityRatings,
      subscriptionStatuses, paymentProviders, paymentStatuses, rightsholderTypes, monetizationTypes,
      territoryCodes, crewRoles, awardTypes, languages, countries,
    };
  }

  async list(resource: ReferenceResource) {
    const select = { id: true, code: true, label: true };
    if (
      resource === 'award-types' ||
      resource === 'crew-roles' ||
      resource === 'rightsholder-types' ||
      resource === 'monetization-types' ||
      resource === 'territory-codes'
    ) {
      return this.getRepository(resource).findMany({ orderBy: { code: 'asc' }, select });
    }
    return this.getRepository(resource).findMany({ orderBy: { code: 'asc' } });
  }

  async getOne(resource: ReferenceResource, id: string) {
    return this.getRepository(resource).findUnique({ where: { id } });
  }

  async create(resource: ReferenceResource, dto: CreateReferenceDto) {
    const row = await this.getRepository(resource).create({ data: dto });
    return { ...row, message: 'Référence créée' };
  }

  async update(resource: ReferenceResource, id: string, dto: UpdateReferenceDto) {
    const row = await this.getRepository(resource).update({ where: { id }, data: dto });
    return { ...row, message: 'Référence mise à jour' };
  }

  async remove(resource: ReferenceResource, id: string) {
    try {
      await this.getRepository(resource).delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        const hint =
          resource === 'award-types'
            ? 'Ce type est utilisé par au moins une distinction.'
            : resource === 'crew-roles'
              ? 'Ce rôle est utilisé par au moins un membre d\'équipe.'
              : 'Cette entrée est encore référencée ailleurs.';
        throw new ConflictException({ code: 'REF_IN_USE', message: hint });
      }
      throw err;
    }
    return { message: 'Référence supprimée' };
  }

  private getRepository(resource: ReferenceResource): any {
    const map: Record<ReferenceResource, any> = {
      'genres': this.prisma.refGenre,
      'user-roles': this.prisma.refUserRole,
      'user-plans': this.prisma.refUserPlan,
      'content-types': this.prisma.refContentType,
      'content-statuses': this.prisma.refContentStatus,
      'content-visibilities': this.prisma.refContentVisibility,
      'maturity-ratings': this.prisma.refMaturityRating,
      'subscription-statuses': this.prisma.refSubscriptionStatus,
      'payment-providers': this.prisma.refPaymentProvider,
      'payment-statuses': this.prisma.refPaymentStatus,
      'rightsholder-types': this.prisma.refRightsholderType,
      'monetization-types': this.prisma.refMonetizationType,
      'territory-codes': this.prisma.refTerritoryCode,
      'crew-roles': this.prisma.refCrewRole,
      'award-types': this.prisma.refAwardType,
      'languages': this.prisma.refLanguage,
      'countries': this.prisma.refCountry,
      'currencies': this.prisma.refCurrency,
    };
    const repo = map[resource];
    if (!repo) throw new BadRequestException(`Référentiel inconnu: ${resource}`);
    return repo;
  }
}
