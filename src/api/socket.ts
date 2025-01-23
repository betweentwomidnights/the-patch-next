import type { Server as HTTPServer } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Socket as NetSocket } from 'net';
import type { Server as IOServer } from 'socket.io';
import { Server } from 'socket.io';
import audioStateManager from '../../audioStateManager';

interface SocketServer extends HTTPServer {
    io?: IOServer;
}

interface SocketWithIO extends NetSocket {
    server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
    socket: SocketWithIO;
}

const SocketHandler = (
    req: NextApiRequest,
    res: NextApiResponseWithSocket
): void => {
    if (res.socket.server.io) {
        res.end();
        return;
    }

    const io = new Server(res.socket.server);
    res.socket.server.io = io;
    
    audioStateManager.initializeSocket(res.socket.server);
    
    res.end();
};

export default SocketHandler;