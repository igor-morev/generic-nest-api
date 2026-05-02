import { Room } from 'src/room/room.enitity';
import { User } from 'src/user/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // @Column()
  // roomId!: string;

  @Column({ type: 'text' })
  content!: string;

  // Многие сообщения принадлежат одному отправителю (User)
  @ManyToOne(() => User, (user) => user.messages, { onDelete: 'CASCADE' })
  sender!: User;

  // Явно объявляем колонку для ID
  @Column()
  roomId!: string;

  // Связываем её с объектом Room
  @ManyToOne(() => Room, (room) => room.messages)
  @JoinColumn({ name: 'roomId' }) // Указываем, что roomId — это внешний ключ
  room!: Room;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
