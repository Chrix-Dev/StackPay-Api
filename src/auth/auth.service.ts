import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

private hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

private async issueTokens(developerId: string, email: string) {
  const accessToken = this.jwt.sign(
    { sub: developerId, email },
    { expiresIn: '15m' },
  );

  const refreshToken = this.generateRefreshToken();
  const tokenHash = this.hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await this.prisma.refreshToken.create({
    data: {
      tokenHash,
      expiresAt,
      developerId,
    },
  });

  return { accessToken, refreshToken };
}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.developer.findUnique({
      where: { email: dto.email },
    });

    if (exists) throw new BadRequestException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    const verifyToken = crypto.randomUUID();

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

  const tokens = await this.issueTokens(developer.id, developer.email);

  return {
  ...tokens,
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
  
  async refresh(refreshToken: string) {
  const tokenHash = this.hashToken(refreshToken);

  const storedToken = await this.prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { developer: true },
  });

  if (!storedToken) {
    throw new UnauthorizedException('Invalid refresh token');
  }

  if (storedToken.revoked) {
    throw new UnauthorizedException('Refresh token has been revoked');
  }

  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedException('Refresh token expired');
  }

  await this.prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true },
  });

  const tokens = await this.issueTokens(storedToken.developer.id, storedToken.developer.email);

  return tokens;
}

async logout(refreshToken: string) {
  const tokenHash = this.hashToken(refreshToken);

  await this.prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true },
  });

  return { message: 'Logged out successfully' };
}
}