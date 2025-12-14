import { EventEmitter } from 'events';
import { createRequire } from 'module';
import { YcyIMConfig, YcyIMMessage, YcyIMAuthResponse } from '#app/types/ycyim.js';

// TencentCloudChat 是 CJS 模块，需要使用 require 导入
const require = createRequire(import.meta.url);
const TencentCloudChat = require('@tencentcloud/chat');

const YCY_API_BASE = 'https://suo.jiushu1234.com/api.php';

export interface YcyIMClientEvents {
    ready: [];
    message: [message: YcyIMMessage];
    error: [error: Error];
    close: [];
}

export interface YcyIMClientState {
    uid: string;
    token: string;
    signature: string | null;
    appId: string | null;
}

/**
 * 役次元IM客户端
 * 用于通过腾讯云IM向役次元APP发送控制指令
 */
export class YcyIMClient {
    private chat: any = null;
    private state: YcyIMClientState;
    private initialized = false;
    private isReady = false;
    private destroyed = false;
    private sendQueue: Promise<void> = Promise.resolve();

    private events = new EventEmitter<YcyIMClientEvents>();

    constructor(config: YcyIMConfig) {
        this.state = {
            uid: config.uid,
            token: config.token,
            signature: null,
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

        // 获取签名
        const { appId, userSig } = await this.requestGameSign(
            `game_${this.state.uid}`,
            this.state.token
        );
        this.state.signature = userSig;
        this.state.appId = appId;

        // 创建IM实例
        this.chat = TencentCloudChat.create({ SDKAppID: parseInt(appId) });

        // 设置日志级别
        // @ts-ignore
        // this.chat.setLogLevel(TencentCloudChat.LOG_LEVEL?.NONE ?? 4);

        // 监听SDK就绪事件
        this.chat.on(TencentCloudChat.EVENT.SDK_READY, () => {
            this.isReady = true;
            this.initialized = true;
            console.log('[YcyIMClient] IM SDK 就绪');
            this.events.emit('ready');
        });

        // 监听被踢下线事件
        this.chat.on(TencentCloudChat.EVENT.KICKED_OUT, async () => {
            console.warn('[YcyIMClient] IM 被踢下线');
            await this.destroy();
            this.events.emit('close');
        });

        // 监听错误事件
        this.chat.on(TencentCloudChat.EVENT.ERROR, (e: any) => {
            console.warn('[YcyIMClient] IM SDK 错误:', e?.message || e);
            this.events.emit('error', new Error(e?.message || 'IM SDK Error'));
        });

        // 监听消息接收事件
        this.chat.on(TencentCloudChat.EVENT.MESSAGE_RECEIVED, (event: any) => {
            for (const msg of event.data) {
                try {
                    const content = JSON.parse(msg.payload.text);
                    console.log('[YcyIMClient] 收到消息:', content);
                    this.events.emit('message', content);
                } catch {
                    console.log('[YcyIMClient] 收到原始消息:', msg.payload.text);
                }
            }
        });

        // 登录
        console.log('[YcyIMClient] 正在登录...');
        const res = await this.chat.login({
            userID: `game_${this.state.uid}`,
            userSig: this.state.signature,
        });

        if (res?.data?.repeatLogin) {
            console.warn('[YcyIMClient] 重复登录:', res.data.errorInfo);
        }

        // 等待就绪
        await this.waitReady();
        console.log('[YcyIMClient] IM 初始化完成');
    }

    /**
     * 等待SDK就绪
     */
    private async waitReady(timeout = 15000): Promise<void> {
        if (this.isReady) return;

        await new Promise<void>((resolve, reject) => {
            const onReady = () => {
                this.isReady = true;
                cleanup();
                resolve();
            };

            const timer = setTimeout(() => {
                cleanup();
                reject(new Error('等待 SDK_READY 超时'));
            }, timeout);

            const cleanup = () => {
                clearTimeout(timer);
                this.chat?.off(TencentCloudChat.EVENT.SDK_READY, onReady);
            };

            this.chat?.on(TencentCloudChat.EVENT.SDK_READY, onReady);
        });
    }

    /**
     * 请求游戏签名
     */
    private async requestGameSign(uid: string, token: string): Promise<{ appId: string; userSig: string }> {
        const resp = await fetch(`${YCY_API_BASE}/user/game_sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, token }),
        });

        if (!resp.ok) {
            throw new Error(`game_sign HTTP 错误: ${resp.status}`);
        }

        const payload: YcyIMAuthResponse = await resp.json();
        if (payload.code !== 1 || !payload.data) {
            throw new Error(`game_sign 返回异常: ${JSON.stringify(payload)}`);
        }

        return { appId: payload.data.appid, userSig: payload.data.sign };
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
     * @returns SDK 返回的发送结果
     */
    public async sendGameInfo(data: number): Promise<any> {
        // 不在这里添加 token，由 _doSend 统一处理
        return await this.send({
            code: 'game_info',
            data: data,
        });
    }

    /**
     * 内部发送实现
     * @returns 腾讯 IM SDK 的 sendMessage 返回值
     */
    private async _doSend(message: YcyIMMessage): Promise<any> {
        if (!this.chat || !this.isReady) {
            console.warn('[YcyIMClient] IM 未就绪，丢弃消息');
            return null;
        }

        const msg = this.chat.createTextMessage({
            to: this.state.uid,
            conversationType: TencentCloudChat.TYPES.CONV_C2C,
            payload: {
                text: JSON.stringify({
                    ...message,
                    token: this.state.token,
                }),
            },
        });

        try {
            // 返回腾讯 IM SDK 的实际响应
            const sendResult = await this.chat.sendMessage(msg);
            console.log('[YcyIMClient] 消息发送成功');
            console.log('[YcyIMClient] to_uid: ' + this.state.uid + ', message: ', message);
            console.log('[YcyIMClient] SDK 返回值: ', sendResult);
            return sendResult;
        } catch (e: any) {
            console.error('[YcyIMClient] 发送失败:', e?.message || e);
            throw e;
        }
    }

    /**
     * 获取连接状态
     */
    public get active(): boolean {
        return this.isReady && !this.destroyed;
    }

    /**
     * 获取 token（用于日志记录）
     */
    public getToken(): string {
        return this.state.token;
    }

    /**
     * 销毁客户端
     */
    public async destroy(): Promise<void> {
        if (this.chat) {
            try {
                console.log('[YcyIMClient] 销毁 Chat 实例...');
                await this.chat.logout();
                await this.chat.destroy();
            } catch (e: any) {
                console.warn('[YcyIMClient] 销毁 Chat 实例出错:', e.message);
            } finally {
                this.chat = null;
                this.initialized = false;
                this.isReady = false;
                this.destroyed = true;
            }
        }

        this.events.emit('close');
        this.events.removeAllListeners();
    }

    public on = this.events.on.bind(this.events);
    public once = this.events.once.bind(this.events);
    public off = this.events.off.bind(this.events);
    public removeAllListeners = this.events.removeAllListeners.bind(this.events);
}
