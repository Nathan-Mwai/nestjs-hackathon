import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js';
import { ResponseMessage } from '../src/common/decorators/response-message.decorator.js';

@Controller('test-interceptor')
class TestInterceptorController {
  @Get('default')
  getDefault() {
    return { name: 'NestJS' };
  }

  @Get('custom')
  @ResponseMessage('Custom message retrieved')
  getCustom() {
    return [1, 2, 3];
  }
}

describe('ResponseInterceptor (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestInterceptorController],
    }).compile();

    app = moduleFixture.createNestApplication();
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new ResponseInterceptor(reflector));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('wraps response in { statusCode, message: "Success", data } by default', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-interceptor/default')
      .expect(200);

    expect(res.body).toEqual({
      statusCode: 200,
      message: 'Success',
      data: { name: 'NestJS' },
    });
  });

  it('uses message from @ResponseMessage decorator', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-interceptor/custom')
      .expect(200);

    expect(res.body).toEqual({
      statusCode: 200,
      message: 'Custom message retrieved',
      data: [1, 2, 3],
    });
  });
});
