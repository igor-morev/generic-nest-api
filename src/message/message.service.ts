import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { RoomService } from 'src/room/room.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private roomService: RoomService,
  ) {}

  async findAll(roomId: string): Promise<Message[]> {
    return await this.messageRepository.find({
      where: { roomId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  async createMessage(params: CreateMessageDto): Promise<Message | null> {
    await this.roomService.joinRoom(params.roomId, params.userId);
    const newMessage = this.messageRepository.create({
      content: params.content,
      sender: { id: params.userId },
      roomId: params.roomId,
    });

    await this.messageRepository.save(newMessage);

    return await this.messageRepository.findOne({
      where: {
        id: newMessage.id,
      },
      relations: ['sender'],
    });
  }
}
