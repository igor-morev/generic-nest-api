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

  async create(params: CreateRoomDto): Promise<Room> {
    const newRoom = this.roomRepository.create({
      name: params.name,
      type: params.type,
      users: params.users?.map((id) => ({ id })),
    });

    return this.roomRepository.save(newRoom);
  }

  isRoomExistsWithSameUsers(users: string[]) {
    return this.roomRepository
      .createQueryBuilder('room')
      .innerJoin('room.users', 'user')
      .where('user.id IN (:...ids)', { ids: users })
      .groupBy('room.id')
      .having('COUNT(user.id) = 2')
      .getOne();
  }

  async findDirectChat(userId: string, recipientId: string) {
    const result = await this.roomRepository
      .createQueryBuilder('room')
      .innerJoin('room.users', 'user')
      .where('room.type = :type', { type: 'direct' })
      .andWhere('user.id IN (:...ids)', { ids: [userId, recipientId] })
      .groupBy('room.id')
      .having('COUNT(user.id) = 2') // Убеждаемся, что именно эта пара
      .getOne();

    console.log('findDirectChat', result);

    return result;
  }

  findAll(): Promise<Room[]> {
    return this.roomRepository.find();
  }

  async findAllForUser(userId: string): Promise<Room[]> {
    return (
      this.roomRepository
        .createQueryBuilder('room')
        // Этот join нужен для фильтрации (проверки вашего участия в direct чатах)
        .leftJoin('room.users', 'participant')
        // Этот join загружает ВСЕХ пользователей комнаты в массив users
        .leftJoinAndSelect('room.users', 'allUsers')
        .where('room.type = :groupType', { groupType: 'group' })
        .orWhere('(room.type = :directType AND participant.id = :userId)', {
          directType: 'direct',
          userId,
        })
        .getMany()
    );
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
