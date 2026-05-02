import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from 'src/shared/decorators/public.decorator';
import { JwtPayload } from './types/jwt';
import { RefreshAuthGuard } from './refresh-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public() // Теперь этот метод доступен всем!
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  signUp(@Body() signUpDto: { username: string; password: string }) {
    return this.authService.signUp(signUpDto.username, signUpDto.password);
  }

  @Public() // Теперь этот метод доступен всем!
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: { username: string; password: string }) {
    return this.authService.signIn(signInDto.username, signInDto.password);
  }

  @Public() // Глобальный AuthGuard пропустит
  @UseGuards(RefreshAuthGuard) // Но этот Guard проверит наличие Refresh Token
  @Post('refresh')
  refresh(@Request() req) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;
    // AuthService должен проверить хеш RT в базе и выдать новую пару токенов
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Post('logout')
  // Мы не ставим @Public(), так как разлогиниться может только вошедший юзер
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: { user: JwtPayload }) {
    const userId = req.user.sub; // Извлекаем id из Access Token (payload)
    await this.authService.logout(userId);
    return { message: 'ok' };
  }

  @Get('userDetails')
  getProfile(@Request() req: { user: JwtPayload }) {
    return req.user;
  }
}
