import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { db } from './db.js';
import bcrypt from 'bcrypt';
import cors from 'cors';
import {exportsQueue} from "./queue.js";
import client from 'prom-client';
import { randomUUID} from "node:crypto";
import rateLimit from 'express-rate-limit';


const app = express();
const port = Number(process.env.PORT ?? 3000);

const allowedOrigin = process.env.LAB_ORIGIN ?? 'http://127.0.0.1:5173';
const originCheck = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const origin = req.headers.origin;
  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }
  next();
};

const register = new client.Registry();
client.collectDefaultMetrics({ register });


const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      path: req.route?.path ?? req.path,
      status: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });
  next();
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use(cors({
  origin: allowedOrigin,       // явный origin, не '*'
  credentials: true,           // разрешить cookie
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET ?? 'dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'none'
  },
}));
app.use(originCheck);
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('X-Request-Id', requestId);
  (req as any).requestId = requestId;
  console.log(`[${requestId}] ${req.method} ${req.path}`);
  next();
});
app.use((req, res, next) => {
  console.log(
      `${req.method} ${req.path}`,
      '| cookie:', req.headers.cookie?.slice(0, 30),
      '| x-csrf-token:', req.headers['x-csrf-token'],
      '| origin:', req.headers.origin,
  );
  next();
});



const csrfProtection = csrf({
  value: (req) => req.headers['x-csrf-token'] as string || req.headers['csrf-token'] as string,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

app.get('/health', async (_req, res) => {
  const result = await db.query('SELECT now() AS database_time');
  res.json({
    status: 'ok',
    databaseTime: result.rows[0].database_time,
  });
});

app.get('/auth/csrf', csrfProtection, (req, res) => {
  req.session.save((err) => {
    if (err) return res.status(500).json({ error: 'Session error' });
    res.set('Cache-Control', 'no-store');
    res.json({ csrfToken: req.csrfToken() });
  });
})

app.post('/auth/register', csrfProtection, async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({error: 'Email and password is required'});
  }

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if ((existing.rowCount ?? 0) > 0) {
    return res.status(409).json({error: 'User already exists'});
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await db.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name', [email, name, hash],
      );

  req.session.userId = result.rows[0].id;
  res.status(201).json({user: result.rows[0]});
});

app.post('/auth/login', loginLimiter, csrfProtection, async (req, res) => {
  const { email, password } = req.body;
  const result = await db.query('SELECT id, email, name, password_hash FROM users WHERE email = $1', [email],
      );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({error: 'Invalid credentials'});
  }

  req.session.userId = user.id;
  req.session.save((err) => {       // ← обязательно
    if (err) return res.status(500).json({ error: 'Session error' });
    res.json({ user: { id: String(user.id), name: user.name, email: user.email } });
  });
})

app.get('/auth/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const result = await db.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [req.session.userId],
  );
  if (result.rowCount === 0) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = result.rows[0];
  res.json({
    user: { id: String(user.id), name: user.name, email: user.email },
  });
});

app.get('/jobs', async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)));
  const offset = (page - 1) * limit;
  const q = req.query.q ? String(req.query.q) : null;
  const company = req.query.company ? String(req.query.company) : null;
  const sort = req.query.sort === 'created_at_asc' ? 'ASC' : 'DESC';

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q) {
    params.push(`%${q}%`);
    conditions.push(`title ILIKE $${params.length}`);
  }
  if (company) {
    params.push(company);
    conditions.push(`company = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalResult = await db.query(`SELECT COUNT(*)::int AS total FROM jobs ${where}`, params);
  const total = totalResult.rows[0].total;

  params.push(limit, offset);
  const itemsResult = await db.query(
      `SELECT id, title, company, created_at AS "createdAt"
     FROM jobs ${where}
     ORDER BY created_at ${sort}, id ${sort}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
  );

  res.json({ items: itemsResult.rows, total, page, limit });
});

app.post('/exports', csrfProtection, async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { format = 'csv'} = req.body;
  if (format !== 'csv') {
    return res.status(400).json({ error: 'Only csv format supported' });
  }
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if ( !idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key required' });
  }

  const existing = await db.query(
      'SELECT id, status FROM exports WHERE user_id = $1 AND idempotency_key = $2',
      [req.session.userId, idempotencyKey],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    const exp = existing.rows[0];
    return res.status(202).json({ export: { id: String(exp.id), status: exp.status} })
  }

  const inserted = await db.query(
      `INSERT INTO exports (user_id, format, status, idempotency_key)
     VALUES ($1, $2, 'queued', $3)
     RETURNING id, status`,
      [req.session.userId, format, idempotencyKey],
  );
  const exp = inserted.rows[0];

  await exportsQueue.add('generate', {
    exportId: exp.id,
    userId: req.session.userId,
    format,
  });

  res.status(202).json({ export: { id: String(exp.id), status: 'queued' } });
});

app.get('/exports/:id', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({error: 'Not authenticated'});
  }
  const result = await db.query(
      'SELECT id, status, progress FROM exports WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId],
  );
  if (!result.rowCount || result.rowCount === 0) {
    return res.status(404).json({error: 'Not found'});
  }
  const exp = result.rows[0];
  res.json({export: {id: String(exp.id), status: exp.status, progress: exp.progress}});
});

app.get('/exports/:id/file', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({error: 'Not authenticated'});
  }
  const result = await db.query(
      'SELECT status, file_path FROM exports WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId],
  );
  if (!result.rowCount || result.rowCount === 0) {
    return res.status(404).json({error: 'Not found'});
  }
  const exp = result.rows[0];
  if (exp.status !== 'completed' || !exp.file_path) {
    return res.status(404).json({error: 'Export not ready'});
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="applications-${req.params.id}.csv"`);
  res.sendFile(exp.file_path, { root: process.cwd() });
})

const server = app.listen(port, () => {
  console.log(`API started on http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  server.close();
  await db.end();
});
