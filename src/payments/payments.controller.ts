import { Controller, Post, Get, Body, Param, Query, UseGuards, Req, Headers as NestHeaders, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CombinedAuthGuard } from '../common/guards/combined-auth.guard';
import { PaymentsService } from './payments.service';
import { InitializePaymentDto, PaymentProviderEnum } from './dto/initialize-payment.dto';

@ApiTags('Payments')
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('initialize')
  @ApiBearerAuth()
  @UseGuards(CombinedAuthGuard)
  initializePayment(@Req() req: any, @Body() dto: InitializePaymentDto) {
    return this.paymentsService.initializePayment(req.user.id, dto);
  }

  @Get('verify/:reference')
  @ApiBearerAuth()
  @UseGuards(CombinedAuthGuard)
  verifyPayment(
    @Param('reference') reference: string,
    @Query('provider') provider?: PaymentProviderEnum,
  ) {
    return this.paymentsService.verifyPayment(reference, provider);
  }

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(
    @NestHeaders('x-paystack-signature') paystackSig: string,
    @NestHeaders('verif-hash') flutterwaveSig: string,
    @Query('provider') provider: string,
    @Body() payload: any,
  ) {
    const signature = provider === 'flutterwave' ? flutterwaveSig : paystackSig;
    return this.paymentsService.handleWebhook(signature, payload, provider);
  }

  @Get('providers')
  getProviders() {
  return {
    providers: [
      { name: 'paystack', default: true, description: 'Paystack payment gateway' },
      { name: 'flutterwave', default: false, description: 'Flutterwave payment gateway' },
    ],
  };
}
}