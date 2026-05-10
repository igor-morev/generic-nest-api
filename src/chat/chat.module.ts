import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { RoomModule } from 'src/room/room.module';
import { MessageModule } from 'src/message/message.module';
import { UsersModule } from 'src/user/user.module';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [RoomModule, MessageModule, UsersModule, EventsModule],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
