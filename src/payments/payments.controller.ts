import { Controller, Post, Get, Body, Param, UseGuards, Req, Headers as NestHeaders, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';

@ApiTags('Payments')
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('initialize')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  initializePayment(@Req() req: any, @Body() dto: InitializePaymentDto) {
    return this.paymentsService.initializePayment(req.user.id, dto);
  }

  @Get('verify/:reference')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  verifyPayment(@Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(
    @NestHeaders('x-paystack-signature') signature: string,
    @Body() payload: any,
  ) {
    return this.paymentsService.handleWebhook(signature, payload);
  }
}