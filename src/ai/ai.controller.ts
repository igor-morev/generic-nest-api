import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import * as ai from './types/ai';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}
  @Post('/generate')
  create(@Body() body: ai.AIGenerationPayload) {
    return this.aiService.generate(body);
  }
}
