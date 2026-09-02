import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/lib/database/prisma.service.js';

describe('Better Auth NestJS Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      bodyParser: false,
    });
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test-e2e-',
          },
        },
      });
    }
    await app.close();
  });

  it('GET / allows anonymous access and returns Hello World!', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);

    expect(response.text).toBe('Hello World!');
  });

  it('GET /me without authentication returns 401 Unauthorized', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
  });

  it('POST /api/auth/sign-up/email creates a user with default role PARTICIPANT', async () => {
    const testEmail = `test-e2e-${Date.now()}@example.com`;
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        email: testEmail,
        password: 'Password123!',
        name: 'Test Participant',
      })
      .expect(200);

    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(testEmail);
    expect(response.body.user.role).toBe('PARTICIPANT');

    // Verify in database directly
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    expect(dbUser).toBeDefined();
    expect(dbUser?.role).toBe('PARTICIPANT');
  });

  it('POST /api/auth/sign-up/email rejects setting role to ADMIN during sign-up', async () => {
    const testEmail = `test-e2e-admin-${Date.now()}@example.com`;
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        email: testEmail,
        password: 'Password123!',
        name: 'Malicious Admin Wannabe',
        role: 'ADMIN',
      });

    // Better Auth with input: false rejects unknown/forbidden input fields with 400 Bad Request
    expect([400, 422]).toContain(response.status);

    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    expect(dbUser).toBeNull();
  });

  it('signs in, accesses protected routes with session, and validates role guards', async () => {
    const testEmail = `test-e2e-flow-${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    // 1. Sign up
    await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Flow User',
      })
      .expect(200);

    // 2. Sign in to receive cookie
    const signInRes = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200);

    const cookies = signInRes.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // 3. Access /me with session cookie
    const meRes = await request(app.getHttpServer())
      .get('/me')
      .set('Cookie', cookies)
      .expect(200);

    expect(meRes.body.user.email).toBe(testEmail);
    expect(meRes.body.user.role).toBe('PARTICIPANT');

    // 4. Access /participant (allowed for role PARTICIPANT)
    await request(app.getHttpServer())
      .get('/participant')
      .set('Cookie', cookies)
      .expect(200);

    // 5. Access /admin (forbidden for role PARTICIPANT)
    await request(app.getHttpServer())
      .get('/admin')
      .set('Cookie', cookies)
      .expect(403);
  });
});
