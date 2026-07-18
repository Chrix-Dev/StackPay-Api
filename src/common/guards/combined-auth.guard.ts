import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyGuard } from '../../keys/guards/api-key.guard';

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  private jwtGuard = new (AuthGuard('jwt'))();

  constructor(private apiKeyGuard: ApiKeyGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Try API key first
    if (request.headers['x-api-key']) {
      return this.apiKeyGuard.canActivate(context);
    }

    // Fall back to JWT
    try {
      return await (this.jwtGuard.canActivate(context) as Promise<boolean>);
    } catch {
      throw new UnauthorizedException('Authentication required. Provide a JWT token or API key.');
    }
  }
}