import { Message } from 'src/message/message.entity';
import { Room } from 'src/room/room.enitity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ default: 'active' })
  status: 'active' | 'inactive' = 'active';

  @Column({ select: false })
  password!: string;

  @Column({ nullable: true, select: false }) // select: false, чтобы не светить хеш везде
  hashedRefreshToken?: string;

  @ManyToMany(() => Room, (room) => room.users)
  rooms!: Room[];

  @OneToMany(() => Message, (message) => message.sender)
  messages!: Message[];

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
