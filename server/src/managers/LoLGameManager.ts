import { LRUCache } from "lru-cache";
import { LoLGameController } from "#app/controllers/game/LoLGameController.js";
import { YcyIMDeviceController } from "#app/controllers/ws/YcyIMDevice.js";
import { YcyIMManager } from "./YcyIMManager.js";
import { ExEventEmitter } from "#app/utils/ExEventEmitter.js";
import { ServerContext } from "#app/types/server.js";
import { YcyIMConfig } from "#app/types/ycyim.js";
import type { LoLEventTriggerConfig } from "#app/shared/types/index.js";

export interface LoLGameManagerEvents {
    /** 游戏创建 */
    gameCreated: [game: LoLGameController];
    /** 游戏销毁 */
    gameDestroyed: [clientId: string];
}

export class LoLGameManager {
    private ctx!: ServerContext;

    private static _instance: LoLGameManager;

    private games: Map<string, LoLGameController>;

    private events = new ExEventEmitter<LoLGameManagerEvents>();

    /**
     * 缓存游戏配置信息，用于在断线重连时恢复游戏状态
     */
    public configCache: LRUCache<string, any> = new LRUCache({
        max: 1000,
        ttl: 1000 * 60 * 30, // 30 minutes
    });

    constructor() {
        this.games = new Map();
    }

    public static createInstance() {
        if (!this._instance) {
            this._instance = new LoLGameManager();
        }
    }

    public static get instance() {
        this.createInstance();
        return this._instance;
    }

    public async initialize(ctx: ServerContext): Promise<void> {
        this.ctx = ctx;
        await YcyIMManager.instance.initialize(ctx);
    }

    /**
     * 通过役次元IM连接设备
     * @param clientId 客户端ID
     * @param config IM配置
     */
    public async connectViaYcyIM(clientId: string, config: YcyIMConfig): Promise<LoLGameController> {
        // 创建YcyIM设备控制器
        const device = new YcyIMDeviceController(this.ctx, clientId, config);
        await device.initialize();

        // 获取或创建游戏控制器
        const game = await this.getOrCreateGame(clientId);

        // 绑定设备
        await game.bindDevice(device);

        return game;
    }

    /**
     * 创建新的游戏控制器
     */
    public async createGame(clientId: string): Promise<LoLGameController> {
        const game = new LoLGameController(this.ctx, clientId);
        await game.initialize();

        // 从缓存恢复配置
        const cachedConfig = this.configCache.get(`lol:${clientId}:triggers`);
        if (cachedConfig) {
            game.updateEventTriggers(cachedConfig as LoLEventTriggerConfig[]);
        }

        game.once('close', () => {
            // 保存配置到缓存
            this.configCache.set(`lol:${clientId}:triggers`, game.getEventTriggers());
            this.games.delete(clientId);
            this.events.emit('gameDestroyed', clientId);
        });

        this.games.set(clientId, game);
        this.events.emit('gameCreated', game);

        return game;
    }

    public getGame(clientId: string): LoLGameController | undefined {
        return this.games.get(clientId);
    }

    public async getOrCreateGame(clientId: string): Promise<LoLGameController> {
        let game = this.getGame(clientId);
        if (!game) {
            game = await this.createGame(clientId);
        }

        return game;
    }

    public getGameList(): IterableIterator<LoLGameController> {
        return this.games.values();
    }

    public on = this.events.on.bind(this.events);
    public once = this.events.once.bind(this.events);
    public off = this.events.off.bind(this.events);
    public removeAllListeners = this.events.removeAllListeners.bind(this.events);
}

LoLGameManager.createInstance();
