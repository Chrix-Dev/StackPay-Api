import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.developer.findUnique({
      where: { email: dto.email },
    });

    if (exists) throw new BadRequestException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    const verifyToken = uuidv4();

    const developer = await this.prisma.developer.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        verifyToken,
      },
    });

    return {
      message: 'Registration successful. Please verify your email.',
      verifyToken,
    };
  }

  async login(dto: LoginDto) {
    const developer = await this.prisma.developer.findUnique({
      where: { email: dto.email },
    });

    if (!developer) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, developer.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!developer.isVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const token = this.jwt.sign({
      sub: developer.id,
      email: developer.email,
    });

    return {
      token,
      developer: {
        id: developer.id,
        email: developer.email,
        firstName: developer.firstName,
        lastName: developer.lastName,
      },
    };
  }

  async verifyEmail(token: string) {
    const developer = await this.prisma.developer.findFirst({
      where: { verifyToken: token },
    });

    if (!developer) throw new BadRequestException('Invalid verification token');

    await this.prisma.developer.update({
      where: { id: developer.id },
      data: { isVerified: true, verifyToken: null },
    });

    return { message: 'Email verified successfully' };
  }

  async getMe(developerId: string) {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        createdAt: true,
      },
    });

    return developer;
  }
}