import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  InitializePaymentData,
  PaymentResponse,
} from './payment-provider.interface';

@Injectable()
export class PaystackProvider implements PaymentProvider {
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    private http: HttpService,
    @InjectPinoLogger(PaystackProvider.name)
    private readonly logger: PinoLogger,
  ) {}

  private get headers() {
    return {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async initializePayment(data: InitializePaymentData): Promise<PaymentResponse> {
    this.logger.info({ reference: data.reference }, 'Initializing Paystack payment');

    const response = await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email: data.email,
          amount: data.amount * 100,
          currency: data.currency,
          reference: data.reference,
          metadata: { description: data.description },
        },
        { headers: this.headers },
      ),
    );

    return {
      provider: 'paystack',
      reference: data.reference,
      paymentUrl: response.data.data.authorization_url,
      status: 'pending',
      raw: response.data,
    };
  }

  async verifyPayment(reference: string): Promise<any> {
    this.logger.info({ reference }, 'Verifying Paystack payment');

    const response = await firstValueFrom(
      this.http.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        { headers: this.headers },
      ),
    );

    return {
      provider: 'paystack',
      reference,
      status: response.data.data.status,
      amount: response.data.data.amount / 100,
      currency: response.data.data.currency,
      raw: response.data,
    };
  }

  verifyWebhookSignature(signature: string, payload: any): boolean {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }
}