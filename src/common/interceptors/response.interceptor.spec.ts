import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { ResponseInterceptor } from './response.interceptor.js';
import { ResponseMessage } from '../decorators/response-message.decorator.js';

describe('ResponseInterceptor', () => {
  it('should wrap response in { statusCode, message, data } with default "Success" message', async () => {
    const reflector = new Reflector();
    const interceptor = new ResponseInterceptor(reflector);

    const mockResponse = { statusCode: 200 };
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
      getHandler: () => vi.fn(),
      getClass: () => vi.fn(),
    } as unknown as ExecutionContext;

    const mockCallHandler: CallHandler = {
      handle: () => of({ foo: 'bar' }),
    };

    const result$ = interceptor.intercept(mockContext, mockCallHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({
      statusCode: 200,
      message: 'Success',
      data: { foo: 'bar' },
    });
  });

  it('should use custom message provided by @ResponseMessage', async () => {
    const reflector = new Reflector();
    const interceptor = new ResponseInterceptor(reflector);

    const handler = () => {};
    ResponseMessage('Custom success message')(handler);

    const mockResponse = { statusCode: 201 };
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
      getHandler: () => handler,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    const mockCallHandler: CallHandler = {
      handle: () => of(['item1', 'item2']),
    };

    const result$ = interceptor.intercept(mockContext, mockCallHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({
      statusCode: 201,
      message: 'Custom success message',
      data: ['item1', 'item2'],
    });
  });

  it('should handle primitive data types and null', async () => {
    const reflector = new Reflector();
    const interceptor = new ResponseInterceptor(reflector);

    const mockResponse = { statusCode: 200 };
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
      getHandler: () => vi.fn(),
      getClass: () => vi.fn(),
    } as unknown as ExecutionContext;

    const mockCallHandler: CallHandler = {
      handle: () => of('hello world'),
    };

    const result$ = interceptor.intercept(mockContext, mockCallHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({
      statusCode: 200,
      message: 'Success',
      data: 'hello world',
    });
  });
});
