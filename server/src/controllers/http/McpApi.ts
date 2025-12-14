import Router from 'koa-router';
import { v4 as uuid } from 'uuid';
import { z } from 'koa-swagger-decorator';
import { routeConfig, responses, body } from 'koa-swagger-decorator';
import { PassThrough } from 'stream';

import { LoLGameManager } from '#app/managers/LoLGameManager.js';
import { LoLGameEventType } from '#app/shared/types/index.js';
import { LoLGameController } from '../game/LoLGameController.js';
import { LRUCache } from 'lru-cache';
import { firstHeader } from '#app/utils/utils.js';

type RouterContext = Router.RouterContext;

/**
 * MCP 连接类
 */
export class MCPConnection {
    public connectionId: string;
    public sessionId: string;
    public stream: PassThrough;
    public gameId?: string;
    public game?: LoLGameController;

    public constructor(connectionId: string, sessionId: string, stream: PassThrough) {
        this.connectionId = connectionId;
        this.sessionId = sessionId;
        this.stream = stream;
    }

    public sendEvent(eventName: string, data: any): void {
        this.stream.write(`event: ${eventName}\n`);
        this.stream.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    public close(): void {
        this.stream.end();
    }
}

/**
 * MCP API 控制器
 * 简化版，支持LoL事件触发系统
 */
export class MCPApiController {
    private static connections: LRUCache<string, MCPConnection> = new LRUCache({
        max: 100,
        ttl: 1000 * 60 * 30,
    });

    /**
     * SSE 连接端点
     */
    @routeConfig({
        method: 'get',
        path: '/api/mcp/:id/sse',
        summary: 'MCP SSE 连接',
        operationId: 'MCP SSE Connect',
        tags: ['MCP'],
    })
    public async sseConnect(ctx: RouterContext): Promise<void> {
        const gameId = ctx.params.id;
        const sessionId = firstHeader(ctx.request.headers['x-session-id']) || uuid();

        const game = await LoLGameManager.instance.getOrCreateGame(gameId);

        ctx.request.socket.setTimeout(0);
        ctx.request.socket.setNoDelay(true);
        ctx.request.socket.setKeepAlive(true);

        ctx.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        const stream = new PassThrough();
        ctx.body = stream;

        const connectionId = uuid();
        const connection = new MCPConnection(connectionId, sessionId, stream);
        connection.gameId = gameId;
        connection.game = game;

        MCPApiController.connections.set(connectionId, connection);

        // 发送初始状态
        connection.sendEvent('connected', {
            connectionId,
            gameId,
            status: {
                deviceConnected: game.deviceConnected,
                lolConnected: game.lolConnected,
                inGame: game.inGame,
            },
        });

        // 监听游戏事件
        const eventHandler = (eventType: LoLGameEventType, commandId: number) => {
            connection.sendEvent('eventTriggered', { eventType, commandId });
        };
        game.on('eventTriggered', eventHandler);

        // 清理
        ctx.req.on('close', () => {
            game.off('eventTriggered', eventHandler);
            MCPApiController.connections.delete(connectionId);
        });
    }

    /**
     * 发送指令
     */
    @routeConfig({
        method: 'post',
        path: '/api/mcp/:id/command',
        summary: 'MCP - 发送游戏指令',
        operationId: 'MCP Send Command',
        tags: ['MCP'],
    })
    @body(z.object({
        commandId: z.number().min(0).max(6).describe('指令ID (0-6)'),
    }))
    @responses(z.object({
        status: z.number(),
        code: z.string(),
        message: z.string().optional(),
    }))
    public async sendCommand(ctx: RouterContext): Promise<void> {
        const clientId = ctx.params.id;
        const { commandId } = ctx.request.body as { commandId: number };

        const game = LoLGameManager.instance.getGame(clientId);
        if (!game) {
            ctx.body = {
                status: 0,
                code: 'ERR::GAME_NOT_FOUND',
                message: '游戏不存在',
            };
            return;
        }

        if (!game.deviceConnected) {
            ctx.body = {
                status: 0,
                code: 'ERR::DEVICE_NOT_CONNECTED',
                message: '设备未连接',
            };
            return;
        }

        await game.sendCommand(commandId);

        ctx.body = {
            status: 1,
            code: 'OK',
        };
    }

    /**
     * 获取游戏状态
     */
    @routeConfig({
        method: 'get',
        path: '/api/mcp/:id/status',
        summary: 'MCP - 获取游戏状态',
        operationId: 'MCP Get Status',
        tags: ['MCP'],
    })
    @responses(z.object({
        status: z.number(),
        code: z.string(),
        gameStatus: z.object({
            deviceConnected: z.boolean(),
            lolConnected: z.boolean(),
            inGame: z.boolean(),
        }).optional(),
    }))
    public async getStatus(ctx: RouterContext): Promise<void> {
        const clientId = ctx.params.id;

        const game = LoLGameManager.instance.getGame(clientId);
        if (!game) {
            ctx.body = {
                status: 0,
                code: 'ERR::GAME_NOT_FOUND',
                message: '游戏不存在',
            };
            return;
        }

        ctx.body = {
            status: 1,
            code: 'OK',
            gameStatus: {
                deviceConnected: game.deviceConnected,
                lolConnected: game.lolConnected,
                inGame: game.inGame,
            },
        };
    }

    /**
     * 获取事件配置
     */
    @routeConfig({
        method: 'get',
        path: '/api/mcp/:id/triggers',
        summary: 'MCP - 获取事件触发配置',
        operationId: 'MCP Get Event Triggers',
        tags: ['MCP'],
    })
    @responses(z.object({
        status: z.number(),
        code: z.string(),
        triggers: z.array(z.object({
            eventType: z.string(),
            enabled: z.boolean(),
            commandId: z.number(),
        })).optional(),
    }))
    public async getEventTriggers(ctx: RouterContext): Promise<void> {
        const clientId = ctx.params.id;

        const game = LoLGameManager.instance.getGame(clientId);
        if (!game) {
            ctx.body = {
                status: 0,
                code: 'ERR::GAME_NOT_FOUND',
                message: '游戏不存在',
            };
            return;
        }

        ctx.body = {
            status: 1,
            code: 'OK',
            triggers: game.getEventTriggers(),
        };
    }

    /**
     * 更新事件配置
     */
    @routeConfig({
        method: 'post',
        path: '/api/mcp/:id/triggers',
        summary: 'MCP - 更新事件触发配置',
        operationId: 'MCP Update Event Triggers',
        tags: ['MCP'],
    })
    @body(z.object({
        triggers: z.array(z.object({
            eventType: z.nativeEnum(LoLGameEventType),
            enabled: z.boolean(),
            commandId: z.number().min(0).max(6),
        })),
    }))
    @responses(z.object({
        status: z.number(),
        code: z.string(),
        message: z.string().optional(),
    }))
    public async updateEventTriggers(ctx: RouterContext): Promise<void> {
        const clientId = ctx.params.id;
        const { triggers } = ctx.request.body as { triggers: any[] };

        const game = LoLGameManager.instance.getGame(clientId);
        if (!game) {
            ctx.body = {
                status: 0,
                code: 'ERR::GAME_NOT_FOUND',
                message: '游戏不存在',
            };
            return;
        }

        game.updateEventTriggers(triggers);

        ctx.body = {
            status: 1,
            code: 'OK',
        };
    }
}
