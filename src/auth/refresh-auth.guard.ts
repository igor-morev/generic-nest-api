import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// refresh-auth.guard.ts
@Injectable()
export class RefreshAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Извлекаем токен из кастомного заголовка или Body
    const refreshToken = request.headers['x-refresh-token'];

    if (!refreshToken) throw new UnauthorizedException();

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      request.user = { ...payload, refreshToken };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
