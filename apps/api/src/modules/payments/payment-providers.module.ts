import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaystackProvider } from './providers/paystack.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';

/** Providers de paiement (Paystack uniquement). */
@Module({
  imports: [ConfigModule],
  providers: [PaystackProvider, PaymentProviderFactory],
  exports: [PaymentProviderFactory, PaystackProvider],
})
export class PaymentProvidersModule {}
