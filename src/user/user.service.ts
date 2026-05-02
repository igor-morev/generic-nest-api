import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User | null> {
    if (!id) {
      return null;
    }
    return await this.userRepository.findOneBy({ id });
  }

  async findOneByUsername(username: string): Promise<User | null> {
    if (!username) {
      return null;
    }
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.username = :username', { username })
      .addSelect('user.password') // <--- Вот это принудительно достанет пароль
      .getOne();
  }

  async findOneWithHash(userId: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id: userId })
      .addSelect('user.hashedRefreshToken')
      .getOne();
  }

  async create(userDto: CreateUserDto): Promise<User> {
    const newUser = this.userRepository.create(userDto);

    return await this.userRepository.save(newUser);
  }

  async update(data: string | string[], user: UpdateUserDto) {
    return await this.userRepository.update(data, user);
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }
}
