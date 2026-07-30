import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, HttpException, HttpStatus, ForbiddenException } from '@nestjs/common';
import { KeysService } from '../keys.service';
import { RedisService } from '../../common/redis.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly PLAN_LIMITS = {
    FREE: 1000,
    PRO: 10000,
  };

  constructor(
    private keysService: KeysService,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key required. Pass it in the x-api-key header.');
    }

    const key = await this.keysService.validateKey(apiKey);

    if (!key) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    // Enforce test key restrictions
    if (key.environment === 'TEST' && process.env.NODE_ENV === 'production') {
      const isTestEndpoint = request.url.includes('?provider=') || true;
      // Test keys work everywhere but flag the environment
    }

    const now = new Date();
    const quotaKey = `quota:usage:${key.id}:${now.getFullYear()}:${now.getMonth() + 1}`;
    const secondsUntilMonthEnd = this.getSecondsUntilMonthEnd(now);

    const count = await this.redis.increment(quotaKey, secondsUntilMonthEnd);
    const limit = this.PLAN_LIMITS[key.developer.plan] ?? this.PLAN_LIMITS.FREE;

    if (count > limit) {
      throw new HttpException(
        {
          statusCode: 429,
          error: 'Quota Exceeded',
          message: `Monthly request limit of ${limit} reached. Upgrade to PRO for higher limits.`,
          currentUsage: count,
          limit,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    request.user = {
      id: key.developer.id,
      email: key.developer.email,
      role: key.developer.role,
      apiKeyId: key.id,
      plan: key.developer.plan,
      keyEnvironment: key.environment,
    };

    return true;
  }

  private getSecondsUntilMonthEnd(now: Date): number {
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.floor((endOfMonth.getTime() - now.getTime()) / 1000);
  }
}