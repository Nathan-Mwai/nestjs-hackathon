import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ArcjetSecurityModule } from './lib/arcjet/arcjet.module.js';
import { auth } from './lib/auth/auth.js';
import { PrismaModule } from './lib/database/prisma.module.js';
import { UserModule } from './module/user/user.module.js';
import { HackathonModule } from './module/hackathon/hackathon.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule.forRoot({ auth, isGlobal: true }),
    ArcjetSecurityModule,
    PrismaModule,
    UserModule,
    HackathonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


