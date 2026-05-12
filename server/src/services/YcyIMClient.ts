import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { YcyIMConfig, YcyIMMessage } from '#app/types/ycyim.js';
import {
    buildLoginMessage,
    buildLogoutMessage,
    buildSendCommandMessage,
    isSuccessResponse,
    normalizeUserId,
    type ImWsClientMessage,
    type ImWsCommandId,
    type ImWsServerMessage,
} from './imWsProtocol.js';

const YCY_IM_WS_URL = 'ws://103.236.55.92:43001/';

export interface YcyIMClientEvents {
    ready: [];
    message: [message: YcyIMMessage];
    error: [error: Error];
    close: [];
}

export interface YcyIMClientState {
    uid: string;
    token: string;
    userId: string | null;
    appId: string | null;
}

/**
 * 役次元IM客户端
 * 用于通过役次元提供的 WebSocket API 登录并发送控制指令
 */
export class YcyIMClient {
    private socket: WebSocket | null = null;
    private state: YcyIMClientState;
    private initialized = false;
    private isReady = false;
    private destroyed = false;
    private sendQueue: Promise<void> = Promise.resolve();
    private waiters = new Map<string, Array<{
        resolve: (message: ImWsServerMessage) => void;
        reject: (error: Error) => void;
        timer: NodeJS.Timeout;
    }>>();

    private events = new EventEmitter<YcyIMClientEvents>();

    constructor(config: YcyIMConfig) {
        this.state = {
            uid: config.uid,
            token: config.token,
            userId: null,
            appId: null,
        };
    }

    /**
     * 初始化IM连接
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        console.log('[YcyIMClient] 正在初始化IM连接...');
        this.destroyed = false;
        await this.connectWebSocket();

        console.log('[YcyIMClient] 正在登录...');
        const loginResult = await this.sendAndWait(
            buildLoginMessage(this.state.uid, this.state.token),
            'loginResult'
        );

        if (!isSuccessResponse(loginResult)) {
            throw new Error(loginResult.message || 'IM 登录失败');
        }

        this.state.userId = String(loginResult.data?.userId || normalizeUserId(this.state.uid));
        this.state.appId = loginResult.data?.appId ? String(loginResult.data.appId) : null;
        this.initialized = true;

        if (loginResult.data?.isReady !== false) {
            this.markReady();
        } else {
            await this.waitReady();
        }

        console.log('[YcyIMClient] IM 初始化完成');
    }

    /**
     * 等待 IM 会话就绪
     */
    private async waitReady(timeout = 15000): Promise<void> {
        if (this.isReady) return;

        await new Promise<void>((resolve, reject) => {
            const onReady = () => {
                cleanup();
                resolve();
            };

            const timer = setTimeout(() => {
                cleanup();
                reject(new Error('等待 IM_READY 超时'));
            }, timeout);

            const cleanup = () => {
                clearTimeout(timer);
                this.events.off('ready', onReady);
            };

            this.events.on('ready', onReady);
        });
    }

