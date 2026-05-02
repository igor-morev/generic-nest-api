// import { UserDto } from 'src/user/dto/create-user.dto';

export interface MessageDto {
  id: string;
  content: string;
  sender: string;
  createdAt: string;
  updatedAt: string;
  roomId: string;
}

export interface CreateMessageDto {
  userId: string;
  roomId: string;
  content: string;
}

export type UpdateMessageDto = Partial<MessageDto>;
