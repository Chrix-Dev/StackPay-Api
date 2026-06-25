import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { LoggingInterceptor } from './logging.interceptor';
import { AuditLogService } from './audit-log.service';


@Global()
@Module({
  providers: [RedisService, LoggingInterceptor, AuditLogService],
  exports: [RedisService, LoggingInterceptor, AuditLogService],
})
export class CommonModule {}