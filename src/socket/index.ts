import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { isValidObjectId } from 'mongoose';
import { env } from '../config/env';

let io: Server | null = null;

export const rooms = {
  admin: 'admins',
  order: (id: string) => `order:${id}`,
};

export function initSocket(server: HttpServer): Server {
  io = new Server(server, { cors: { origin: env.corsOrigins, credentials: true } });

  io.on('connection', (socket) => {
    // Customer tracks a single order's status.
    socket.on('order:subscribe', (orderId: unknown) => {
      if (typeof orderId === 'string' && isValidObjectId(orderId)) socket.join(rooms.order(orderId));
    });
    socket.on('order:unsubscribe', (orderId: unknown) => {
      if (typeof orderId === 'string') socket.leave(rooms.order(orderId));
    });
    // Admin dashboard receives new orders; requires a valid admin JWT.
    socket.on('admin:subscribe', (token: unknown) => {
      try {
        if (typeof token !== 'string') return;
        jwt.verify(token, env.jwtSecret);
        socket.join(rooms.admin);
      } catch {
        socket.emit('admin:error', 'Invalid token');
      }
    });
  });

  return io;
}

export function emit(room: string, event: string, payload: unknown): void {
  io?.to(room).emit(event, payload);
}
