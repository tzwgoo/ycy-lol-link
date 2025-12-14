import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { AsyncWebSocket } from '#app/utils/WebSocketAsync.js';
import { EventStore } from '#app/utils/EventStore.js';
import { LoLGameManager } from '#app/managers/LoLGameManager.js';
import { LoLGameController } from '../game/LoLGameController.js';
import { SiteNotificationService } from '#app/services/SiteNotificationService.js';
import { ServerContext } from '#app/types/server.js';
import type { LoLEventTriggerConfig, LoLGameEventType } from '#app/shared/types/index.js';

export type WebWSPostMessage = {
    event: string;
    requestId?: string;
    data?: any;
};

export interface WebWSClientEvents {
    close: [];
};

export class WebWSClient {
    private ctx: ServerContext;

    public socket: AsyncWebSocket;

    public clientId: string = '';
    public socketId: string = uuidv4();

    public events = new EventEmitter<WebWSClientEvents>();

    private eventStore = new EventStore();
    private gameEventStore = new EventStore();
    private heartbeatTask: NodeJS.Timeout | null = null;
    private prevHeartbeatTime: number | null = null;

    private gameInstance: LoLGameController | null = null;

    public constructor(ctx: ServerContext, socket: AsyncWebSocket) {
        this.ctx = ctx;
        this.socket = socket;
    }

    public async initialize(): Promise<void> {
        this.bindEvents();

        // 发送站点通知
        const siteNotifications = SiteNotificationService.instance.getNotifications();
        for (const notification of siteNotifications) {
            await this.send({
                event: 'remoteNotification',
                data: notification,
            });
        }

        this.heartbeatTask = setInterval(() => this.taskHeartbeat(), 15000);
    }

    public async send(data: WebWSPostMessage): Promise<void> {
        try {
            await this.socket.sendAsync(JSON.stringify(data));
        } catch (error) {
            console.error("Failed to send message:", error);
            this.close();
        }
    }

    public async sendResponse(requestId: string, data: any): Promise<void> {
        await this.send({
            event: 'response',
            requestId,
            data,
        });
    }

    public bindEvents() {
        const socketEvents = this.eventStore.wrap(this.socket);
        const siteNotificationEvents = this.eventStore.wrap(SiteNotificationService.instance);

        socketEvents.on("message", async (data, isBinary) => {
            if (isBinary) {
                return; // Ignore binary data
            }

            const message = JSON.parse(data.toString());

            await this.handleMessage(message);
        });

        socketEvents.on("error", (error) => {
            console.error("WebSocket error:", error);
        });

        socketEvents.on("close", () => {
            this.events.emit("close");

            this.destory();
        });

        // 监听站点通知更新事件
        siteNotificationEvents.on("newNotification", async (notification) => {
            await this.send({
                event: 'remoteNotification',
                data: notification,
            });
        });
    }

    private async handleMessage(message: any) {
        if (!message.action || !message.requestId) {
            console.log("Invalid message: " + JSON.stringify(message));
            return;
        }

        try {
            switch (message.action) {
                case 'bindClient':
                    await this.handleBindClient(message);
                    break;
                case 'startLoL':
                    await this.handleStartLoL(message);
                    break;
                case 'stopLoL':
                    await this.handleStopLoL(message);
                    break;
                case 'updateEventTriggers':
                    await this.handleUpdateEventTriggers(message);
                    break;
                case 'sendCommand':
                    await this.handleSendCommand(message);
                    break;
                case 'heartbeat':
                    this.prevHeartbeatTime = Date.now();
                    break;
                default:
                    await this.sendResponse(message.requestId, {
                        status: 0,
                        message: '未知的 action: ' + message.action,
                    });
                    break;
            }
        } catch (error: any) {
            console.error("Failed to handle message:", error);
            await this.sendResponse(message.requestId, {
                status: 0,
                message: '错误: ' + error.message,
                detail: error,
            });
        }
    }

    private async handleBindClient(message: any) {
        if (!message.clientId) {
            await this.sendResponse(message.requestId, {
                status: 0,
                message: '数据包错误：client ID 不存在',
            });
            return;
        }

        this.clientId = message.clientId;

        let gameInstance = await LoLGameManager.instance.getOrCreateGame(this.clientId);
        this.connectToGame(gameInstance);

        // 发送当前事件配置
        await this.send({
            event: 'eventTriggersUpdated',
            data: gameInstance.getEventTriggers(),
        });

        // 发送当前状态
        await this.send({
            event: 'statusUpdated',
            data: {
                deviceConnected: gameInstance.deviceConnected,
                lolConnected: gameInstance.lolConnected,
                inGame: gameInstance.inGame,
                playerName: gameInstance.playerName,
            },
        });

        await this.sendResponse(message.requestId, {
            status: 1,
        });
    }

    /**
     * 开始LoL联动
     */
    private async handleStartLoL(message: any) {
        if (!this.gameInstance) {
            await this.sendResponse(message.requestId, {
                status: 0,
                message: '游戏控制器未初始化',
            });
            return;
        }

        this.gameInstance.startLoLIntegration();

        await this.sendResponse(message.requestId, {
            status: 1,
        });
    }

