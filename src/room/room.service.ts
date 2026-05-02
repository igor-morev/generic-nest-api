import { Injectable } from '@nestjs/common';
import { Room } from './room.enitity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoomDto } from './dto/room';
import { UserDto } from 'src/user/dto/create-user.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  create(params: CreateRoomDto): Promise<Room> {
    const newRoom = this.roomRepository.create({
      name: params.name,
    });

    return this.roomRepository.save(newRoom);
  }

  findAll(): Promise<Room[]> {
    return this.roomRepository.find();
  }

  findAllForUser(userId: string): Promise<Room[]> {
    return this.roomRepository.find({
      where: {
        users: {
          id: userId,
        },
      },
    });
  }

  async findOne(id: string): Promise<Room | null> {
    if (!id) {
      return null;
    }
    return await this.roomRepository.findOne({
      where: { id },
      relations: ['users'],
    });
  }

  async joinRoom(roomId: string, userId: string): Promise<void> {
    try {
      // 1. Проверяем, есть ли уже такая связь
      const isUserInRoom = await this.roomRepository
        .createQueryBuilder('room')
        .relation(Room, 'users')
        .of(roomId)
        .loadMany()
        .then((users) => users.some((user: UserDto) => user.id === userId));

      // 2. Если пользователя нет, добавляем его
      if (!isUserInRoom) {
        await this.roomRepository
          .createQueryBuilder()
          .relation(Room, 'users')
          .of(roomId)
          .add(userId);
      } else {
        console.log('Пользователь уже в комнате');
      }
    } catch (error) {
      console.error('joinRoom error', error);
      throw error; // Лучше пробрасывать ошибку дальше или возвращать статус
    }
  }
}
