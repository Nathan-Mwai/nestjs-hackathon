import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import {
  ArcjetGuard,
  ArcjetModule,
  fixedWindow,
  shield,
} from '@arcjet/nest';

@Global()
@Module({
  imports: [
    ArcjetModule.forRootAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isTest = process.env.NODE_ENV === 'test';
        const mode = isTest
          ? 'DRY_RUN'
          : (configService.get<string>('ARCJET_MODE') as 'LIVE' | 'DRY_RUN') || 'LIVE';

        return {
          key: configService.get<string>('ARCJET_KEY')!,
          rules: [
            // Global Shield protection against common attacks
            shield({
              mode,
            }),
            // Global Rate limiting (10 requests per 60s window)
            fixedWindow({
              mode,
              window: '60s',
              max: 10,
            }),
          ],
        };
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ArcjetGuard,
    },
  ],
  exports: [ArcjetModule],
})
export class ArcjetSecurityModule {}
