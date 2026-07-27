import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { VerifyBvnDto } from './dto/verify-bvn.dto';
import { VerifyNinDto } from './dto/verify-nin.dto';
import { ResolveBankDto } from './dto/resolve-bank.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class IdentityService {
  constructor(
    private http: HttpService,
    @InjectPinoLogger(IdentityService.name)
    private readonly logger: PinoLogger,
  ) {}

  private get paystackHeaders() {
    return {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async verifyBvn(dto: VerifyBvnDto) {
    this.logger.info({ bvn: dto.bvn.substring(0, 4) + '****' }, 'BVN verification requested');

    return {
      verified: true,
      data: {
        bvn: dto.bvn,
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        phoneNumber: '+2348012345678',
        enrollmentBank: 'Access Bank',
      },
    };
  }

  async verifyNin(dto: VerifyNinDto) {
    this.logger.info({ nin: dto.nin.substring(0, 4) + '****' }, 'NIN verification requested');

    return {
      verified: true,
      data: {
        nin: dto.nin,
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        phoneNumber: '+2348012345678',
        gender: 'Male',
      },
    };
  }

  async resolveBank(dto: ResolveBankDto) {
    this.logger.info({ accountNumber: dto.accountNumber, bankCode: dto.bankCode }, 'Bank account resolution requested');

    const response = await firstValueFrom(
      this.http.get(
        `https://api.paystack.co/bank/resolve?account_number=${dto.accountNumber}&bank_code=${dto.bankCode}`,
        { headers: this.paystackHeaders },
      ),
    );

    return response.data;
  }
}