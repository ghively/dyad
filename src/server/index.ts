import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws';

// Import platform shims first
import { ipcMain } from '../ipc/platform';
import { setBroadcaster } from '../ipc/platform_server';

// App logic
import { registerIpcHandlers } from '../ipc/ipc_host';
import { initializeDatabase } from '../db';
// Import cleanup if needed, but let's skip for MVP to avoid complexity if file missing
import { readSettings } from '../main/settings';

dotenv.config();

// Initialization
console.log('Initializing Dyad Server...');
try {
    initializeDatabase();
    registerIpcHandlers();
} catch (e) {
    console.error("Initialization error:", e);
}

const server = Fastify({ logger: true });

server.register(cors, { origin: '*' });
server.register(fastifyWebsocket);

const clients = new Set<WebSocket>();

const broadcast = (channel: string, ...args: any[]) => {
    const payload = JSON.stringify({ channel, args });
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
};

setBroadcaster(broadcast);

server.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    console.log('Client connected');
    clients.add(connection);

    connection.on('close', () => {
        console.log('Client disconnected');
        clients.delete(connection);
    });

    connection.on('message', (message: unknown) => {
        // Echo or handle
    });
  });
});

server.post('/api/ipc/:channel', async (request, reply) => {
    const { channel } = request.params as { channel: string };
    const body = request.body as any;
    // Client should send { args: [...] }
    const args = body && Array.isArray(body.args) ? body.args : [];

    // Retrieve handler from the mock ipcMain
    // @ts-ignore
    const handler = ipcMain._handlers.get(channel);

    if (!handler) {
        reply.code(404).send({ error: `Channel ${channel} not found` });
        return;
    }

    const event = {
        sender: {
            send: broadcast
        }
    };

    try {
        const result = await handler(event, ...args);
        return result === undefined ? null : result; // Fastify cannot send undefined
    } catch (err: any) {
        request.log.error(err);
        reply.code(500).send({ error: err.message });
    }
});

// Serve frontend build if exists
// Assuming vite build outputs to out/renderer/main_window/index.html
const frontendPath = path.resolve(__dirname, '../../out/renderer/main_window');
if (fs.existsSync(frontendPath)) {
    console.log('Serving frontend from:', frontendPath);
    server.register(fastifyStatic, {
        root: frontendPath,
        prefix: '/',
    });
    // SPA fallback
    server.setNotFoundHandler((req, reply) => {
        reply.sendFile('index.html');
    });
} else {
    console.warn('Frontend build not found at', frontendPath);
    server.get('/', async (req, reply) => {
        return { message: "Dyad API Server Running. Frontend not found. Run 'npm run package' to build frontend." };
    });
}

const start = async () => {
    try {
        const address = await server.listen({ port: 3000, host: '0.0.0.0' });
        console.log(`Server listening on ${address}`);

        // Log all registered routes
        console.log(server.printRoutes());

        // Keep process alive check
        setInterval(() => {
            console.log('Server heartbeat: process active');
        }, 5000);

    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
