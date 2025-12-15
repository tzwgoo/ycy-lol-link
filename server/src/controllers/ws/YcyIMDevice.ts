import { EventEmitter } from 'events';
import { YcyIMClient } from '#app/services/YcyIMClient.js';
import { YcyIMConfig, YcyIMMessage } from '#app/types/ycyim.js';
import { ServerContext } from '#app/types/server.js';

export interface YcyIMDeviceEvents {
    commandSent: [commandId: number];
    sdkLog: [type: 'request' | 'response', data: any];
    close: [];
}

/**
 * 基于役次元IM的设备控制器
 * 通过IM向役次元APP发送 game_cmd 指令
 */
export class YcyIMDeviceController {
    private ctx: ServerContext;
    private imClient: YcyIMClient;

    public clientId: string;
    public active: boolean = false;

    private events = new EventEmitter<YcyIMDeviceEvents>();

    constructor(ctx: ServerContext, clientId: string, config: YcyIMConfig) {
        this.ctx = ctx;
        this.clientId = clientId;
        this.imClient = new YcyIMClient(config);
    }

    /**
     * 初始化设备连接
     */
    public async initialize(): Promise<void> {
        // 初始化IM客户端
        await this.imClient.initialize();

        // 监听IM事件
        this.imClient.on('ready', () => {
            this.active = true;
            console.log(`[YcyIMDevice] 设备已连接: ${this.clientId}`);
        });

        this.imClient.on('close', () => {
            this.active = false;
            this.events.emit('close');
        });

        this.imClient.on('error', (error) => {
            console.error(`[YcyIMDevice] IM错误: ${error.message}`);
        });

        this.imClient.on('message', (message) => {
            this.handleIMMessage(message);
        });

        this.active = true;
        console.log(`[YcyIMDevice] 设备初始化完成: ${this.clientId}`);
    }

    /**
     * 处理接收到的IM消息
     */
    private handleIMMessage(message: YcyIMMessage): void {
        // 处理来自役次元的反馈消息
        if (message.code === 'feedback') {
            console.log('[YcyIMDevice] 收到反馈:', message);
        }
    }

    /**
     * 发送 game_cmd 指令
     * @param commandId 指令ID (0-6: miss, hit, bomb等)
     */
    public async sendGameCommand(commandId: number): Promise<void> {
        if (!this.active) {
            console.warn('[YcyIMDevice] 设备未连接，无法发送指令');
            return;
        }

        try {
            // 记录 SDK 请求参数（实际发送的完整消息格式）
            const requestData = {
                code: 'game_cmd',
                id: commandId.toString(),
                token: this.imClient.getToken(),
            };
            this.events.emit('sdkLog', 'request', requestData);
            console.log(`[YcyIMDevice] 发送 game_cmd 指令:`, requestData);

            // 发送指令并获取腾讯 IM SDK 的返回值
            const sdkResult = await this.imClient.sendGameInfo(commandId);

            // 记录 SDK 响应（腾讯 IM SDK 的实际返回值）
            this.events.emit('sdkLog', 'response', sdkResult);
            console.log(`[YcyIMDevice] SDK 返回值:`, sdkResult);

            this.events.emit('commandSent', commandId);
        } catch (error) {
            // 记录 SDK 响应（失败）
            const errorData = {
                success: false,
                commandId,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            };
            this.events.emit('sdkLog', 'response', errorData);
            console.error('[YcyIMDevice] 发送指令失败:', error);
            throw error;
        }
    }

    /**
     * 关闭连接
     */
    public async close(): Promise<void> {
        this.active = false;
        await this.imClient.destroy();
        this.events.emit('close');
    }

    /**
     * 销毁
     */
    public async destroy(): Promise<void> {
        await this.close();
        this.events.removeAllListeners();
    }

    public on = this.events.on.bind(this.events);
    public once = this.events.once.bind(this.events);
    public off = this.events.off.bind(this.events);
    public removeAllListeners = this.events.removeAllListeners.bind(this.events);
}
