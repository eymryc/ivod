import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentProvider,
  InitiatePaymentParams,
  InitiatePaymentResult,
} from './payment-provider.interface';

const PAYSTACK_API = 'https://api.paystack.co';

/** Paystack : montant API = FCFA × 100 (ex. 1 500 FCFA → 150 000). */
const PAYSTACK_SUBUNIT = 100;

export function toPaystackAmount(amountFcfa: number): number {
  return Math.round(amountFcfa * PAYSTACK_SUBUNIT);
}

export function fromPaystackAmount(paystackAmount: number): number {
  return Math.round(paystackAmount / PAYSTACK_SUBUNIT);
}

/** Rejette les placeholders du type sk_test_... ou sk_test_xxxxxxxx */
export function isValidPaystackSecretKey(key: string | undefined | null): boolean {
  const k = key?.trim() ?? '';
  if (!k) return false;
  if (k.includes('...') || /x{4,}/i.test(k)) return false;
  return /^sk_(test|live)_[A-Za-z0-9]+$/.test(k) && k.length >= 40;
}

@Injectable()
export class PaystackProvider implements IPaymentProvider {
  readonly providerCode = 'PAYSTACK';
  private readonly logger = new Logger(PaystackProvider.name);
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor(private config: ConfigService) {
    this.secretKey = config.get<string>('PAYSTACK_SECRET_KEY') ?? '';
    this.publicKey = config.get<string>('PAYSTACK_PUBLIC_KEY') ?? '';
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    if (!params.email) {
      return {
        transactionId: '',
        status: 'FAILED',
        providerReference: params.reference,
        message: 'Email requis pour Paystack',
      };
    }

    if (!this.secretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY non configuré — mode simulation');
      const front = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
      const base = params.callbackUrl?.trim();
      const simCallback = base
        ? base.includes('sim=')
          ? base
          : `${base}${base.includes('?') ? '&' : '?'}sim=1`
        : `${front}/payment/callback?reference=${params.reference}&sim=1`;
      return {
        transactionId: `PSK-SIM-${Date.now()}`,
        status: 'PENDING',
        providerReference: params.reference,
        redirectUrl: simCallback,
        message: 'Mode simulation Paystack',
      };
    }

    if (!isValidPaystackSecretKey(this.secretKey)) {
      return {
        transactionId: '',
        status: 'FAILED',
        providerReference: params.reference,
        message:
          'Clé secrète Paystack invalide : remplacez PAYSTACK_SECRET_KEY par la Secret Key complète (dashboard Paystack → Settings → API Keys), pas un placeholder sk_test_...',
      };
    }

    const currency = params.currency || 'XOF';
    try {
      const response = await axios.post(
        `${PAYSTACK_API}/transaction/initialize`,
        {
          email: params.email,
          amount: toPaystackAmount(params.amount),
          currency,
          reference: params.reference,
          callback_url: params.callbackUrl,
          metadata: {
            custom_fields: [
              { display_name: 'Description', variable_name: 'description', value: params.description },
            ],
          },
          channels: ['card', 'mobile_money', 'bank_transfer', 'ussd'],
        },
        { headers: this.headers() },
      );

      const data = response.data?.data;
      if (!response.data?.status || !data?.authorization_url) {
        return {
          transactionId: '',
          status: 'FAILED',
          providerReference: params.reference,
          message: response.data?.message ?? 'Initialisation Paystack échouée',
        };
      }

      return {
        transactionId: data.reference ?? params.reference,
        status: 'PENDING',
        providerReference: data.reference ?? params.reference,
        redirectUrl: data.authorization_url,
        message: 'Redirection vers Paystack',
      };
    } catch (err: any) {
      const body = err?.response?.data;
      this.logger.error('Paystack initiate error', body ?? err.message);
      const code = body?.code as string | undefined;
      const gatewayMessage = body?.message as string | undefined;
      let message = gatewayMessage ?? err.message;
      if (code === 'invalid_Key' || gatewayMessage === 'Invalid key') {
        message =
          'Clé secrète Paystack refusée par Paystack : vérifiez PAYSTACK_SECRET_KEY dans apps/api/.env (paire test sk_test_… + pk_test_… du même compte).';
      }
      return {
        transactionId: '',
        status: 'FAILED',
        providerReference: params.reference,
        message,
      };
    }
  }

  async verifyPayment(reference: string): Promise<{
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    amount?: number;
  }> {
    if (!this.secretKey) {
      return { status: 'PENDING' };
    }

    try {
      const response = await axios.get(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: this.headers(),
      });
      const data = response.data?.data;
      const gatewayStatus = data?.status;

      if (gatewayStatus === 'success') {
        return {
          status: 'COMPLETED',
          amount: data?.amount != null ? fromPaystackAmount(Number(data.amount)) : undefined,
        };
      }
      // `abandoned` = transaction non finalisée — ne pas marquer FAILED tant que le client
      // peut encore être sur le checkout Paystack (sync prématuré côté mobile).
      if (gatewayStatus === 'failed' || gatewayStatus === 'reversed') {
        return { status: 'FAILED' };
      }
      return { status: 'PENDING' };
    } catch (err: any) {
      this.logger.warn('Paystack verify error', err?.response?.data ?? err.message);
      return { status: 'PENDING' };
    }
  }

  isConfigured(): boolean {
    return isValidPaystackSecretKey(this.secretKey);
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  /** Remboursement total ou partiel — https://paystack.com/docs/api/refund/ */
  async createRefund(params: {
    transaction: string;
    amount?: number;
    currency?: string;
    customerNote?: string;
    merchantNote?: string;
  }): Promise<{ id: string; status: string; message?: string }> {
    if (!this.secretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY absent — remboursement simulé');
      return {
        id: `PSK-REF-SIM-${Date.now()}`,
        status: 'processed',
        message: 'Simulation remboursement',
      };
    }

    try {
      const response = await axios.post(
        `${PAYSTACK_API}/refund`,
        {
          transaction: params.transaction,
          ...(params.amount != null ? { amount: toPaystackAmount(params.amount) } : {}),
          ...(params.currency ? { currency: params.currency } : {}),
          ...(params.customerNote ? { customer_note: params.customerNote } : {}),
          ...(params.merchantNote ? { merchant_note: params.merchantNote } : {}),
        },
        { headers: this.headers() },
      );

      if (!response.data?.status) {
        return {
          id: '',
          status: 'failed',
          message: response.data?.message ?? 'Remboursement Paystack refusé',
        };
      }

      const data = response.data.data;
      return {
        id: String(data?.id ?? data?.transaction?.id ?? ''),
        status: data?.status ?? 'pending',
        message: response.data.message,
      };
    } catch (err: any) {
      this.logger.error('Paystack refund error', err?.response?.data ?? err.message);
      return {
        id: '',
        status: 'failed',
        message: err?.response?.data?.message ?? err.message,
      };
    }
  }
}
