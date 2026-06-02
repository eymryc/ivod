import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { WaveProvider } from './providers/wave.provider';
import { PaystackProvider } from './providers/paystack.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';

/** Providers de paiement (sans RefundsModule — évite la dépendance circulaire). */
@Module({
  imports: [ConfigModule],
  providers: [PaystackProvider, OrangeMoneyProvider, WaveProvider, PaymentProviderFactory],
  exports: [PaymentProviderFactory, PaystackProvider],
})
export class PaymentProvidersModule {}
