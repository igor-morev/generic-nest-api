import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { MessageService } from './message.service';
import * as createMessageDto from './dto/create-message.dto';
import { JwtPayload } from 'src/auth/types/jwt';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('/:id')
  getMessages(@Param() params: { id: string }) {
    return this.messageService.findAll(params.id);
  }

  @Post('/create')
  sendMessage(
    @Request() req: { user: JwtPayload },
    @Body() params: createMessageDto.CreateMessageDto,
  ) {
    return this.messageService.createMessage({
      ...params,
      userId: req.user.sub,
    });
  }
}
