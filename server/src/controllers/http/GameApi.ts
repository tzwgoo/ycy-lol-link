import { Context } from 'koa';
import { LoLGameManager } from '#app/managers/LoLGameManager.js';
import { body, responses, routeConfig, z } from 'koa-swagger-decorator';
import { LoLGameEventType, DEFAULT_EVENT_TRIGGERS } from '#app/shared/types/index.js';

/**
 * API响应类型
 */
export type ApiResponseType = {
    status: number;
    code: string;
    message?: string;
} & Record<string, any>;

export function apiResponse(ctx: Context, data: ApiResponseType) {
    ctx.response.header['X-Api-Status'] = data.status;

    if (data.status === 0) {
        ctx.response.header['X-Api-Error-Code'] = data.code;
        ctx.response.header['X-Api-Error-Message'] = data.message;
    }

    ctx.body = data;
}

/**
 * 游戏API控制器
 * 用于外部程序控制游戏
 */
export class GameApiController {
    /**
     * 获取API信息
     */
    @routeConfig({
        method: 'get',
        path: '/api/game',
        summary: '获取游戏API信息',
        operationId: 'Get Game API Info',
        tags: ['Game'],
    })
    @responses(z.object({
        status: z.number(),
        code: z.string(),
        version: z.string(),
        eventTypes: z.array(z.string()),
    }))
    public async gameApiInfo(ctx: Context): Promise<void> {
        apiResponse(ctx, {
            status: 1,
            code: 'OK',
            version: '2.0.0',
            eventTypes: Object.values(LoLGameEventType),
        });
    }

    /**
     * 获取游戏状态
     */
    @routeConfig({
        method: 'get',
        path: '/api/game/:id',
        summary: '获取游戏状态',
        operationId: 'Get Game Status',
        tags: ['Game'],
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
    public async getGameStatus(ctx: Context): Promise<void> {
        const clientId = ctx.params.id;

        const game = LoLGameManager.instance.getGame(clientId);
        if (!game) {
            apiResponse(ctx, {
                status: 0,
                code: 'ERR::GAME_NOT_FOUND',
                message: '游戏不存在',
            });
            return;
        }

        apiResponse(ctx, {
            status: 1,
            code: 'OK',
            gameStatus: {
                deviceConnected: game.deviceConnected,
                lolConnected: game.lolConnected,
                inGame: game.inGame,
            },
        });
    }

    /**
     * 发送指令
     */
    @routeConfig({
        method: 'post',
        path: '/api/game/:id/command',
        summary: '发送游戏指令',
        operationId: 'Send Game Command',
        tags: ['Game'],
    })
    @body(z.object({
        commandId: z.number().min(0).max(6).describe('指令ID (0-6)'),
    }))
    @responses(z.object({
        status: z.number(),
        code: z.string(),
        message: z.string().optional(),
    }))
    public async sendCommand(ctx: Context): Promise<void> {
        const clientId = ctx.params.id;
        const { commandId } = ctx.request.body as { commandId: number };

        const game = LoLGameManager.instance.getGame(clientId);
        if (!game) {
            apiResponse(ctx, {
                status: 0,
                code: 'ERR::GAME_NOT_FOUND',
                message: '游戏不存在',
            });
            return;
        }

        if (!game.deviceConnected) {
            apiResponse(ctx, {
                status: 0,
                code: 'ERR::DEVICE_NOT_CONNECTED',
                message: '设备未连接',
            });
            return;
        }

        await game.sendCommand(commandId);

        apiResponse(ctx, {
            status: 1,
            code: 'OK',
        });
    }

    /**
     * 获取事件配置
     */
    @routeConfig({
        method: 'get',
        path: '/api/game/:id/triggers',
        summary: '获取事件触发配置',
        operationId: 'Get Event Triggers',
        tags: ['Game'],
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
    public async getEventTriggers(ctx: Context): Promise<void> {
        const clientId = ctx.params.id;

        const game = LoLGameManager.instance.getGame(clientId);
        if (!game) {
            apiResponse(ctx, {
                status: 0,
                code: 'ERR::GAME_NOT_FOUND',
                message: '游戏不存在',
            });
            return;
        }

        apiResponse(ctx, {
            status: 1,
            code: 'OK',
            triggers: game.getEventTriggers(),
        });
    }

    /**
     * 更新事件配置
     */
    @routeConfig({
        method: 'post',
        path: '/api/game/:id/triggers',
        summary: '更新事件触发配置',
        operationId: 'Update Event Triggers',
        tags: ['Game'],
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
    public async updateEventTriggers(ctx: Context): Promise<void> {
        const clientId = ctx.params.id;
        const { triggers } = ctx.request.body as { triggers: any[] };

        const game = LoLGameManager.instance.getGame(clientId);
        if (!game) {
            apiResponse(ctx, {
                status: 0,
                code: 'ERR::GAME_NOT_FOUND',
                message: '游戏不存在',
            });
            return;
        }

        game.updateEventTriggers(triggers);

        apiResponse(ctx, {
            status: 1,
            code: 'OK',
        });
    }

    /**
     * 启动LoL联动
     */
    @routeConfig({
        method: 'post',
        path: '/api/game/:id/lol/start',
        summary: '启动英雄联盟联动',
        operationId: 'Start LoL Integration',
        tags: ['Game'],
    })
    @responses(z.object({
        status: z.number(),
        code: z.string(),
        message: z.string().optional(),
    }))
    public async startLoL(ctx: Context): Promise<void> {
        const clientId = ctx.params.id;

        const game = LoLGameManager.instance.getGame(clientId);
        if (!game) {
            apiResponse(ctx, {
                status: 0,
                code: 'ERR::GAME_NOT_FOUND',
                message: '游戏不存在',
            });
            return;
        }

        game.startLoLIntegration();

        apiResponse(ctx, {
            status: 1,
            code: 'OK',
        });
    }

    /**
     * 停止LoL联动
     */
    @routeConfig({
        method: 'post',
        path: '/api/game/:id/lol/stop',
        summary: '停止英雄联盟联动',
        operationId: 'Stop LoL Integration',
        tags: ['Game'],
    })
    @responses(z.object({
        status: z.number(),
        code: z.string(),
        message: z.string().optional(),
    }))
    public async stopLoL(ctx: Context): Promise<void> {
        const clientId = ctx.params.id;

        const game = LoLGameManager.instance.getGame(clientId);
        if (!game) {
            apiResponse(ctx, {
                status: 0,
                code: 'ERR::GAME_NOT_FOUND',
                message: '游戏不存在',
            });
            return;
        }

        game.stopLoLIntegration();

        apiResponse(ctx, {
            status: 1,
            code: 'OK',
        });
    }
}
