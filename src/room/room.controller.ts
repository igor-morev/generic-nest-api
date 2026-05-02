import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoomService } from './room.service';
import * as room from './dto/room';

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

  @Get('/:id')
  getOne(@Param() params: { id: string }) {
    return this.roomService.findOne(params.id);
  }
}
