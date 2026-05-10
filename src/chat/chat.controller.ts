import { Request, Body, Controller, Post } from '@nestjs/common';
import { JwtPayload } from 'src/auth/types/jwt';
import type { StartNewChatParams } from './types/chat-params';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('/new-chat')
  sendMessage(
    @Request() req: { user: JwtPayload },
    @Body() params: StartNewChatParams,
  ) {
    return this.chatService.createNewChat(req.user, params);
  }
}
