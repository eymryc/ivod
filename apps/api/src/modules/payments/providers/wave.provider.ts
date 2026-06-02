import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IPaymentProvider, InitiatePaymentResult } from './payment-provider.interface';

@Injectable()
export class WaveProvider implements IPaymentProvider {
  readonly providerCode = 'WAVE';
  private readonly logger = new Logger(WaveProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('WAVE_API_URL') ?? 'https://api.wave.com/v1';
    this.apiKey = config.get('WAVE_API_KEY') ?? '';
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
    if (!this.apiKey) {
      this.logger.warn('WAVE_API_KEY non configuré — mode simulation');
      return {
        transactionId: `WAVE-SIM-${Date.now()}`,
        status: 'PENDING',
        providerReference: params.reference,
        redirectUrl: 'https://pay.wave.com/sim',
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/checkout/sessions`,
        {
          amount: String(params.amount),
          currency: params.currency,
          client_reference: params.reference,
          success_url: params.callbackUrl,
          error_url: params.callbackUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return {
        transactionId: response.data.id ?? response.data.transaction_id,
        status: 'PENDING',
        providerReference: response.data.client_reference ?? params.reference,
        redirectUrl: response.data.wave_launch_url ?? response.data.checkout_url,
      };
    } catch (err: any) {
      this.logger.error('Wave initiate error', err?.response?.data ?? err.message);
      return {
        transactionId: '',
        status: 'FAILED',
        providerReference: params.reference,
        message: err?.response?.data?.message ?? err.message,
      };
    }
  }

  async verifyPayment(transactionId: string): Promise<{ status: 'PENDING' | 'COMPLETED' | 'FAILED'; amount?: number }> {
    if (!this.apiKey) return { status: 'PENDING' };
    try {
      const response = await axios.get(`${this.baseUrl}/checkout/sessions/${transactionId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      const paymentStatus = response.data.payment_status ?? response.data.status;
      const status =
        paymentStatus === 'succeeded' || paymentStatus === 'COMPLETED'
          ? 'COMPLETED'
          : paymentStatus === 'failed' || paymentStatus === 'FAILED'
          ? 'FAILED'
          : 'PENDING';
      return { status, amount: response.data.amount ? Number(response.data.amount) : undefined };
    } catch {
      return { status: 'PENDING' };
    }
  }
}
