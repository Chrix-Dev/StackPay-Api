import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PaymentsService {
  private readonly paystackUrl = 'https://api.paystack.co';

  constructor(
    private prisma: PrismaService,
    private http: HttpService,
  ) {}

  private get headers() {
    return {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async initializePayment(developerId: string, dto: InitializePaymentDto) {
    const reference = `sp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const response = await firstValueFrom(
      this.http.post(
        `${this.paystackUrl}/transaction/initialize`,
        {
          email: dto.email,
          amount: dto.amount * 100,
          currency: dto.currency ?? 'NGN',
          reference,
          metadata: {
            description: dto.description,
            developerId,
          },
        },
        { headers: this.headers },
      ),
    );

    return response.data;
  }

  async verifyPayment(reference: string) {
    const response = await firstValueFrom(
      this.http.get(
        `${this.paystackUrl}/transaction/verify/${reference}`,
        { headers: this.headers },
      ),
    );

    return response.data;
  }

  async handleWebhook(signature: string, payload: any) {
  const hash = require('crypto')
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(JSON.stringify(payload))
    .digest('hex');

  if (hash !== signature) {
    throw new BadRequestException('Invalid webhook signature');
  }

  const { event, data } = payload;

  switch (event) {
    case 'charge.success':
      console.log('Payment successful:', data.reference);
      break;
    case 'charge.failed':
      console.log('Payment failed:', data.reference);
      break;
    default:
      console.log('Unhandled event:', event);
  }

  return { received: true };
}}

