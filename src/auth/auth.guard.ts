import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../shared/decorators/public.decorator';
import { JwtPayload } from './types/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) throw new UnauthorizedException();

    try {
      // 2. Явно указываем секрет для проверки Access Token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      request.user = payload;
    } catch (e) {
      // Это поможет отловить ошибку "JsonWebTokenError: invalid signature",
      // если секреты в AuthService и Guard не совпадут
      console.error('JWT Verification Error:', e.message);
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
