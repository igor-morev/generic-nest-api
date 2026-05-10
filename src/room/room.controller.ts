import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { RoomService } from './room.service';
import * as room from './dto/room';
import { JwtPayload } from 'src/auth/types/jwt';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post('/create')
  create(@Body() params: room.CreateRoomDto) {
    return this.roomService.create(params);
  }

  @Get('/all')
  getAll() {
    return this.roomService.findAll();
  }

  @Get('/all/user')
  getAllByUser(@Request() req: { user: JwtPayload }) {
    return this.roomService.findAllForUser(req.user.sub);
  }

  @Get('/:id')
  getOne(@Param() params: { id: string }) {
    return this.roomService.findOne(params.id);
  }

  @Get('/direct/:userId')
  getDirectRoom(
    @Request() req: { user: JwtPayload },
    @Param() params: { userId: string },
  ) {
    return this.roomService.findDirectChat(req.user.sub, params.userId);
  }
}
