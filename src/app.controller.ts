import { Controller, Get } from '@nestjs/common';
import {
  AllowAnonymous,
  Session,
  Roles,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @AllowAnonymous()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('me')
  getProfile(@Session() session: UserSession) {
    return { user: session.user };
  }

  @Roles(['PARTICIPANT'])
  @Get('participant')
  getParticipantOnly() {
    return { message: 'Participant area' };
  }

  @Roles(['ADMIN'])
  @Get('admin')
  getAdminOnly() {
    return { message: 'Admin area' };
  }
}