    private async connectWebSocket(): Promise<void> {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            const socket = new WebSocket(YCY_IM_WS_URL);
            let settled = false;

            const cleanup = () => {
                socket.off('open', handleOpen);
                socket.off('error', handleError);
            };

            const handleOpen = () => {
                cleanup();
                settled = true;
                this.socket = socket;
                this.bindSocketEvents(socket);
                resolve();
            };

            const handleError = (error: Error) => {
                cleanup();
                if (!settled) {
                    reject(error);
                } else {
                    this.events.emit('error', error);
                }
            };

            socket.once('open', handleOpen);
            socket.once('error', handleError);
        });
    }

    /**
     * 发送指令消息
     * @returns SDK 返回的发送结果
     */
    public async send(message: YcyIMMessage): Promise<any> {
        // 使用队列确保消息按顺序发送，并返回 SDK 结果
        let result: any;
        this.sendQueue = this.sendQueue
            .then(async () => {
                result = await this._doSend(message);
                return result;
            })
            .catch(e => {
                console.error('[YcyIMClient] 发送队列错误:', e);
                throw e;
            });
        await this.sendQueue;
        return result;
    }

    /**
     * 发送游戏指令
     * @param data 指令数据
     * @returns WebSocket API 返回的发送结果
     */
    public async sendGameInfo(data: ImWsCommandId): Promise<any> {
        return await this.send({
            code: 'game_cmd',
            id: data,
        });
    }

    /**
     * 内部发送实现
     * @returns WebSocket API 的 commandResult 返回值
     */
    private async _doSend(message: YcyIMMessage): Promise<any> {
        if (!this.socket || !this.isReady || !this.state.userId) {
            console.warn('[YcyIMClient] IM 未就绪，丢弃消息');
            return null;
        }

        const commandId = message.id ?? message.data;
        if (commandId === undefined || commandId === null) {
            throw new Error('缺少 commandId');
        }

        const sendResult = await this.sendAndWait(
            buildSendCommandMessage(this.state.userId, commandId),
            'commandResult'
        );

        if (!isSuccessResponse(sendResult)) {
            throw new Error(sendResult.message || '指令发送失败');
        }

        console.log('[YcyIMClient] 指令发送成功');
        console.log('[YcyIMClient] to_userId: ' + this.state.userId + ', commandId: ', commandId);
        console.log('[YcyIMClient] WS 返回值: ', sendResult);
        return sendResult;
    }

    /**
     * 获取连接状态
     */
    public get active(): boolean {
        return this.isReady && !this.destroyed;
    }

    /**
     * 获取 token（用于请求日志记录）
     */
    public getToken(): string {
        return this.state.token;
    }

    public getUserId(): string | null {
        return this.state.userId;
    }

    /**
     * 销毁客户端
     */
    public async destroy(): Promise<void> {
        this.destroyed = true;

        const socket = this.socket;
        if (socket && socket.readyState === WebSocket.OPEN && this.state.userId) {
            try {
                await this.sendAndWait(buildLogoutMessage(this.state.userId), 'logoutResult', 5000);
            } catch (e: any) {
                console.warn('[YcyIMClient] 登出会话失败:', e.message);
            }
        }

        if (socket) {
            try {
                socket.removeAllListeners();
                socket.close();
            } catch (e: any) {
                console.warn('[YcyIMClient] 关闭 WebSocket 出错:', e.message);
            }
        }

        for (const entries of this.waiters.values()) {
            for (const waiter of entries) {
                clearTimeout(waiter.timer);
                waiter.reject(new Error('连接已关闭'));
            }
        }
        this.waiters.clear();

        this.socket = null;
        this.initialized = false;
        this.isReady = false;
        this.state.userId = null;

        this.events.emit('close');
        this.events.removeAllListeners();
    }

    private bindSocketEvents(socket: WebSocket): void {
        socket.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString()) as ImWsServerMessage;
                this.handleServerMessage(message);
            } catch (error: any) {
                this.events.emit('error', error);
            }
        });

        socket.on('close', () => {
            this.socket = null;
            if (!this.destroyed) {
                this.initialized = false;
                this.isReady = false;
                this.events.emit('close');
            }
        });

        socket.on('error', (error) => {
            this.events.emit('error', error as Error);
        });
    }

    private handleServerMessage(message: ImWsServerMessage): void {
        if (message.type === 'loginResult' && message.data?.userId) {
            this.state.userId = String(message.data.userId);
            this.state.appId = message.data.appId ? String(message.data.appId) : this.state.appId;
        }

        if (message.type === 'status' && (message.data?.isReady === true || message.data?.event === 'SDK_READY')) {
            this.markReady();
        }

        if (message.type === 'loginResult' && message.data?.isReady !== false && isSuccessResponse(message)) {
            this.markReady();
        }

        if (message.type === 'message') {
            for (const item of message.data?.messages || []) {
                const text = item?.payload?.text;
                if (typeof text !== 'string') {
                    continue;
                }
                try {
                    const content = JSON.parse(text) as YcyIMMessage;
                    this.events.emit('message', content);
                } catch {
                    this.events.emit('message', {
                        code: 'raw',
                        payload: item,
                    });
                }
            }
        }

        if (message.type === 'error') {
            this.events.emit('error', new Error(message.message || 'WebSocket API Error'));
        }

        this.resolveWaiter(message.type, message);
    }

    private markReady(): void {
        if (this.isReady) return;
        this.isReady = true;
        console.log('[YcyIMClient] IM 会话已就绪');
        this.events.emit('ready');
    }

    private async sendAndWait(
        message: ImWsClientMessage,
        responseType: string,
        timeout = 15000
    ): Promise<ImWsServerMessage> {
        const response = new Promise<ImWsServerMessage>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.removeWaiter(responseType, waiter);
                reject(new Error(`等待 ${responseType} 超时`));
            }, timeout);

            const waiter = {
                resolve,
                reject,
                timer,
            };

            const entries = this.waiters.get(responseType) || [];
            entries.push(waiter);
            this.waiters.set(responseType, entries);
        });

        await this.sendRaw(message);
        return await response;
    }

    private async sendRaw(message: ImWsClientMessage): Promise<void> {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket 未连接');
        }

        await new Promise<void>((resolve, reject) => {
            this.socket!.send(JSON.stringify(message), (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }

    private resolveWaiter(type: string, message: ImWsServerMessage): void {
        const entries = this.waiters.get(type);
        if (!entries?.length) {
            return;
        }

        const waiter = entries.shift()!;
        clearTimeout(waiter.timer);
        if (!entries.length) {
            this.waiters.delete(type);
        }
        waiter.resolve(message);
    }

    private removeWaiter(type: string, waiterToRemove: {
        resolve: (message: ImWsServerMessage) => void;
        reject: (error: Error) => void;
        timer: NodeJS.Timeout;
    }): void {
        const entries = this.waiters.get(type);
        if (!entries?.length) {
            return;
        }

        const nextEntries = entries.filter((waiter) => waiter !== waiterToRemove);
        if (nextEntries.length) {
            this.waiters.set(type, nextEntries);
            return;
        }

        this.waiters.delete(type);
    }

    public on = this.events.on.bind(this.events);
    public once = this.events.once.bind(this.events);
    public off = this.events.off.bind(this.events);
    public removeAllListeners = this.events.removeAllListeners.bind(this.events);
}
