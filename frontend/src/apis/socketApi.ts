import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "eventemitter3";
import { EventDef, EventAddListenerFunc, EventRemoveListenerFunc } from "../utils/event";
import type {
    WebSocketMessage,
    WebSocketServerMessage,
    RemoteNotificationInfo,
    WebSocketEventListeners,
} from "../../../shared/types/index.js";
import {
    LoLGameEventType,
    LoLEventNames,
    type LoLEventTriggerConfig,
    type LoLPlayerScores,
    type LoLPlayer,
    type LoLGameData,
    type LoLLiveGameInfo,
    type GameStatus,
} from "../../../shared/types/index.js";

// Re-export for backward compatibility
export type {
    WebSocketMessage,
    WebSocketServerMessage,
    RemoteNotificationInfo,
    LoLEventTriggerConfig,
    LoLPlayerScores,
    LoLGameData,
    LoLLiveGameInfo,
    GameStatus,
};
export { LoLGameEventType, LoLEventNames };

// Rename LoLPlayer to LoLPlayerInfo for backward compatibility
export type LoLPlayerInfo = LoLPlayer;

export type PendingRequestInfo = {
    requestId: string;
    expires: number;
    resolve: (data: any) => void;
    reject: (error: any) => void;
};

export interface SocketApiEventListeners extends EventDef, WebSocketEventListeners {}

export class SocketApi {
    private socket!: WebSocket;
    private socketUrl: string;
    private reconnectAttempts: number = 0;

    private shouldClose = false;

    private events = new EventEmitter();

    private pendingRequests: Map<string, PendingRequestInfo> = new Map();

    constructor(wsUrl: string) {
        if (wsUrl.startsWith("/")) { // Relative path
            const protocol = window.location.protocol === "https:" ? "wss" : "ws";
            wsUrl = `${protocol}://${window.location.host}${wsUrl}`;
        }
        this.socketUrl = wsUrl;
    }

    public get isConnected() {
        return this.socket.readyState === WebSocket.OPEN;
    }

    public connect() {
        this.socket = new WebSocket(this.socketUrl);
        this.init();
    }

    public on: EventAddListenerFunc<SocketApiEventListeners> = this.events.on.bind(this.events);
    public once: EventAddListenerFunc<SocketApiEventListeners> = this.events.once.bind(this.events);
    public off: EventRemoveListenerFunc<SocketApiEventListeners> = this.events.off.bind(this.events);

    public async send(data: WebSocketMessage): Promise<string> {
        data.requestId = uuidv4();
        const dataStr = JSON.stringify(data);
        this.socket.send(dataStr);

        // 触发请求日志事件（记录实际发送的数据）
        this.events.emit('commandRequest', data.action, data);

        return data.requestId;
    }

    public sendRequest(data: WebSocketMessage, expires: number = 5000): Promise<WebSocketServerMessage> {
        return new Promise((resolve, reject) => {
            this.send(data).then((requestId: string) => {
                this.pendingRequests.set(requestId, {
                    requestId,
                    expires: Date.now() + expires,
                    resolve,
                    reject,
                });
            });
        });
    }

    public init() {
        this.socket.addEventListener("open", () => {
            this.reconnectAttempts = 0;

            window.addEventListener("beforeunload", this.handleWindowClose);

            this.events.emit("open");
        });

        this.socket.addEventListener("message", (event) => {
            if (typeof event.data === 'string') {
                let message: WebSocketServerMessage;

                try {
                    message = JSON.parse(event.data);
                } catch (error) {
                    console.error("Failed to parse WebSocket message:", event.data);
                    return;
                }

                this.handleMessage(message);
            }
        });

        this.socket.addEventListener("close", () => {
            if (this.shouldClose) return;

            this.events.emit("error", new Error("Socket closed."));

            this.handleUnexpectedClose();
        });

        this.socket.addEventListener("error", (error) => {
            console.error("WebSocket error:", error);
            this.events.emit("error", error);
        });
    }

    private handleWindowClose = () => {
        this.close();
    };

    private handleUnexpectedClose() {
        console.log('Attempt to reconnect to server.');
        this.reconnectAttempts ++;

        let reconnectInterval = 1000;
        if (this.reconnectAttempts > 10) { // 重连失败5次后，降低重连频率
            reconnectInterval = 5000;
        }

        try {
            this.socket.close();
        } catch (err: any) {
            console.error("Cannot close socket:", err);
        }

        window.removeEventListener("beforeunload", this.handleWindowClose);

        // Reconnect
        setTimeout(() => {
            this.connect();
        }, reconnectInterval);
    }

    /**
     * 绑定客户端
     */
    public bindClient(clientId: string) {
        return this.sendRequest({
            action: "bindClient",
            clientId,
        });
    }

    /**
     * 启动LoL联动
     */
    public startLoL() {
        return this.sendRequest({
            action: "startLoL",
        });
    }

    /**
     * 停止LoL联动
     */
    public stopLoL() {
        return this.sendRequest({
            action: "stopLoL",
        });
    }

    /**
     * 更新事件触发配置
     */
    public updateEventTriggers(triggers: LoLEventTriggerConfig[]) {
        return this.sendRequest({
            action: "updateEventTriggers",
            triggers,
        });
    }

    /**
     * 手动发送指令
     */
    public sendCommand(commandId: number) {
        return this.sendRequest({
            action: "sendCommand",
            commandId,
        });
    }

    private async handleMessage(message: WebSocketServerMessage): Promise<void> {
        if (import.meta.env.DEV && message?.event !== 'heartbeat') { // 调试输出
            console.log('websocket message', message);
        }

        switch (message.event) {
            case "response":
                if (message.requestId) {
                    const requestInfo = this.pendingRequests.get(message.requestId);
                    if (requestInfo) {
                        this.pendingRequests.delete(message.requestId);

                        // 触发响应日志事件（记录实际收到的响应数据）
                        this.events.emit('commandResponse', 'response', message);

                        requestInfo.resolve(message.data);
                    } else {
                        console.warn("Received response for unknown request:", message.requestId);
                    }
                } else {
                    console.warn("Received response without requestId:", message);
                }
                break;
            case "deviceConnected":
                this.events.emit("deviceConnected");
                break;
            case "deviceDisconnected":
                this.events.emit("deviceDisconnected");
                break;
            case "lolConnected":
                this.events.emit("lolConnected");
                break;
            case "lolDisconnected":
                this.events.emit("lolDisconnected");
                break;
            case "gameStarted":
                this.events.emit("gameStarted", message.data.playerName);
                break;
            case "gameEnded":
                this.events.emit("gameEnded");
                break;
            case "eventTriggered":
                this.events.emit("eventTriggered", message.data.eventType, message.data.commandId);
                break;
            case "eventTriggersUpdated":
                this.events.emit("eventTriggersUpdated", message.data);
                break;
            case "statusUpdated":
                this.events.emit("statusUpdated", message.data);
                break;
            case "gameInfoUpdated":
                this.events.emit("gameInfoUpdated", message.data);
                break;
            case "remoteNotification":
                this.events.emit("remoteNotification", message.data);
                break;
            case "sdkLog":
                this.events.emit("sdkLog", message.data);
                break;
            case "heartbeat":
                this.send({
                    action: "heartbeat",
                });
                break;
            default:
                console.warn("Unknown event:", message.event, message);
                break;
        }
    };

    public close() {
        this.shouldClose = true;
        this.socket.close();
        window.removeEventListener('beforeunload', this.handleWindowClose);

        this.events.emit('close');
    };
}
