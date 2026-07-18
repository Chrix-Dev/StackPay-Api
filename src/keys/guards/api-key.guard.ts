import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { KeysService } from '../keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private keysService: KeysService) {}

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

    request.user = {
      id: key.developer.id,
      email: key.developer.email,
      role: key.developer.role,
      apiKeyId: key.id,
    };

    return true;
  }
}