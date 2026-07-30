import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../payments.service';
import { PaystackProvider } from '../providers/paystack.provider';
import { FlutterwaveProvider } from '../providers/flutterwave.provider';
import { HttpService } from '@nestjs/axios';
import { getLoggerToken } from 'nestjs-pino';
import { BadRequestException } from '@nestjs/common';
import { PaymentProviderEnum } from '../dto/initialize-payment.dto';

const mockPaystackProvider = {
  initializePayment: jest.fn(),
  verifyPayment: jest.fn(),
  verifyWebhookSignature: jest.fn(),
};

const mockFlutterwaveProvider = {
  initializePayment: jest.fn(),
  verifyPayment: jest.fn(),
  verifyWebhookSignature: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
};

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: PaystackProvider, useValue: mockPaystackProvider },
        { provide: FlutterwaveProvider, useValue: mockFlutterwaveProvider },
        { provide: getLoggerToken(PaymentsService.name), useValue: mockLogger },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('initializePayment', () => {
   it('should use Paystack by default', async () => {
    mockPaystackProvider.initializePayment.mockResolvedValue({
    provider: 'paystack',
    reference: 'sp_123',
    paymentUrl: 'https://paystack.com/pay/xxx',
    status: 'pending',
    raw: {},
  });

  const result = await paymentsService.initializePayment('d1', {
    email: 'chris@test.com',
    amount: 5000,
  }, 'TEST');

  expect(result.provider).toBe('paystack');
  expect(mockPaystackProvider.initializePayment).toHaveBeenCalledTimes(1);
  expect(mockFlutterwaveProvider.initializePayment).not.toHaveBeenCalled();
});

  it('should use Flutterwave when specified', async () => {
    mockFlutterwaveProvider.initializePayment.mockResolvedValue({
    provider: 'flutterwave',
    reference: 'sp_456',
    paymentUrl: 'https://checkout.flutterwave.com/xxx',
    status: 'pending',
    raw: {},
  });

  const result = await paymentsService.initializePayment('d1', {
    email: 'chris@test.com',
    amount: 5000,
    provider: PaymentProviderEnum.FLUTTERWAVE,
  }, 'TEST');

  expect(result.provider).toBe('flutterwave');
  expect(mockFlutterwaveProvider.initializePayment).toHaveBeenCalledTimes(1);
  expect(mockPaystackProvider.initializePayment).not.toHaveBeenCalled();
  });
});

  describe('verifyPayment', () => {
    it('should verify via Paystack by default', async () => {
      mockPaystackProvider.verifyPayment.mockResolvedValue({
        provider: 'paystack',
        reference: 'sp_123',
        status: 'success',
        amount: 5000,
      });

      const result = await paymentsService.verifyPayment('sp_123');

      expect(result.provider).toBe('paystack');
      expect(mockPaystackProvider.verifyPayment).toHaveBeenCalledWith('sp_123');
    });

    it('should verify via Flutterwave when specified', async () => {
      mockFlutterwaveProvider.verifyPayment.mockResolvedValue({
        provider: 'flutterwave',
        reference: 'sp_456',
        status: 'successful',
        amount: 5000,
      });

      const result = await paymentsService.verifyPayment(
        'sp_456',
        PaymentProviderEnum.FLUTTERWAVE,
      );

      expect(result.provider).toBe('flutterwave');
      expect(mockFlutterwaveProvider.verifyPayment).toHaveBeenCalledWith('sp_456');
    });
  });

  describe('handleWebhook', () => {
    it('should throw if Paystack signature is invalid', async () => {
      mockPaystackProvider.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        paymentsService.handleWebhook('bad-signature', { event: 'charge.success' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if Flutterwave signature is invalid', async () => {
      mockFlutterwaveProvider.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        paymentsService.handleWebhook('bad-signature', { event: 'charge.completed' }, 'flutterwave'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return received true on valid Paystack webhook', async () => {
      mockPaystackProvider.verifyWebhookSignature.mockReturnValue(true);

      const result = await paymentsService.handleWebhook(
        'valid-signature',
        { event: 'charge.success', data: { reference: 'sp_123' } },
      );

      expect(result.received).toBe(true);
    });

    it('should return received true on valid Flutterwave webhook', async () => {
      mockFlutterwaveProvider.verifyWebhookSignature.mockReturnValue(true);

      const result = await paymentsService.handleWebhook(
        'valid-signature',
        { event: 'charge.completed', data: { tx_ref: 'sp_456' } },
        'flutterwave',
      );

      expect(result.received).toBe(true);
    });
  });
});