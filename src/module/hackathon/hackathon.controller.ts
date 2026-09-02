import { Controller } from '@nestjs/common';
import { HackathonService } from './hackathon.service.js';

@Controller('hackathon')
export class HackathonController {
  constructor(private readonly hackathonService: HackathonService) {}
}
