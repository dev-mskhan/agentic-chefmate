import type { Socket, Server } from 'socket.io'
import type { FastifyInstance } from 'fastify'
import type Redis from 'ioredis'
import { handleJoinThread }  from './join-thread'
import { handleLeaveThread } from './leave-thread'
import { handleSendMessage } from './send-message'
import { handleMarkRead }    from './mark-read'
import { handleTypingStart, handleTypingStop } from './typing'

export function registerHandlers(
  socket: Socket,
  io: Server,
  fastify: FastifyInstance,
): void {
  const redis = fastify.redis as Redis

  socket.on('joinThread',       (data) => void handleJoinThread(socket, data))
  socket.on('leaveThread',      (data) => void handleLeaveThread(socket, data))
  socket.on('sendMessage',      (data) => void handleSendMessage(socket, io, redis, data))
  socket.on('markMessagesRead', (data) => void handleMarkRead(socket, io, data))
  socket.on('typing:start',     (data) => handleTypingStart(socket, data))
  socket.on('typing:stop',      (data) => handleTypingStop(socket, data))
}
