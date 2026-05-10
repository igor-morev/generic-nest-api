import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { MessageModule } from 'src/message/message.module';
import { RoomModule } from 'src/room/room.module';
import { UsersModule } from 'src/user/user.module';

@Module({
  imports: [MessageModule, RoomModule, UsersModule],
  providers: [EventsGateway],
  exports: [EventsGateway]
})
export class EventsModule {}