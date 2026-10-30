import { INestApplication } from '@nestjs/common';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';

export async function setupApp(app: INestApplication) {
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
}
