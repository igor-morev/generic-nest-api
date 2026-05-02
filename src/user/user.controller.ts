import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { UserService } from './user.service';
import type { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/all')
  getAll() {
    return this.userService.findAll();
  }

  @Get('/:id')
  getOne(@Param() params: { id: string }) {
    return this.userService.findOne(params.id);
  }

  @Put('/:id')
  updateOne(
    @Param() params: { id: string },
    @Body() body: Partial<UpdateUserDto>,
  ) {
    return this.userService.update(params.id, body);
  }

  @Post('/')
  create(@Body() body: CreateUserDto) {
    const data = this.userService.create(body);

    return data;
  }

  @Delete('/:id')
  delete(@Param() params: { id: string }) {
    return this.userService.remove(params.id);
  }
}
