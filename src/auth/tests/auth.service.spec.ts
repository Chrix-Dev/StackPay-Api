import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  developer: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw if email already exists', async () => {
      mockPrisma.developer.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });

      await expect(
        authService.register({
          email: 'test@test.com',
          password: 'password123',
          firstName: 'Chris',
          lastName: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a developer and return verifyToken', async () => {
      mockPrisma.developer.findUnique.mockResolvedValue(null);
      mockPrisma.developer.create.mockResolvedValue({
        id: '1',
        email: 'new@test.com',
        verifyToken: 'some-token',
      });

      const result = await authService.register({
        email: 'new@test.com',
        password: 'password123',
        firstName: 'Chris',
        lastName: 'Test',
      });

      expect(result.message).toBe('Registration successful. Please verify your email.');
      expect(result.verifyToken).toBeDefined();
      expect(mockPrisma.developer.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('should throw if developer not found', async () => {
      mockPrisma.developer.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if password is wrong', async () => {
      mockPrisma.developer.findUnique.mockResolvedValue({
        id: '1',
        email: 'chris@test.com',
        password: await bcrypt.hash('correctpassword', 10),
        isVerified: true,
      });

      await expect(
        authService.login({ email: 'chris@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if email not verified', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      mockPrisma.developer.findUnique.mockResolvedValue({
        id: '1',
        email: 'chris@test.com',
        password: hashed,
        isVerified: false,
      });

      await expect(
        authService.login({ email: 'chris@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on successful login', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      mockPrisma.developer.findUnique.mockResolvedValue({
        id: '1',
        email: 'chris@test.com',
        password: hashed,
        isVerified: true,
        firstName: 'Chris',
        lastName: 'Test',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login({
        email: 'chris@test.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.developer.email).toBe('chris@test.com');
    });
  });

  describe('verifyEmail', () => {
    it('should throw if token is invalid', async () => {
      mockPrisma.developer.findFirst.mockResolvedValue(null);

      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should verify email successfully', async () => {
      mockPrisma.developer.findFirst.mockResolvedValue({ id: '1', verifyToken: 'valid-token' });
      mockPrisma.developer.update.mockResolvedValue({});

      const result = await authService.verifyEmail('valid-token');
      expect(result.message).toBe('Email verified successfully');
      expect(mockPrisma.developer.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isVerified: true, verifyToken: null },
      });
    });
  });

  describe('refresh', () => {
  it('should throw if refresh token not found', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(authService.refresh('invalid-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if refresh token is revoked', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      revoked: true,
      expiresAt: new Date(Date.now() + 10000),
      developer: { id: 'd1', email: 'chris@test.com' },
    });

    await expect(authService.refresh('some-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if refresh token is expired', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      revoked: false,
      expiresAt: new Date(Date.now() - 10000),
      developer: { id: 'd1', email: 'chris@test.com' },
    });

    await expect(authService.refresh('some-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should return new token pair on valid refresh token', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      revoked: false,
      expiresAt: new Date(Date.now() + 100000),
      developer: { id: 'd1', email: 'chris@test.com' },
    });
    mockPrisma.refreshToken.update.mockResolvedValue({});
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const result = await authService.refresh('valid-token');

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { revoked: true },
      }),
    );
  });
});

describe('logout', () => {
  it('should revoke refresh token on logout', async () => {
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const result = await authService.logout('some-token');

    expect(result.message).toBe('Logged out successfully');
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { revoked: true },
      }),
    );
  });
});
});