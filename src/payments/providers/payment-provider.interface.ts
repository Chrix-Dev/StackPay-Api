export interface InitializePaymentData {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  description?: string;
}

export interface PaymentResponse {
  provider: string;
  reference: string;
  paymentUrl: string;
  status: string;
  raw: any;
}

export interface PaymentProvider {
  initializePayment(data: InitializePaymentData): Promise<PaymentResponse>;
  verifyPayment(reference: string): Promise<any>;
  verifyWebhookSignature(signature: string, payload: any): boolean;
}