    /**
     * 停止LoL联动
     */
    private async handleStopLoL(message: any) {
        if (!this.gameInstance) {
            await this.sendResponse(message.requestId, {
                status: 0,
                message: '游戏控制器未初始化',
            });
            return;
        }

        this.gameInstance.stopLoLIntegration();

        await this.sendResponse(message.requestId, {
            status: 1,
        });
    }

    /**
     * 更新事件触发配置
     */
    private async handleUpdateEventTriggers(message: any) {
        if (!this.gameInstance) {
            await this.sendResponse(message.requestId, {
                status: 0,
                message: '游戏控制器未初始化',
            });
            return;
        }

        if (!message.triggers || !Array.isArray(message.triggers)) {
            await this.sendResponse(message.requestId, {
                status: 0,
                message: '数据包错误：triggers 不存在或格式错误',
            });
            return;
        }

        const triggers: LoLEventTriggerConfig[] = message.triggers;
        this.gameInstance.updateEventTriggers(triggers);

        await this.sendResponse(message.requestId, {
            status: 1,
        });
    }

    /**
     * 手动发送指令
     */
    private async handleSendCommand(message: any) {
        if (!this.gameInstance) {
            await this.sendResponse(message.requestId, {
                status: 0,
                message: '游戏控制器未初始化',
            });
            return;
        }

        if (typeof message.commandId !== 'number') {
            await this.sendResponse(message.requestId, {
                status: 0,
                message: '数据包错误：commandId 不存在或格式错误',
            });
            return;
        }

        await this.gameInstance.sendCommand(message.commandId);

        await this.sendResponse(message.requestId, {
            status: 1,
        });
    }

    private async connectToGame(gameInstance: LoLGameController) {
        this.gameInstance = gameInstance;

        const gameEvents = this.gameEventStore.wrap(gameInstance);

        // 设备连接状态事件
        gameEvents.on("deviceConnected", async () => {
            await this.send({
                event: 'deviceConnected',
            });
        });

        gameEvents.on("deviceDisconnected", async () => {
            await this.send({
                event: 'deviceDisconnected',
            });
        });

        // LoL连接状态事件
        gameEvents.on("lolConnected", async () => {
            await this.send({
                event: 'lolConnected',
            });
        });

        gameEvents.on("lolDisconnected", async () => {
            await this.send({
                event: 'lolDisconnected',
            });
        });

        // 游戏开始事件（包含玩家名称）
        gameEvents.on("gameStarted", async (playerName: string) => {
            await this.send({
                event: 'gameStarted',
                data: {
                    playerName,
                },
            });
        });

        // 游戏结束事件
        gameEvents.on("gameEnded", async () => {
            await this.send({
                event: 'gameEnded',
            });
        });

        // 事件触发
        gameEvents.on("eventTriggered", async (eventType: LoLGameEventType, commandId: number) => {
            await this.send({
                event: 'eventTriggered',
                data: {
                    eventType,
                    commandId,
                },
            });
        });

        gameEvents.on("gameInfoUpdated", async (info) => {
            await this.send({
                event: 'gameInfoUpdated',
                data: info,
            });
        });

        // 配置更新
        gameEvents.on("configUpdated", async (config: LoLEventTriggerConfig[]) => {
            await this.send({
                event: 'eventTriggersUpdated',
                data: config,
            });
        });

        // SDK 日志
        gameEvents.on("sdkLog", async (type: 'request' | 'response', data: any) => {
            await this.send({
                event: 'sdkLog',
                data: {
                    type,
                    data,
                },
            });
        });

        // 发送初始状态
        if (gameInstance.deviceConnected) {
            await this.send({
                event: 'deviceConnected',
            });
        }
    }

    private async taskHeartbeat() {
        if (this.prevHeartbeatTime && Date.now() - this.prevHeartbeatTime > 30000) { // 超过 30s 没有收到心跳包，断开连接
            this.close();
            return;
        }

        try {
            await this.send({
                event: 'heartbeat',
            });
        } catch (err: any) {
            console.error('Failed to send heartbeat:', err);
        }
    }

    public async close() {
        this.socket.close();
    }

    public destory() {
        if (this.heartbeatTask) {
            clearInterval(this.heartbeatTask);
        }

        this.eventStore.removeAllListeners();
        this.gameEventStore.removeAllListeners();

        // 销毁游戏控制器
        if (this.gameInstance) {
            this.gameInstance.destroy().catch((err) => {
                console.error('[WebWSClient] 销毁游戏控制器失败:', err);
            });
            this.gameInstance = null;
        }

        this.events.emit("close");
        this.events.removeAllListeners();

        console.log(`[WebWSClient] 连接已关闭: ${this.socketId}`);
    }

    public on = this.events.on.bind(this.events);
    public once = this.events.once.bind(this.events);
    public off = this.events.off.bind(this.events);
    public removeAllListeners = this.events.removeAllListeners.bind(this.events);
}
