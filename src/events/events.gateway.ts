import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtPayload } from 'src/auth/types/jwt';
import * as createMessageDto from 'src/message/dto/create-message.dto';
import { MessageService } from 'src/message/message.service';
import { Room } from 'src/room/room.enitity';
import { RoomService } from 'src/room/room.service';
import { UserService } from 'src/user/user.service';
import { URL } from 'url';

import { Server, WebSocket } from 'ws';

export type SocketEventType =
  | 'message'
  | 'typing'
  | 'presence'
  | 'video-signal'
  | 'meeting_invitation'
  | 'start_meeting'
  | 'leave_meeting'
  | 'join_meeting'
  | 'meeting_user_joined'
  | 'meeting_user_left'
  | 'stop_meeting'
  | 'meeting_ended';

interface ActiveMeeting {
  room: Room;
  host: any; // Данные хоста (UserDto)
  meetingLink: string;
  status: 'active' | 'inactive';
  createdAt: number;
}

@WebSocketGateway({
  cors: {
    origin: [process.env.FRONTEND_URL],
  },
  // Путь должен совпадать с тем, что вы указали в proxy.conf.json
  path: '/ws',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private activeConnections = new Map<string, WebSocket>();
  private activeMeetings = new Map<string, ActiveMeeting>();

  constructor(
    private readonly messageService: MessageService,
    private readonly roomService: RoomService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @WebSocketServer() server!: Server;

  async handleConnection(client: WebSocket, request: any) {
    try {
      // 1. Верификация токена (у вас уже есть)
      const url = new URL(request.url, this.configService.get('FRONTEND_URL'));
      const token = url.searchParams.get('token');
      if (!token) return client.terminate();

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      (client as any).user = payload;
      this.activeConnections.set(payload.sub, client);

      console.log(`User ${payload.username} connected`);

      // 2. ЛОГИКА "ДОГОНЯЮЩЕГО" УВЕДОМЛЕНИЯ
      // Получаем из БД все комнаты, в которых состоит этот пользователь
      const userRooms = await this.roomService.findAllForUser(payload.sub);

      for (const room of userRooms) {
        // Проверяем, идет ли в этой комнате активный созвон
        const activeMeeting = this.activeMeetings.get(room.id);

        if (activeMeeting && activeMeeting.status === 'active') {
          // Если звонок активен и пользователь не является его хостом
          // (хосту уведомление обычно не нужно, он уже там)
          if (activeMeeting.host.id !== payload.sub) {
            const invitation = JSON.stringify({
              event: 'meeting_invitation',
              payload: activeMeeting,
            });

            client.send(invitation);
            console.log(
              `Sent catch-up invitation to ${payload.username} for room ${room.id}`,
            );
          }
        }
      }
    } catch (e) {
      client.terminate();
    }
  }

  async handleDisconnect(ws: WebSocket) {
    const user = (ws as any).user;
    if (!user) return;

    const userId = user.sub;
    this.activeConnections.delete(userId);

    // Проходим по активным встречам, чтобы понять, в каких комнатах состоял юзер
    for (const [roomId, meeting] of this.activeMeetings.entries()) {
      // Проверяем через ваш RoomService или по списку участников, был ли он в этой комнате
      const room = await this.roomService.findOne(roomId);

      if (room && room.users.some((u) => u.id === userId)) {
        // Уведомляем остальных, что сокет пользователя закрылся
        const leaveNotification = {
          event: 'meeting_user_left' as SocketEventType,
          payload: {
            user: { id: userId, username: user.username },
            roomId,
          },
        };

        // Рассылаем всем в этой комнате, кроме самого отключившегося
        room.users.forEach((participant) => {
          if (participant.id !== userId) {
            this.emit(participant.id, leaveNotification);
          }
        });
      }
    }

    console.log(
      `User ${user.username} disconnected and removed from active sessions.`,
    );
  }

  @SubscribeMessage<SocketEventType>('message')
  async handleChatMessageEvent(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: createMessageDto.CreateMessageDto,
  ) {
    const userId = (client as any).user.sub;

    console.log('Received from frontend:', data);

    const newMessageDto = await this.messageService.createMessage({
      ...data,
      userId,
    });

    const response = JSON.stringify({
      event: 'message',
      payload: { ...newMessageDto, from: 'Remote' },
    });

    this.broadcast(client, response);

    return {
      event: 'message',
      payload: { ...newMessageDto, from: 'Remote' },
    };
  }

  @SubscribeMessage<SocketEventType>('start_meeting')
  async handleStartMeetingEvent(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = (client as any).user.sub as string;

    console.log('Received start meeting message from frontend:', data, userId);

    await this.handleStartMeeting(userId, data.roomId, 'active');
  }

  @SubscribeMessage('get_room_info')
  async handleGetRoomInfo(@MessageBody() data: { roomId: string }) {
    const meeting = this.activeMeetings.get(data.roomId);
    if (!meeting)
      return { event: 'room_info_response', payload: { status: 'inactive' } };

    // Получаем список участников комнаты из БД
    const room = await this.roomService.findOne(data.roomId);

    // Фильтруем только тех, кто реально подключен по сокету прямо сейчас
    const onlineUsers = room?.users
      .filter((user) => this.activeConnections.has(user.id))
      .map((user) => user.id);

    return {
      event: 'room_info_response',
      payload: {
        ...meeting,
        onlineUsers, // Добавляем список ID тех, кто в сети
      },
    };
  }

  @SubscribeMessage<SocketEventType>('leave_meeting')
  async handleLeaveMeetingEvent(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: any,
  ) {
    const userId = (client as any).user.sub;

    console.log('Received leave meeting message from frontend:', data, userId);

    await this.handleLeaveMeeting(userId, data.roomId);
  }

  // 2. Хост завершает звонок для всех
  @SubscribeMessage<SocketEventType>('stop_meeting')
  async handleStopMeetingEvent(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = (client as any).user.sub;
    const meeting = this.activeMeetings.get(data.roomId);

    // Проверяем, что именно хост пытается завершить звонок
    if (meeting && meeting.host.id === userId) {
      // Уведомляем всех в комнате, что звонок окончен
      await this.broadcastToRoom(data.roomId, userId, 'meeting_ended', {
        roomId: data.roomId,
      });

      // 2. Отзываем приглашение у всех (чтобы скрыть модалку)
      // Используем тот же метод рассылки, но со статусом 'inactive'
      const room = await this.roomService.findOne(data.roomId);
      if (room) {
        const invitationCancel = {
          event: 'meeting_invitation' as SocketEventType,
          payload: {
            ...meeting, // передаем старые данные, но меняем статус
            status: 'inactive',
          },
        };

        room.users.forEach((user) => {
          this.emit(user.id, invitationCancel);
        });
      }

      // Удаляем из памяти сервера
      this.activeMeetings.delete(data.roomId);
      console.log(`Meeting ${data.roomId} stopped by host`);
    }
  }

  @SubscribeMessage<SocketEventType>('join_meeting')
  async handleJoinMeetingEvent(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: any,
  ) {
    const userId = (client as any).user.sub as string;

    const userDto = await this.userService.findOne(userId);

    console.log('Received join meeting message from frontend:', data, userId);

    this.emit(data.hostId, {
      event: 'meeting_user_joined',
      payload: {
        user: userDto,
        roomId: data.roomId,
      },
    });
  }

  // --- WEBRTC SIGNALING (VIDEO CALL) ---
  @SubscribeMessage<SocketEventType>('video-signal')
  handleVideoSignal(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: unknown,
  ) {
    // Relay signaling data (offer/answer/candidates)

    const response = JSON.stringify({
      event: 'video-signal',
      payload: data,
    });
    this.broadcast(client, response);
  }

  async handleStartMeeting(
    senderId: string,
    roomId: string,
    status: 'active' | 'inactive',
  ) {
    // 1. Получаем комнату из базы, чтобы знать список участников
    const room = await this.roomService.findOne(roomId);
    if (!room) return;

    const senderDto = room.users.find((user) => user.id === senderId)!;

    if (status === 'active') {
      // 2. Генерируем ссылку (в продакшене возьмите домен из .env)
      const baseUrl =
        this.configService.get('FRONTEND_URL') || 'https://localhost:4201';
      const meetingLink = `${baseUrl}/stream/meeting/${roomId}`;

      // 3. Сохраняем встречу в память сервера
      const meetingData: ActiveMeeting = {
        room,
        host: senderDto,
        meetingLink,
        status: 'active',
        createdAt: Date.now(),
      };

      this.activeMeetings.set(roomId, meetingData);

      // 4. Формируем событие для рассылки
      const invitation = {
        event: 'meeting_invitation' as SocketEventType,
        payload: meetingData,
      };

      console.log(room);

      room.users.forEach((user) => {
        if (user.id !== senderId) {
          this.emit(user.id, invitation);
        }
      });

      console.log(
        `Meeting started in room ${room.name}. Type: ${meetingData.room.type}`,
      );
    } else {
      // Если статус inactive — удаляем встречу из памяти
      this.activeMeetings.delete(roomId);
    }
  }

  async handleLeaveMeeting(senderId: string, roomId: string) {
    const userDto = await this.userService.findOne(senderId);

    // 1. Формируем сообщение о выходе
    const leaveNotification = JSON.stringify({
      event: 'meeting_user_left' as SocketEventType,
      payload: { user: userDto, roomId },
    });

    // 2. Получаем список участников комнаты из БД или памяти
    // Допустим, мы берем их из базы через ваш roomService

    const room = await this.roomService.findOne(roomId);

    if (!room) return;

    room.users.forEach((user) => {
      // Отправляем всем, кроме того, кто вышел
      if (user.id !== senderId) {
        const recipientSocket = this.activeConnections.get(user.id);
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          recipientSocket.send(leaveNotification);

          console.log('send user left event');
        }
      }
    });

    // 3. Если вышедший был хостом, можно очистить активный митинг (опционально)
    // if (this.activeMeetings.get(roomId) === senderId) {
    //   this.activeMeetings.delete(roomId);
    // }
  }

  // Helper to send to others (Simulating socket.io's broadcast)
  private broadcast(frontendWSClient: WebSocket, message: string) {
    this.server.clients.forEach((client) => {
      if (client !== frontendWSClient && client.readyState === WebSocket.OPEN) {
        // 1 = OPEN
        client.send(message);
      }
    });
  }

  private async broadcastToRoom(
    roomId: string,
    senderId: string,
    event: SocketEventType,
    payload: any,
  ) {
    // 1. Получаем актуальный список участников комнаты из базы
    const room = await this.roomService.findOne(roomId);
    if (!room || !room.users) return;

    const message = JSON.stringify({
      event,
      payload,
    });

    // 2. Проходим по всем пользователям комнаты
    room.users.forEach((user) => {
      // Отправляем всем участникам, КРОМЕ отправителя
      if (user.id !== senderId) {
        const recipientSocket = this.activeConnections.get(user.id);

        // Проверяем, что сокет существует и соединение открыто
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          recipientSocket.send(message);
        }
      }
    });
  }

  private emit<T>(
    targetId: string,
    event: { event: SocketEventType; payload: T },
  ) {
    const message = JSON.stringify({
      event: event.event,
      payload: event.payload,
    });

    const recipientSocket = this.activeConnections.get(targetId);
    if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
      recipientSocket.send(message);
    }
  }
}
