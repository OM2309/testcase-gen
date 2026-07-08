import { Server } from 'socket.io'

let io = null

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    socket.on('join-run', (runId) => {
      socket.join(`run:${runId}`)
    })
  })

  return io
}

export function getSocketIO() {
  return io
}
