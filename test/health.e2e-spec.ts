import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health → 200 with databaseTime', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.databaseTime).toBeDefined();
  });

  it('GET /jobs → 200 with items', async () => {
    const res = await request(app.getHttpServer()).get('/jobs?limit=1').expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBeGreaterThan(0);
  });
});