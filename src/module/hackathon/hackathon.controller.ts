import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AllowAnonymous,
  AuthGuard,
  Roles,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { CreateHackathonDto, UpdateHackathonDto } from './dto/index.js';
import { HackathonService } from './hackathon.service.js';

@UseGuards(AuthGuard)
@Controller('hackathon')
export class HackathonController {
  constructor(private readonly hackathonService: HackathonService) {}

  @Roles(['ADMIN'])
  @ResponseMessage('Hackathon created successfully')
  @Post()
  create(
    @Body() createHackathonDto: CreateHackathonDto,
    @Session() session: UserSession,
  ) {
    return this.hackathonService.create(createHackathonDto, session.user.id);
  }

  @AllowAnonymous()
  @Get()
  findAll() {
    return this.hackathonService.findAll();
  }

  @AllowAnonymous()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hackathonService.findOne(id);
  }

  @Roles(['ADMIN'])
  @ResponseMessage('Hackathon updated successfully')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateHackathonDto: UpdateHackathonDto,
  ) {
    return this.hackathonService.update(id, updateHackathonDto);
  }

  @Roles(['ADMIN'])
  @ResponseMessage('Hackathon deleted successfully')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.hackathonService.remove(id);
  }
}
