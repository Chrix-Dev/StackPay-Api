import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { LoggingInterceptor } from './logging.interceptor';

@Global()
@Module({
  providers: [RedisService, LoggingInterceptor],
  exports: [RedisService, LoggingInterceptor],
})
export class CommonModule {}