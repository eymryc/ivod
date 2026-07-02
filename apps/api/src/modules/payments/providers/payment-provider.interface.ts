export interface InitiatePaymentResult {
  transactionId: string;
  status: 'PENDING' | 'FAILED';
  providerReference: string;
  redirectUrl?: string;
  message?: string;
}

export interface InitiatePaymentParams {
  amount: number;
  currency: string;
  reference: string;
  description: string;
  callbackUrl: string;
  phoneNumber?: string;
  email?: string;
  customerName?: string;
}

export interface IPaymentProvider {
  readonly providerCode: string;
  initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  verifyPayment(transactionId: string): Promise<{
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    amount?: number;
  }>;
}
