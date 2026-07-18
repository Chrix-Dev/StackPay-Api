import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { LoggingInterceptor } from './logging.interceptor';
import { AuditLogService } from './audit-log.service';
import { CombinedAuthGuard } from './guards/combined-auth.guard';
import { KeysModule } from '../keys/keys.module';



@Global()
@Module({
  imports: [KeysModule],
  providers: [RedisService, LoggingInterceptor, AuditLogService, CombinedAuthGuard],
  exports: [RedisService, LoggingInterceptor, AuditLogService, CombinedAuthGuard],
})
export class CommonModule {}