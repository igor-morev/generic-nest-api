import { Injectable } from '@nestjs/common';
import { StartNewChatParams } from './types/chat-params';
import { RoomService } from 'src/room/room.service';
import { MessageService } from 'src/message/message.service';
import { UserService } from 'src/user/user.service';
import { JwtPayload } from 'src/auth/types/jwt';
import { EventsGateway } from 'src/events/events.gateway';

@Injectable()
export class ChatService {
  constructor(
    private messageService: MessageService,
    private roomService: RoomService,
    private userService: UserService,
    private eventsGateway: EventsGateway,
  ) {}

  async createNewChat(user: JwtPayload, params: StartNewChatParams) {
    const userId = user.sub;
    const userName = user.username;

    const recipientDto = await this.userService.findOneByUsername(
      params.userId,
    );

    if (!recipientDto) {
      return null;
    }

    const room = await this.roomService.create({
      name: `${userName}-${recipientDto.username}`,
      users: [userId, recipientDto.id],
      type: params.type,
    });

    if (!room) {
      return null;
    }

    const newMessage = await this.messageService.createMessage({
      roomId: room.id,
      content: params.initiateMeeting
        ? `${user.username} started meeting`
        : params.message,
      userId,
    });

    if (!newMessage) {
      return null;
    }

    if (params.initiateMeeting) {
      await this.eventsGateway.handleStartMeeting(userId, room.id, 'active');
    }

    return newMessage;
  }
}
