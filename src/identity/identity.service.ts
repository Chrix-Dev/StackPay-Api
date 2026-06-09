import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { VerifyBvnDto } from './dto/verify-bvn.dto';
import { VerifyNinDto } from './dto/verify-nin.dto';
import { ResolveBankDto } from './dto/resolve-bank.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class IdentityService {
  constructor(private http: HttpService) {}

  private get paystackHeaders() {
    return {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async verifyBvn(dto: VerifyBvnDto) {
    // Simulated — real implementation would call Smile ID
    console.log(`[SMILE ID] Verifying BVN: ${dto.bvn}`);

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
    // Simulated — real implementation would call NIBSS
    console.log(`[NIBSS] Verifying NIN: ${dto.nin}`);

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
    const response = await firstValueFrom(
      this.http.get(
        `https://api.paystack.co/bank/resolve?account_number=${dto.accountNumber}&bank_code=${dto.bankCode}`,
        { headers: this.paystackHeaders },
      ),
    );

    return response.data;
  }
}