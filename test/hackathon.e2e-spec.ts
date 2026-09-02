import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/lib/database/prisma.service.js';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js';
import { formatValidationErrors } from '../src/common/utils/validation.util.js';

describe('HackathonModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let participantCookie: string[];
  let adminCookie: string[];
  let adminUserId: string;

  let createdHackathonId: string;

  const futureDate1 = new Date(Date.now() + 86400000 * 2).toISOString();
  const futureDate2 = new Date(Date.now() + 86400000 * 5).toISOString();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      bodyParser: false,
    });
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new ResponseInterceptor(reflector));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: (errors) =>
          new BadRequestException(formatValidationErrors(errors)),
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // 1. Create a regular participant user
    const participantEmail = `test-hack-part-${Date.now()}@example.com`;
    const password = 'Password123!';
    await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        email: participantEmail,
        password,
        name: 'Participant User',
      })
      .expect(200);

    const pSignInRes = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({
        email: participantEmail,
        password,
      })
      .expect(200);

    participantCookie = pSignInRes.headers['set-cookie'] as unknown as string[];

    // 2. Create an admin user
    const adminEmail = `test-hack-admin-${Date.now()}@example.com`;
    const aSignUpRes = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        email: adminEmail,
        password,
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
        password,
      })
      .expect(200);

    adminCookie = aSignInRes.headers['set-cookie'] as unknown as string[];
  });

  afterAll(async () => {
    if (prisma) {
      if (createdHackathonId) {
        await prisma.hackathon
          .deleteMany({
            where: { id: createdHackathonId },
          })
          .catch(() => {});
      }
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test-hack-',
          },
        },
      });
    }
    await app.close();
  });

  describe('Read operations (@AllowAnonymous)', () => {
    it('GET /hackathon is accessible anonymously', async () => {
      const res = await request(app.getHttpServer())
        .get('/hackathon')
        .expect(200);

      expect(res.body).toHaveProperty('statusCode', 200);
      expect(res.body).toHaveProperty('message', 'Success');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /hackathon/:id returns 404 for non-existent hackathon anonymously', async () => {
      await request(app.getHttpServer())
        .get('/hackathon/non-existent-id')
        .expect(404);
    });
  });

  describe('Role permissions for write operations', () => {
    it('POST /hackathon is forbidden (403) for non-admin participants', async () => {
      await request(app.getHttpServer())
        .post('/hackathon')
        .set('Cookie', participantCookie)
        .send({
          name: 'Unauthorized Hackathon',
          startsAt: futureDate1,
          endsAt: futureDate2,
        })
        .expect(403);
    });

    it('POST /hackathon is unauthorized (401) without authentication', async () => {
      await request(app.getHttpServer())
        .post('/hackathon')
        .send({
          name: 'Anonymous Hackathon',
          startsAt: futureDate1,
          endsAt: futureDate2,
        })
        .expect(401);
    });

    it('POST /hackathon succeeds for ADMIN, sets authorId to current user, and returns custom response message', async () => {
      const res = await request(app.getHttpServer())
        .post('/hackathon')
        .set('Cookie', adminCookie)
        .send({
          name: 'Google AI Hackathon',
          description: 'Build futuristic agents with Gemini',
          startsAt: futureDate1,
          endsAt: futureDate2,
          isActive: true,
        })
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.message).toBe('Hackathon created successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Google AI Hackathon');
      expect(res.body.data.authorId).toBe(adminUserId);

      createdHackathonId = res.body.data.id;
    });

    it('GET /hackathon/:id retrieves the created hackathon', async () => {
      const res = await request(app.getHttpServer())
        .get(`/hackathon/${createdHackathonId}`)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.data.id).toBe(createdHackathonId);
      expect(res.body.data.author.id).toBe(adminUserId);
    });

    it('PATCH /hackathon/:id is forbidden (403) for participants', async () => {
      await request(app.getHttpServer())
        .patch(`/hackathon/${createdHackathonId}`)
        .set('Cookie', participantCookie)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });

    it('PATCH /hackathon/:id succeeds for ADMIN with response message', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/hackathon/${createdHackathonId}`)
        .set('Cookie', adminCookie)
        .send({ name: 'Updated Hackathon Title' })
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.message).toBe('Hackathon updated successfully');
      expect(res.body.data.name).toBe('Updated Hackathon Title');
    });

    it('POST /hackathon/:id/join returns 401 if unauthenticated', async () => {
      await request(app.getHttpServer())
        .post(`/hackathon/${createdHackathonId}/join`)
        .expect(401);
    });

    it('POST /hackathon/:id/join returns 403 for ADMIN (Participant only)', async () => {
      await request(app.getHttpServer())
        .post(`/hackathon/${createdHackathonId}/join`)
        .set('Cookie', adminCookie)
        .expect(403);
    });

    it('POST /hackathon/:id/join returns 404 if hackathon not found', async () => {
      await request(app.getHttpServer())
        .post('/hackathon/non-existent-id/join')
        .set('Cookie', participantCookie)
        .expect(404);
    });

    it('POST /hackathon/:id/join succeeds for participant and returns participant record', async () => {
      const res = await request(app.getHttpServer())
        .post(`/hackathon/${createdHackathonId}/join`)
        .set('Cookie', participantCookie)
        .expect(201);

      expect(res.body.statusCode).toBe(201);
      expect(res.body.message).toBe('Successfully joined hackathon');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.hackathonId).toBe(createdHackathonId);
    });

    it('POST /hackathon/:id/join prevents duplicate joins and throws 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/hackathon/${createdHackathonId}/join`)
        .set('Cookie', participantCookie)
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toContain('already joined');
    });

    it('POST /hackathon/:id/join throws 400 if hackathon is not active', async () => {
      // Temporarily set hackathon isActive to false
      await prisma.hackathon.update({
        where: { id: createdHackathonId },
        data: { isActive: false },
      });

      const res = await request(app.getHttpServer())
        .post(`/hackathon/${createdHackathonId}/join`)
        .set('Cookie', participantCookie)
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toContain('not active');

      // Restore isActive
      await prisma.hackathon.update({
        where: { id: createdHackathonId },
        data: { isActive: true },
      });
    });

    it('POST /hackathon/:id/join throws 400 if hackathon has already ended', async () => {
      // Temporarily set endDate in past
      await prisma.hackathon.update({
        where: { id: createdHackathonId },
        data: { endDate: new Date(Date.now() - 86400000) },
      });

      const res = await request(app.getHttpServer())
        .post(`/hackathon/${createdHackathonId}/join`)
        .set('Cookie', participantCookie)
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toContain('already ended');

      // Restore endDate
      await prisma.hackathon.update({
        where: { id: createdHackathonId },
        data: { endDate: new Date(Date.now() + 86400000 * 5) },
      });
    });

    it('DELETE /hackathon/:id is forbidden (403) for participants', async () => {
      await request(app.getHttpServer())
        .delete(`/hackathon/${createdHackathonId}`)
        .set('Cookie', participantCookie)
        .expect(403);
    });

    it('DELETE /hackathon/:id succeeds for ADMIN with response message', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/hackathon/${createdHackathonId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.statusCode).toBe(200);
      expect(res.body.message).toBe('Hackathon deleted successfully');

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/hackathon/${createdHackathonId}`)
        .expect(404);
    });
  });
});
