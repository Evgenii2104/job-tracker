import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';

const testEmail = `e2e-${Date.now()}@example.test`;
const testPassword = 'test-password-123';
let redisClient: any;

describe('Exports (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let cookie: string;
  let csrfToken: string;
  //let redisClient: any;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await setupApp(app);
    await app.init();

    redisClient = createClient({ url: 'redis://localhost:6379' });
    await redisClient.connect();
    app.use(cookieParser());
    app.use(session({
      store: new RedisStore({ client: redisClient }),
      secret: 'dev-secret',
      resave: false,
      saveUninitialized: true,
      name: 'jt.sid',
      cookie: { httpOnly: true, secure: false, sameSite: 'none' },
    }));

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, name: 'E2E Test', password: testPassword })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);
    cookie = loginRes.headers['set-cookie'][0].split(';')[0];

    const csrfRes = await request(app.getHttpServer())
      .get('/auth/csrf')
      .set('Cookie', cookie)
      .expect(200);
    csrfToken = csrfRes.body.csrfToken;
  });

  afterAll(async () => {
    await app.close();
    if (redisClient) await redisClient.quit();
  });

  it('POST /exports without CSRF → 403', async () => {
    await request(app.getHttpServer())
      .post('/exports')
      .set('Cookie', cookie)
      .set('Idempotency-Key', 'e2e-test-1')
      .send({ format: 'csv' })
      .expect(403);
  });

  it('POST /exports with CSRF → 202', async () => {
    const res = await request(app.getHttpServer())
      .post('/exports')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .set('Idempotency-Key', 'e2e-test-2')
      .send({ format: 'csv' })
      .expect(202);
    expect(res.body.export.status).toBe('queued');
  });
});