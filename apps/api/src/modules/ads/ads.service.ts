import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) {}

  // Obtenir une publicité pour un utilisateur FREE
  async getAdForViewer(userId: string): Promise<any | null> {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, status: { code: 'ACTIVE' }, plan: { code: { not: 'FREE' } } },
    });
    if (sub) return null; // Abonné payant → pas de pub

    const now = new Date();
    const campaigns = await this.prisma.adCampaign.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      include: { ad: true },
      take: 5,
    });
    const activeCampaigns = campaigns.filter((c) => c.ad?.isActive);
    if (!activeCampaigns.length) return null;

    const random = activeCampaigns[Math.floor(Math.random() * activeCampaigns.length)];
    const ad = random.ad as any;
    return ad ? { adId: ad.id, videoObjectKey: ad.videoObjectKey, durationSec: ad.durationSec, clickUrl: ad.clickUrl } : null;
  }

  // Enregistrer une impression
  async recordImpression(userId: string, adId: string, clicked = false) {
    const profileId = await this.prisma.profile.findFirst({ where: { userId, isDefault: true }, select: { id: true } }).then(p => p?.id);
    if (!profileId) return;
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) throw new NotFoundException({ code: 'AD_001', message: 'Publicité introuvable' });
    await this.prisma.adImpression.create({ data: { adId, profileId, clicked } });
  }

  // Admin : CRUD
  async createAd(dto: any) { return this.prisma.ad.create({ data: dto }); }
  async listAds(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ad.findMany({ include: { adCampaigns: true }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.ad.count(),
    ]);
    return { items, total, page, limit };
  }

  async createCampaign(adId: string, name: string, startsAt: string, endsAt: string, budget?: number) {
    if (!await this.prisma.ad.findUnique({ where: { id: adId } })) throw new NotFoundException({ code: 'AD_001', message: 'Publicité introuvable' });
    return this.prisma.adCampaign.create({ data: { adId, name, startsAt: new Date(startsAt), endsAt: new Date(endsAt), budget } });
  }

  async stats(adId: string) {
    const [total, clicks] = await Promise.all([
      this.prisma.adImpression.count({ where: { adId } }),
      this.prisma.adImpression.count({ where: { adId, clicked: true } }),
    ]);
    return { adId, impressions: total, clicks, ctr: total > 0 ? Math.round((clicks / total) * 1000) / 10 : 0 };
  }
}
