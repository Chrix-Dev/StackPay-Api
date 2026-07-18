import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CombinedAuthGuard } from '../common/guards/combined-auth.guard';
import { IdentityService } from './identity.service';
import { VerifyBvnDto } from './dto/verify-bvn.dto';
import { VerifyNinDto } from './dto/verify-nin.dto';
import { ResolveBankDto } from './dto/resolve-bank.dto';

@ApiTags('Identity')
@ApiBearerAuth()
@UseGuards(CombinedAuthGuard)
@Controller('api/v1/identity')
export class IdentityController {
  constructor(private identityService: IdentityService) {}

  @Post('bvn/verify')
  verifyBvn(@Body() dto: VerifyBvnDto) {
    return this.identityService.verifyBvn(dto);
  }

  @Post('nin/verify')
  verifyNin(@Body() dto: VerifyNinDto) {
    return this.identityService.verifyNin(dto);
  }

  @Post('bank/resolve')
  resolveBank(@Body() dto: ResolveBankDto) {
    return this.identityService.resolveBank(dto);
  }
}