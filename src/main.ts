import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import { setupApp } from './setup-app';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await setupApp(app);

  const redisClient = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  });
  await redisClient.connect();

  app.use(cookieParser());
  app.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret: process.env.SESSION_SECRET ?? 'dev-secret',
      resave: false,
      saveUninitialized: true,
      name: 'jt.sid',
      cookie: { httpOnly: true, secure: false, sameSite: 'none' },
    }),
  );

  await app.listen(process.env.PORT ?? 3002);
}
void bootstrap();
