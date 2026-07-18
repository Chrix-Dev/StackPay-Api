import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CombinedAuthGuard } from '../common/guards/combined-auth.guard';
import { WalletService } from './wallet.service';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { TransferWalletDto } from './dto/transfer-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { ChangePinDto } from './dto/change-pin.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SetPinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  pin!: string;
}

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(CombinedAuthGuard)
@Controller('api/v1/wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('me')
  getWallet(@Req() req: any) {
    return this.walletService.getWallet(req.user.id);
  }

  @Post('pin')
  setPin(@Req() req: any, @Body() body: SetPinDto) {
    return this.walletService.setPin(req.user.id, body.pin);
  }

  @Post('fund')
  fundWallet(@Req() req: any, @Body() dto: FundWalletDto) {
    return this.walletService.fundWallet(req.user.id, dto);
  }

  @Post('transfer')
  transfer(@Req() req: any, @Body() dto: TransferWalletDto) {
    return this.walletService.transfer(req.user.id, dto);
  }

  @Post('withdraw')
  withdraw(@Req() req: any, @Body() dto: WithdrawWalletDto) {
    return this.walletService.withdraw(req.user.id, dto);
  }

  @Post('pin/change')
  changePin(@Req() req: any, @Body() dto: ChangePinDto) {
    return this.walletService.changePin(req.user.id, dto.oldPin, dto.newPin);
  }

  @Get('transactions')
  getTransactions(@Req() req: any, @Query() query: QueryTransactionsDto) {
    return this.walletService.getTransactions(req.user.id, query);
  }

  @Get('transactions/:id')
  getTransaction(@Req() req: any, @Param('id') id: string) {
    return this.walletService.getTransaction(req.user.id, id);
  }
}