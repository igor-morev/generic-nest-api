export interface UserDto {
  id: string;
  firstName?: string;
  lastName?: string;
  status: 'active' | 'inactive';
  password: string;
  hashedRefreshToken?: string;
  username: string;
}

export type CreateUserDto = Omit<UserDto, 'id' | 'status'>;
export type UpdateUserDto = Partial<UserDto>;
