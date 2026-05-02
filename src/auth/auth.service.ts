import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtPayload, Tokens } from './types/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signUp(username: string, password: string): Promise<Tokens> {
    // 1. Проверяем, не занят ли логин (зависит от вашей реализации в UserService)
    const exists = await this.userService.findOneByUsername(username);
    if (exists) throw new ConflictException('User already exists');

    // 2. Хешируем пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Создаем пользователя
    const user = await this.userService.create({
      username,
      password: hashedPassword,
    });

    // 4. Генерируем токены, чтобы юзер сразу был авторизован
    const tokens = await this.getTokens(user.id, user.username);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  async signIn(
    username: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const user = await this.userService.findOneByUsername(username);

    // 1. Проверяем существование пользователя
    // 2. Сравниваем хеш пароля из БД с пришедшим паролем
    const isMatch = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!isMatch || !user) {
      throw new UnauthorizedException();
    }

    const tokens = await this.getTokens(user.id, user.username);

    // Сохраняем хеш Refresh Token в базу для валидации
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  async refreshTokens(userId: string, refreshToken: string) {
    // 1. Ищем пользователя и принудительно достаем хеш токена
    const user = await this.userService.findOneWithHash(userId);

    // Если пользователя нет или у него нет сохраненного токена (например, после logout)
    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access Forbidden');
    }

    // 2. Сравниваем пришедший RT с тем, что лежит в БД
    const rtMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );

    if (!rtMatches) {
      throw new ForbiddenException('Access Forbidden');
    }

    // 3. Если совпало — генерируем новую пару токенов
    const tokens = await this.getTokens(user.id, user.username);

    // 4. Обновляем хеш нового Refresh Token в базе (Rotation)
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  // Вспомогательный метод: генерация пары токенов
  async getTokens(userId: string, username: string): Promise<Tokens> {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync<JwtPayload>({ sub: userId, username }),
      this.jwtService.signAsync<JwtPayload>(
        { sub: userId, username },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
        },
      ),
    ]);

    return { access_token: at, refresh_token: rt };
  }

  // Метод для хеширования и сохранения RT в базу
  async updateRefreshToken(userId: string, refreshToken: string) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(refreshToken, salt);
    await this.userService.update(userId, { hashedRefreshToken: hash });
  }

  async logout(userId: string) {
    // Просто зануляем поле в базе данных
    await this.userService.update(userId, {
      hashedRefreshToken: '',
    });
  }
}
