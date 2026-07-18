import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

jest.setTimeout(30000);

describe('StackPay E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;
  let walletId: string;

  const testEmail = `e2e_${Date.now()}@test.com`;
  const testPassword = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  }, 30000);

  afterAll(async () => {
    await prisma.requestLog.deleteMany({ where: { developer: { email: testEmail } } });
    await prisma.auditLog.deleteMany({ where: { developer: { email: testEmail } } });
    await prisma.refreshToken.deleteMany({ where: { developer: { email: testEmail } } });
    await prisma.walletTransaction.deleteMany({
      where: { wallet: { developer: { email: testEmail } } },
    });
    await prisma.wallet.deleteMany({ where: { developer: { email: testEmail } } });
    await prisma.apiKey.deleteMany({ where: { developer: { email: testEmail } } });
    await prisma.developer.deleteMany({ where: { email: testEmail } });
    await app.close();
  }, 30000);

  describe('Auth Flow', () => {
    it('POST /api/v1/auth/register — should register successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          firstName: 'E2E',
          lastName: 'Test',
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.verifyToken).toBeDefined();

      const verifyToken = res.body.verifyToken;

      await request(app.getHttpServer())
        .post(`/api/v1/auth/verify-email/${verifyToken}`);
    });

    it('POST /api/v1/auth/login — should login and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('POST /api/v1/auth/refresh — should return new token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('GET /api/v1/auth/me — should return current developer', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(testEmail);
    });
  });

  describe('Wallet Flow', () => {
    it('GET /api/v1/wallet/me — should return or create wallet', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.balance).toBeDefined();
      walletId = res.body.id;
    });

    it('POST /api/v1/wallet/pin — should set PIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/pin')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pin: '1234' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('PIN set successfully');
    });

    it('POST /api/v1/wallet/fund — should fund wallet', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/wallet/fund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 10000 });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Wallet funded');
      expect(Number(res.body.transaction.amount)).toBe(10000);
    });

    it('GET /api/v1/wallet/transactions — should return transaction history', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet/transactions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toBeDefined();
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/wallet/fund — idempotency should return same transaction', async () => {
      const idempotencyKey = `idem_${Date.now()}`;

      const first = await request(app.getHttpServer())
        .post('/api/v1/wallet/fund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 5000, idempotencyKey });

      const second = await request(app.getHttpServer())
        .post('/api/v1/wallet/fund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 5000, idempotencyKey });

      expect(first.body.transaction.id).toBe(second.body.transaction.id);
      expect(second.body.message).toBe('Duplicate request');
    });
  });

  describe('Dashboard Flow', () => {
    it('GET /api/v1/dashboard/stats — should return usage stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalRequests).toBeDefined();
      expect(res.body.successRate).toBeDefined();
    });
  });

  describe('Identity Flow', () => {
  it('POST /api/v1/identity/bvn/verify — should return simulated BVN data', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/identity/bvn/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bvn: '12345678901' });

    expect(res.status).toBe(201);
    expect(res.body.verified).toBe(true);
    expect(res.body.data.bvn).toBe('12345678901');
  });

  it('POST /api/v1/identity/nin/verify — should return simulated NIN data', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/identity/nin/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nin: '12345678901' });

    expect(res.status).toBe(201);
    expect(res.body.verified).toBe(true);
    expect(res.body.data.nin).toBe('12345678901');
  });
});

describe('Messaging Flow', () => {
  it('POST /api/v1/messaging/otp/send — should send OTP and return code in dev mode', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/messaging/otp/send')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ recipient: '+2348012345678', channel: 'sms' });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('OTP sent');
    expect(res.body.otp).toBeDefined();
  });

  it('POST /api/v1/messaging/otp/verify — should verify OTP successfully', async () => {
    const sendRes = await request(app.getHttpServer())
      .post('/api/v1/messaging/otp/send')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ recipient: '+2348099999999', channel: 'sms' });

    const otp = sendRes.body.otp;

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/messaging/otp/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ recipient: '+2348099999999', code: otp });

    expect(verifyRes.status).toBe(201);
    expect(verifyRes.body.message).toBe('OTP verified successfully');
  });
});
});