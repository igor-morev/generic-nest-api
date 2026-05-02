import { Message } from 'src/message/message.entity';
import { User } from 'src/user/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @ManyToMany(() => User, (user) => user.rooms)
  @JoinTable({ name: 'room_users' }) // Указываем имя таблицы для связи
  users!: User[];

  // Связь с сообщениями (одна комната может иметь много сообщений)
  @OneToMany(() => Message, (message) => message.room, { cascade: true })
  messages!: Message[];
}
