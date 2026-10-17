import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      // Comma-separated so the deployed frontend and a local dev frontend testing against this
      // same deployed backend can both be allowed at once, e.g.
      // "https://dashboard-editor.onrender.com,https://localhost:4201".
      origin: process.env.FRONTEND_URL?.split(',').map((url) => url.trim()),
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
  });
  app.setGlobalPrefix('api');
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
