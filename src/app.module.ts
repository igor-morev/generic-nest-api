import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './user/user.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { MessageModule } from './message/message.module';
import { RoomModule } from './room/room.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres', // можно вынести в конфиг
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),

        // 1. Сущности
        autoLoadEntities: true,

        // 2. Безопасность
        synchronize: false, // В ПРОДАКШЕНЕ ТОЛЬКО FALSE

        // 3. Миграции (обязательно для прода)
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        migrationsRun: true, // Автозапуск миграций при старте сервера

        // 4. Логирование и производительность
        logging: ['error', 'warn'], // Логируем только ошибки, чтобы не забивать диск
        retryAttempts: 10, // Попытки переподключения при сбое базы

        // 5. SSL (часто требуется облачными провайдерами, например AWS/Heroku)
        // ssl: config.get<boolean>('DB_SSL')
        //   ? { rejectUnauthorized: false }
        //   : false,
      }),
    }),
    UsersModule,
    EventsModule,
    AuthModule,
    MessageModule,
    RoomModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
