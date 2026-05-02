// import { UserDto } from 'src/user/dto/create-user.dto';

export interface RoomDto {
  id: string;
  name: string;
  users: string[];
}

export type CreateRoomDto = Omit<RoomDto, 'id'>;
export type UpdateMessageDto = Partial<RoomDto>;
