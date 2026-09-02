import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  Body,
  Controller,
  INestApplication,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

function formatValidationErrors(
  errors: ValidationError[],
  parentProperty = '',
): Array<{ property: string; message: string }> {
  const result: Array<{ property: string; message: string }> = [];

  for (const error of errors) {
    const property = parentProperty
      ? `${parentProperty}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        result.push({ property, message });
      }
    }

    if (error.children && error.children.length > 0) {
      result.push(...formatValidationErrors(error.children, property));
    }
  }

  return result;
}

class CreateTestDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;
}

@Controller('test-validation')
class TestValidationController {
  @Post()
  create(@Body() dto: CreateTestDto) {
    return dto;
  }
}

describe('ValidationPipe formatting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestValidationController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: (errors: ValidationError[]) => {
          return new BadRequestException(formatValidationErrors(errors));
        },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 400 with clean array of { property, message } objects on invalid input', async () => {
    const res = await request(app.getHttpServer())
      .post('/test-validation')
      .send({
        name: '',
        email: 'invalid-email',
      })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.error).toBe('Bad Request');
    expect(Array.isArray(res.body.message)).toBe(true);

    const errors = res.body.message;
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'name',
          message: expect.any(String),
        }),
        expect.objectContaining({
          property: 'email',
          message: expect.any(String),
        }),
      ]),
    );
  });

  it('accepts valid input', async () => {
    const validData = {
      name: 'Hackathon Admin',
      email: 'admin@hackathon.com',
    };

    const res = await request(app.getHttpServer())
      .post('/test-validation')
      .send(validData)
      .expect(201);

    expect(res.body).toEqual(validData);
  });
});
