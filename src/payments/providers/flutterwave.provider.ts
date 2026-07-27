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
export class FlutterwaveProvider implements PaymentProvider {
  private readonly baseUrl = 'https://api.flutterwave.com/v3';

  constructor(
    private http: HttpService,
    @InjectPinoLogger(FlutterwaveProvider.name)
    private readonly logger: PinoLogger,
  ) {}

  private get headers() {
    return {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async initializePayment(data: InitializePaymentData): Promise<PaymentResponse> {
    this.logger.info({ reference: data.reference }, 'Initializing Flutterwave payment');

    const response = await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/payments`,
        {
          tx_ref: data.reference,
          amount: data.amount,
          currency: data.currency,
          redirect_url: 'https://stackpay-api.onrender.com/api/v1/payments/callback',
          customer: {
            email: data.email,
          },
          meta: {
            description: data.description,
          },
        },
        { headers: this.headers },
      ),
    );

    return {
      provider: 'flutterwave',
      reference: data.reference,
      paymentUrl: response.data.data.link,
      status: 'pending',
      raw: response.data,
    };
  }

  async verifyPayment(reference: string): Promise<any> {
    this.logger.info({ reference }, 'Verifying Flutterwave payment');

    const response = await firstValueFrom(
      this.http.get(
        `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${reference}`,
        { headers: this.headers },
      ),
    );

    const tx = response.data.data;

    return {
      provider: 'flutterwave',
      reference,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      raw: response.data,
    };
  }

  verifyWebhookSignature(signature: string, payload: any): boolean {
    const secretHash = process.env.FLUTTERWAVE_SECRET_KEY!;
    const hash = crypto
      .createHmac('sha256', secretHash)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }
}