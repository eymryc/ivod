import { BadRequestException, Injectable } from '@nestjs/common';
import { PaystackProvider } from './paystack.provider';
import { IPaymentProvider } from './payment-provider.interface';

@Injectable()
export class PaymentProviderFactory {
  constructor(private paystack: PaystackProvider) {}

  getProvider(providerCode: string): IPaymentProvider {
    if (providerCode.toUpperCase() !== 'PAYSTACK') {
      throw new BadRequestException({
        code: 'PAYMENT_010',
        message: `Fournisseur non supporté: ${providerCode}. Utilisez PAYSTACK.`,
      });
    }
    return this.paystack;
  }

  getPaystack(): PaystackProvider {
    return this.paystack;
  }
}
