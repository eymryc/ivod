import { BadRequestException, Injectable } from '@nestjs/common';
import { OrangeMoneyProvider } from './orange-money.provider';
import { WaveProvider } from './wave.provider';
import { PaystackProvider } from './paystack.provider';
import { IPaymentProvider } from './payment-provider.interface';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private paystack: PaystackProvider,
    private orange: OrangeMoneyProvider,
    private wave: WaveProvider,
  ) {}

  getProvider(providerCode: string): IPaymentProvider {
    switch (providerCode.toUpperCase()) {
      case 'PAYSTACK':
        return this.paystack;
      case 'ORANGE_MONEY':
        return this.orange;
      case 'WAVE':
        return this.wave;
      default:
        throw new BadRequestException({
          code: 'PAYMENT_010',
          message: `Fournisseur inconnu: ${providerCode}`,
        });
    }
  }

  getPaystack(): PaystackProvider {
    return this.paystack;
  }
}
