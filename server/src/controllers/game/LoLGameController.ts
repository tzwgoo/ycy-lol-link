import { EventEmitter } from 'events';
import { YcyIMDeviceController } from '#app/controllers/ws/YcyIMDevice.js';
import { LoLClientService } from '#app/services/LoLClientService.js';
import type { LoLGameEventType, LoLEventTriggerConfig, LoLLiveGameInfo } from '#app/shared/types/index.js';
import { DEFAULT_EVENT_TRIGGERS } from '#app/shared/types/index.js';
import { ServerContext } from '#app/types/server.js';
import { EventStore } from '#app/utils/EventStore.js';

/**
 * 游戏控制器事件
 */
export interface LoLGameControllerEvents {
    /** 设备已连接 */
    deviceConnected: [];
    /** 设备已断开 */
    deviceDisconnected: [];
    /** LoL游戏已连接 */
    lolConnected: [];
    /** LoL游戏已断开 */
    lolDisconnected: [];
    /** 游戏开始，包含玩家名称 */
    gameStarted: [playerName: string];
    /** 游戏结束 */
    gameEnded: [];
    /** 游戏事件触发 */
    eventTriggered: [eventType: LoLGameEventType, commandId: number];
    /** 配置更新 */
    configUpdated: [config: LoLEventTriggerConfig[]];
    /** 对局信息更新 */
    gameInfoUpdated: [info: LoLLiveGameInfo];
    /** SDK 日志 */
    sdkLog: [type: 'request' | 'response', data: any];
    /** 关闭 */
    close: [];
}

/**
 * 英雄联盟游戏控制器
 * 监听LoL游戏事件并通过役次元IM发送对应指令
 */
export class LoLGameController {
    private ctx: ServerContext;
    public clientId: string;

    /** 役次元设备控制器 */
    private device?: YcyIMDeviceController;

    /** 事件触发配置 */
    private eventTriggers: LoLEventTriggerConfig[] = [...DEFAULT_EVENT_TRIGGERS];

    /** 是否启用LoL联动 */
    private lolEnabled: boolean = false;

    private events = new EventEmitter<LoLGameControllerEvents>();
    private eventStore = new EventStore();

    constructor(ctx: ServerContext, clientId: string) {
        this.ctx = ctx;
        this.clientId = clientId;
    }

    /**
     * 初始化控制器
     */
    public async initialize(): Promise<void> {
        console.log(`[LoLGameController] 初始化: ${this.clientId}`);
    }

    /**
     * 绑定役次元设备
     */
    public async bindDevice(device: YcyIMDeviceController): Promise<void> {
        this.device = device;

        // 监听设备断开事件
        const deviceEvents = this.eventStore.wrap(this.device);
        deviceEvents.on('close', () => {
            this.device = undefined;
            this.events.emit('deviceDisconnected');
        });

        // 监听 SDK 日志事件
        deviceEvents.on('sdkLog', (type: 'request' | 'response', data: any) => {
            this.events.emit('sdkLog', type, data);
        });

        this.events.emit('deviceConnected');
        console.log(`[LoLGameController] 设备已绑定: ${this.clientId}`);
    }

    /**
     * 启用英雄联盟联动
     */
    public startLoLIntegration(): void {
        if (this.lolEnabled) return;

        this.lolEnabled = true;
        const lolClient = LoLClientService.instance;

        // 监听LoL事件
        const lolEvents = this.eventStore.wrap(lolClient);

        lolEvents.on('connectionChanged', (connected: boolean) => {
            if (connected) {
                this.events.emit('lolConnected');
                console.log('[LoLGameController] LoL客户端已连接');
            } else {
                this.events.emit('lolDisconnected');
                console.log('[LoLGameController] LoL客户端已断开');
            }
        });

        lolEvents.on('gameStart', () => {
            const playerName = lolClient.currentPlayerName;
            this.events.emit('gameStarted', playerName);
            console.log(`[LoLGameController] 游戏开始，玩家: ${playerName}`);
        });

        lolEvents.on('gameEnd', () => {
            this.events.emit('gameEnded');
            console.log('[LoLGameController] 游戏结束');
        });

        lolEvents.on('gameEvent', (eventType: LoLGameEventType) => {
            this.handleGameEvent(eventType);
        });

        lolEvents.on('gameInfoUpdated', (info: LoLLiveGameInfo) => {
            this.events.emit('gameInfoUpdated', info);
        });

        // 开始轮询
        lolClient.startPolling(1000);

        console.log('[LoLGameController] LoL联动已启用');
    }

    /**
     * 停止英雄联盟联动
     */
    public stopLoLIntegration(): void {
        if (!this.lolEnabled) return;

        this.lolEnabled = false;
        LoLClientService.instance.stopPolling();

        console.log('[LoLGameController] LoL联动已停止');
    }

    /**
     * 处理游戏事件
     */
    private async handleGameEvent(eventType: LoLGameEventType): Promise<void> {
        // 查找对应的触发配置
        const trigger = this.eventTriggers.find(t => t.eventType === eventType);

        if (!trigger || !trigger.enabled) {
            return;
        }

        // 发送指令
        await this.sendCommand(trigger.commandId);
        this.events.emit('eventTriggered', eventType, trigger.commandId);

        console.log(`[LoLGameController] 事件触发: ${eventType} -> 指令 ${trigger.commandId}`);
    }

    /**
     * 发送指令到设备
     */
    public async sendCommand(commandId: number): Promise<void> {
        if (!this.device?.active) {
            console.warn('[LoLGameController] 设备未连接，无法发送指令');
            return;
        }

        await this.device.sendGameCommand(commandId);
    }

    /**
     * 更新事件触发配置
     */
    public updateEventTriggers(triggers: LoLEventTriggerConfig[]): void {
        this.eventTriggers = triggers;
        this.events.emit('configUpdated', triggers);
        console.log('[LoLGameController] 事件配置已更新');
    }

    /**
     * 获取事件触发配置
     */
    public getEventTriggers(): LoLEventTriggerConfig[] {
        return [...this.eventTriggers];
    }

    /**
     * 获取设备连接状态
     */
    public get deviceConnected(): boolean {
        return this.device?.active ?? false;
    }

    /**
     * 获取LoL连接状态
     */
    public get lolConnected(): boolean {
        return LoLClientService.instance.connected;
    }

    /**
     * 获取游戏中状态
     */
    public get inGame(): boolean {
        return LoLClientService.instance.inGame;
    }

    /**
     * 获取当前玩家名称
     */
    public get playerName(): string {
        return LoLClientService.instance.currentPlayerName;
    }

    /**
     * 销毁控制器
     */
    public async destroy(): Promise<void> {
        console.log(`[LoLGameController] 销毁控制器: ${this.clientId}`);

        this.stopLoLIntegration();

        // 销毁设备连接
        if (this.device) {
            await this.device.destroy();
            this.device = undefined;
        }

        this.eventStore.removeAllListeners();
        this.events.emit('close');
        this.events.removeAllListeners();
    }

    public on = this.events.on.bind(this.events);
    public once = this.events.once.bind(this.events);
    public off = this.events.off.bind(this.events);
    public removeAllListeners = this.events.removeAllListeners.bind(this.events);
}
