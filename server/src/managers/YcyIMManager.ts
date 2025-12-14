import { EventEmitter } from 'events';
import { YcyIMDeviceController } from '#app/controllers/ws/YcyIMDevice.js';
import { YcyIMConfig } from '#app/types/ycyim.js';
import { OnExit } from '#app/utils/onExit.js';
import { ServerContext } from '#app/types/server.js';

export interface YcyIMManagerEvents {
    clientConnected: [client: YcyIMDeviceController];
    clientDisconnected: [clientId: string];
}

/**
 * 役次元IM设备管理器
 * 管理所有通过役次元IM连接的设备
 */
export class YcyIMManager {
    private ctx!: ServerContext;

    private static _instance: YcyIMManager;

    private clientIdToClient: Map<string, YcyIMDeviceController> = new Map();

    private events = new EventEmitter<YcyIMManagerEvents>();

    static createInstance() {
        if (!this._instance) {
            this._instance = new YcyIMManager();

            // 添加退出处理
            OnExit.register(async () => {
                console.log('[YcyIMManager] 正在关闭所有连接...');
                await this._instance.destroy();
            });
        }
    }

    static get instance(): YcyIMManager {
        this.createInstance();
        return this._instance;
    }

    public async initialize(ctx: ServerContext): Promise<void> {
        this.ctx = ctx;
    }

    /**
     * 创建新的IM设备连接
     * @param clientId 客户端ID
     * @param config IM配置（uid和token）
     */
    public async createClient(clientId: string, config: YcyIMConfig): Promise<YcyIMDeviceController> {
        // 如果已存在连接，先关闭
        if (this.clientIdToClient.has(clientId)) {
            console.log(`[YcyIMManager] 关闭已存在的连接: ${clientId}`);
            await this.removeClient(clientId);
        }

        console.log(`[YcyIMManager] 创建新的IM连接: ${clientId}`);
        const client = new YcyIMDeviceController(this.ctx, clientId, config);

        try {
            await client.initialize();

            // 监听关闭事件
            client.once('close', () => {
                this.clientIdToClient.delete(clientId);
                this.events.emit('clientDisconnected', clientId);
            });

            this.clientIdToClient.set(clientId, client);
            this.events.emit('clientConnected', client);

            return client;
        } catch (error) {
            console.error(`[YcyIMManager] 创建连接失败: ${error}`);
            throw error;
        }
    }

    /**
     * 获取客户端
     */
    public getClient(clientId: string): YcyIMDeviceController | undefined {
        return this.clientIdToClient.get(clientId);
    }

    /**
     * 移除客户端
     */
    public async removeClient(clientId: string): Promise<void> {
        const client = this.clientIdToClient.get(clientId);
        if (client) {
            await client.close();
            this.clientIdToClient.delete(clientId);
        }
    }

    /**
     * 检查客户端是否存在
     */
    public hasClient(clientId: string): boolean {
        return this.clientIdToClient.has(clientId);
    }

    /**
     * 获取所有客户端ID
     */
    public getClientIds(): string[] {
        return Array.from(this.clientIdToClient.keys());
    }

    /**
     * 销毁管理器
     */
    public async destroy(): Promise<void> {
        const promises: Promise<any>[] = [];
        for (const client of this.clientIdToClient.values()) {
            promises.push(client.close());
        }

        try {
            await Promise.all(promises);
        } catch (error: any) {
            console.error('[YcyIMManager] 关闭连接失败:', error);
        }

        this.clientIdToClient.clear();
        this.events.removeAllListeners();
    }

    public on = this.events.on.bind(this.events);
    public once = this.events.once.bind(this.events);
    public off = this.events.off.bind(this.events);
    public removeAllListeners = this.events.removeAllListeners.bind(this.events);
}

YcyIMManager.createInstance();
