import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IPaymentProvider, InitiatePaymentResult } from './payment-provider.interface';

@Injectable()
export class OrangeMoneyProvider implements IPaymentProvider {
  readonly providerCode = 'ORANGE_MONEY';
  private readonly logger = new Logger(OrangeMoneyProvider.name);
  private readonly baseUrl: string;
  private readonly merchantKey: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('ORANGE_MONEY_API_URL') ?? 'https://api.orange.com/orange-money-webpay/ci/v1';
    this.merchantKey = config.get('ORANGE_MONEY_MERCHANT_KEY') ?? '';
  }

  async initiatePayment(params: {
    amount: number;
    currency: string;
    phoneNumber?: string;
    reference: string;
    description: string;
    callbackUrl: string;
    email?: string;
  }): Promise<InitiatePaymentResult> {
    if (!this.merchantKey) {
      this.logger.warn('ORANGE_MONEY_MERCHANT_KEY non configuré — mode simulation');
      return {
        transactionId: `OM-SIM-${Date.now()}`,
        status: 'PENDING',
        providerReference: params.reference,
      };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/webpayment`, {
        merchant_key: this.merchantKey,
        currency: params.currency,
        order_id: params.reference,
        amount: params.amount,
        return_url: params.callbackUrl,
        cancel_url: params.callbackUrl,
        notif_url: params.callbackUrl,
        lang: 'fr',
        reference: params.description,
      });
      return {
        transactionId: response.data.pay_token ?? response.data.transaction_id,
        status: 'PENDING',
        providerReference: response.data.notif_token ?? params.reference,
        redirectUrl: response.data.payment_url,
      };
    } catch (err: any) {
      this.logger.error('Orange Money initiate error', err?.response?.data ?? err.message);
      return {
        transactionId: '',
        status: 'FAILED',
        providerReference: params.reference,
        message: err?.response?.data?.message ?? err.message,
      };
    }
  }

  async verifyPayment(transactionId: string): Promise<{ status: 'PENDING' | 'COMPLETED' | 'FAILED'; amount?: number }> {
    if (!this.merchantKey) return { status: 'PENDING' };
    try {
      const response = await axios.get(`${this.baseUrl}/webpayment/${transactionId}`, {
        headers: { Authorization: `Bearer ${this.merchantKey}` },
      });
      const status =
        response.data.status === 'SUCCESS'
          ? 'COMPLETED'
          : response.data.status === 'FAILED'
          ? 'FAILED'
          : 'PENDING';
      return { status, amount: response.data.amount };
    } catch {
      return { status: 'PENDING' };
    }
  }
}
