/**
 * WebSocket 通信类型定义
 * 共享类型 - 前后端通用
 */

import { LoLEventTriggerConfig, LoLGameEventType, LoLLiveGameInfo, GameStatus } from './lol.js';

/**
 * 客户端发送的 WebSocket 消息
 */
export type WebSocketMessage = {
    action: string;
    requestId?: string;
} & Record<string, any>;

/**
 * 服务器发送的 WebSocket 消息
 */
export type WebSocketServerMessage = {
    event: string;
    requestId?: string;
    data?: any;
};

/**
 * 远程通知信息
 */
export interface RemoteNotificationInfo {
    title?: string;
    message: string;
    icon?: string;
    severity?: string;
    ignoreId?: string;
    sticky?: boolean;
    url?: string;
    urlLabel?: string;
}

/**
 * WebSocket 事件监听器定义
 */
export interface WebSocketEventListeners {
    error: [error: any];
    open: [];
    close: [];
    remoteNotification: [notification: RemoteNotificationInfo];
    // 设备连接事件
    deviceConnected: [];
    deviceDisconnected: [];
    // LoL连接事件
    lolConnected: [];
    lolDisconnected: [];
    // 游戏开始/结束事件
    gameStarted: [playerName: string];
    gameEnded: [];
    // 游戏事件触发
    eventTriggered: [eventType: LoLGameEventType, commandId: number];
    // 事件配置更新
    eventTriggersUpdated: [config: LoLEventTriggerConfig[]];
    // 状态更新
    statusUpdated: [status: GameStatus];
    // 对局信息更新
    gameInfoUpdated: [info: LoLLiveGameInfo];
    // 指令请求和响应日志
    commandRequest: [action: string, data: any];
    commandResponse: [action: string, data: any];
    // SDK 日志
    sdkLog: [data: any];
}
