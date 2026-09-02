import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/lib/database/prisma.service.js';

describe('UserModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let participantCookie: string[];
  let participantUserId: string;

  let adminCookie: string[];
  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      bodyParser: false,
    });
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // 1. Create a regular participant user
    const participantEmail = `test-user-participant-${Date.now()}@example.com`;
    const participantPassword = 'Password123!';
    const pSignUpRes = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        email: participantEmail,
        password: participantPassword,
        name: 'Participant User',
      })
      .expect(200);

    participantUserId = pSignUpRes.body.user.id;

    const pSignInRes = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({
        email: participantEmail,
        password: participantPassword,
      })
      .expect(200);

    participantCookie = pSignInRes.headers['set-cookie'];

    // 2. Create an admin user
    const adminEmail = `test-user-admin-${Date.now()}@example.com`;
    const adminPassword = 'Password123!';
    const aSignUpRes = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        email: adminEmail,
        password: adminPassword,
        name: 'Admin User',
      })
      .expect(200);

    adminUserId = aSignUpRes.body.user.id;

    // Elevate to ADMIN in database
    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: 'ADMIN' },
    });

    const aSignInRes = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({
        email: adminEmail,
        password: adminPassword,
      })
      .expect(200);

    adminCookie = aSignInRes.headers['set-cookie'];
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test-user-',
          },
        },
      });
    }
    await app.close();
  });

  describe('GET /user/all', () => {
    it('returns 401 Unauthorized if not authenticated', async () => {
      await request(app.getHttpServer()).get('/user/all').expect(401);
    });

    it('returns 403 Forbidden if authenticated as non-admin (PARTICIPANT)', async () => {
      await request(app.getHttpServer())
        .get('/user/all')
        .set('Cookie', participantCookie)
        .expect(403);
    });

    it('returns 200 and list of all users if authenticated as ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/user/all')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      const foundParticipant = res.body.find(
        (u: { id: string }) => u.id === participantUserId,
      );
      const foundAdmin = res.body.find(
        (u: { id: string }) => u.id === adminUserId,
      );

      expect(foundParticipant).toBeDefined();
      expect(foundAdmin).toBeDefined();
    });
  });

  describe('GET /user/:id', () => {
    it('returns 401 Unauthorized if not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/user/${participantUserId}`)
        .expect(401);
    });

    it('returns 200 and user by id when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .get(`/user/${participantUserId}`)
        .set('Cookie', participantCookie)
        .expect(200);

      expect(res.body).toHaveProperty('id', participantUserId);
      expect(res.body).toHaveProperty('role', 'PARTICIPANT');
    });

    it('returns 404 Not Found when user does not exist', async () => {
      const res = await request(app.getHttpServer())
        .get('/user/non-existent-user-id')
        .set('Cookie', participantCookie)
        .expect(404);

      expect(res.body.message).toContain('not found');
    });
  });
});
