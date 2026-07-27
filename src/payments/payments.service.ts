import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InitializePaymentDto, PaymentProviderEnum } from './dto/initialize-payment.dto';
import { PaystackProvider } from './providers/paystack.provider';
import { FlutterwaveProvider } from './providers/flutterwave.provider';
import { PaymentProvider } from './providers/payment-provider.interface';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    private http: HttpService,
    private paystackProvider: PaystackProvider,
    private flutterwaveProvider: FlutterwaveProvider,
    @InjectPinoLogger(PaymentsService.name)
    private readonly logger: PinoLogger,
  ) {}

  private getProvider(provider?: PaymentProviderEnum): PaymentProvider {
    switch (provider) {
      case PaymentProviderEnum.FLUTTERWAVE:
        return this.flutterwaveProvider;
      case PaymentProviderEnum.PAYSTACK:
      default:
        return this.paystackProvider;
    }
  }

  async initializePayment(developerId: string, dto: InitializePaymentDto) {
    const reference = `sp_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
    const provider = this.getProvider(dto.provider);

    this.logger.info(
      { developerId, provider: dto.provider ?? 'paystack', reference },
      'Payment initialization requested',
    );

    return provider.initializePayment({
      email: dto.email,
      amount: dto.amount,
      currency: dto.currency ?? 'NGN',
      reference,
      description: dto.description,
    });
  }

  async verifyPayment(reference: string, providerName?: PaymentProviderEnum) {
    const provider = this.getProvider(providerName);

    this.logger.info({ reference, provider: providerName ?? 'paystack' }, 'Payment verification requested');

    return provider.verifyPayment(reference);
  }

  async handleWebhook(signature: string, payload: any, providerName?: string) {
    const provider = providerName === 'flutterwave'
      ? this.flutterwaveProvider
      : this.paystackProvider;

    const isValid = provider.verifyWebhookSignature(signature, payload);

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { event, data } = payload;

    this.logger.info({ event, provider: providerName ?? 'paystack' }, 'Webhook received');

    switch (event) {
      case 'charge.success':
      case 'charge.completed':
        this.logger.info({ reference: data?.reference ?? data?.tx_ref }, 'Payment successful');
        break;
      case 'charge.failed':
        this.logger.info({ reference: data?.reference ?? data?.tx_ref }, 'Payment failed');
        break;
      default:
        this.logger.info({ event }, 'Unhandled webhook event');
    }

    return { received: true };
  }
}