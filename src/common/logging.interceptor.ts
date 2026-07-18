import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path, user } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(async () => {
        const duration = Date.now() - start;
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        if (user?.id) {
          await this.prisma.requestLog.create({
            data: {
              method,
              path,
              statusCode,
              duration,
              developerId: user.id,
              apiKeyId: user.apiKeyId ?? null,
            },
          });
        }
      }),
    );
  }
}