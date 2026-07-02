import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  private async resolveStatusId(code: string): Promise<string> {
    const ref = await this.prisma.refInvoiceStatus.findUniqueOrThrow({ where: { code }, select: { id: true } });
    return ref.id;
  }

  async list(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where: { userId },
        include: { status: { select: { code: true, label: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      this.prisma.invoice.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }

  async getOne(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: { status: { select: { code: true, label: true } } },
    });
    if (!invoice) throw new NotFoundException({ code: 'INVOICE_001', message: 'Facture introuvable' });
    return invoice;
  }

  async generate(userId: string, paymentId: string): Promise<any> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
      include: { userSubscription: { include: { plan: { select: { label: true } } } }, provider: { select: { label: true } } },
    });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_001', message: 'Paiement introuvable' });

    const existing = await this.prisma.invoice.findFirst({
      where: { paymentId },
      include: { status: { select: { code: true, label: true } } },
    });
    if (existing) return existing;

    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({ where: { createdAt: { gte: new Date(`${year}-01-01`) } } });
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;
    const statusId = await this.resolveStatusId('ISSUED');

    return this.prisma.invoice.create({
      data: {
        userId,
        paymentId,
        invoiceNumber,
        subtotal: payment.amount,
        taxes: 0,
        total: payment.amount,
        currency: payment.currency,
        statusId,
      },
      include: { status: { select: { code: true, label: true } } },
    });
  }
}
