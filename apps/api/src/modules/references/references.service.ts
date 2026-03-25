import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

export const REFERENCE_RESOURCES = [
  'categories',
  'user-roles',
  'user-plans',
  'content-types',
  'content-statuses',
  'content-visibilities',
  'subscription-statuses',
  'payment-providers',
  'payment-statuses',
] as const;

export type ReferenceResource = (typeof REFERENCE_RESOURCES)[number];

@Injectable()
export class ReferencesService {
  constructor(private prisma: PrismaService) {}

  async listAll() {
    const [
      categories,
      userRoles,
      userPlans,
      contentTypes,
      contentStatuses,
      contentVisibilities,
      subscriptionStatuses,
      paymentProviders,
      paymentStatuses,
    ] = await this.prisma.$transaction([
      this.prisma.category.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.userRoleRef.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.userPlanRef.findMany({
        orderBy: { code: 'asc' },
        select: {
          code: true,
          label: true,
          priceFcfaMonthly: true,
          maxScreens: true,
          videoQuality: true,
          hasAds: true,
          maxOfflineDownloads: true,
          hasExclusiveAccess: true,
        },
      }),
      this.prisma.contentTypeRef.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.contentStatusRef.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.contentVisibilityRef.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.subscriptionStatusRef.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.paymentProviderRef.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
      this.prisma.paymentStatusRef.findMany({ orderBy: { code: 'asc' }, select: { code: true, label: true } }),
    ]);

    return {
      categories,
      userRoles,
      userPlans,
      contentTypes,
      contentStatuses,
      contentVisibilities,
      subscriptionStatuses,
      paymentProviders,
      paymentStatuses,
    };
  }

  async list(resource: ReferenceResource) {
    const repository = this.getRepository(resource);
    return repository.findMany({ orderBy: { code: 'asc' } });
  }

  async getOne(resource: ReferenceResource, id: string) {
    const repository = this.getRepository(resource);
    return repository.findUnique({ where: { id } });
  }

  async create(resource: ReferenceResource, dto: CreateReferenceDto) {
    const repository = this.getRepository(resource);
    return repository.create({ data: dto });
  }

  async update(resource: ReferenceResource, id: string, dto: UpdateReferenceDto) {
    const repository = this.getRepository(resource);
    return repository.update({ where: { id }, data: dto });
  }

  async remove(resource: ReferenceResource, id: string) {
    const repository = this.getRepository(resource);
    return repository.delete({ where: { id } });
  }

  private getRepository(resource: ReferenceResource): any {
    switch (resource) {
      case 'categories':
        return this.prisma.category;
      case 'user-roles':
        return this.prisma.userRoleRef;
      case 'user-plans':
        return this.prisma.userPlanRef;
      case 'content-types':
        return this.prisma.contentTypeRef;
      case 'content-statuses':
        return this.prisma.contentStatusRef;
      case 'content-visibilities':
        return this.prisma.contentVisibilityRef;
      case 'subscription-statuses':
        return this.prisma.subscriptionStatusRef;
      case 'payment-providers':
        return this.prisma.paymentProviderRef;
      case 'payment-statuses':
        return this.prisma.paymentStatusRef;
      default:
        throw new BadRequestException('Unknown reference resource');
    }
  }
}
