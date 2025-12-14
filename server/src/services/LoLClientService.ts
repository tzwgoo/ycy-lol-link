import { EventEmitter } from 'events';
import https from 'https';
import { Agent as UndiciAgent } from 'undici';
import {
    LoLGameEventType,
    type LoLEvent,
    type LoLGameData,
    type LoLPlayer,
    type LoLLiveGameInfo,
} from '#app/shared/types/index.js';

interface LoLEventResponse {
    Events: LoLEvent[];
}

/**
 * 英雄联盟 Live Client Data API 服务事件
 */
export interface LoLClientEvents {
    gameStart: [];
    gameEnd: [win: boolean];
    gameEvent: [eventType: LoLGameEventType, eventData?: LoLEvent];
    connectionChanged: [connected: boolean];
    error: [error: Error];
    gameInfoUpdated: [info: LoLLiveGameInfo];
}

/**
 * 基于 docs/LOL-Client-API 的局内监听实现
 * - 使用 /liveclientdata/gamestats 探测连接与对局状态
 * - 使用 /liveclientdata/eventdata?eventID=N 增量拉取事件
 * - 持有玩家列表用于队伍判定
 */
export class LoLClientService {
    private static _instance: LoLClientService;

    private events = new EventEmitter<LoLClientEvents>();

    private pollTimer: NodeJS.Timeout | null = null;
    private pollInterval = 1000;
    private polling = false;

    private isConnected = false;
    private isInGame = false;

    private playerName = '';
    private playerTeam: string = '';
    private players: LoLPlayer[] = [];
    private lastEventId = -1;
    private lastGameData: LoLGameData | null = null;
    private lastHealth: number | null = null;
    private lastIsDead = false;

    private readonly API_BASE = 'https://127.0.0.1:2999';
    private readonly httpsAgent = new https.Agent({ rejectUnauthorized: false });
    private readonly dispatcher = new UndiciAgent({ connect: { rejectUnauthorized: false } });

    private constructor() {}

    public static get instance(): LoLClientService {
        if (!this._instance) {
            this._instance = new LoLClientService();
        }
        return this._instance;
    }

    public startPolling(interval: number = 1000): void {
        this.pollInterval = interval;

        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }

        console.log('[LoLClient] 开始轮询 Live Client Data API');

        this.poll();
        this.pollTimer = setInterval(() => {
            this.poll();
        }, this.pollInterval);
    }

    public stopPolling(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.resetState();
        console.log('[LoLClient] 停止轮询');
    }

    /**
     * 执行一次轮询（互斥，避免并发请求堆积）
     */
    private async poll(): Promise<void> {
        if (this.polling) return;
        this.polling = true;

        try {
            const gameStats = await this.fetchGameStats();
            this.lastGameData = gameStats;
            const players = await this.fetchPlayerList();
            this.players = players;
            this.ensureConnected();

            if (!this.isInGame) {
                await this.handleGameStart(players);
            }

            this.emitGameInfo(gameStats, players);
            await this.pollEvents();

            // 主动健康检测（用于兜底被击杀/掉血判定）
            const activeDetail = await this.fetchActivePlayerDetail();
            this.detectHealthAndDeath(activeDetail, players);
        } catch (error: any) {
            this.handleDisconnect(error);
        } finally {
            this.polling = false;
        }
    }

    private ensureConnected(): void {
        if (!this.isConnected) {
            this.isConnected = true;
            this.events.emit('connectionChanged', true);
            console.log('[LoLClient] 已连接到游戏客户端');
        }
    }

    /**
     * 进入对局时初始化玩家上下文
     */
    private async handleGameStart(players: LoLPlayer[]): Promise<void> {
        const playerName = await this.fetchActivePlayerName();

        this.playerName = playerName;
        this.players = players;
        this.playerTeam = this.lookupPlayerTeam(playerName, players) || '';
        this.isInGame = true;
        this.lastEventId = -1;

        console.log(`[LoLClient] 游戏开始，玩家: ${this.playerName}`);
        this.events.emit('gameStart');
        this.events.emit('gameEvent', LoLGameEventType.GameStart);
    }

    /**
     * 增量拉取事件
     */
    private async pollEvents(): Promise<void> {
        const fromId = this.lastEventId + 1;
        const data = await this.fetchEventData(fromId);
        const events = data?.Events ?? [];
        if (!events.length) return;

        this.lastEventId = events[events.length - 1].EventID;
        for (const event of events) {
            this.processGameEvent(event);
        }
    }

    private processGameEvent(event: LoLEvent): void {
        switch (event.EventName) {
            case 'GameStart':
                if (!this.isInGame) {
                    this.isInGame = true;
                    this.events.emit('gameStart');
                    this.events.emit('gameEvent', LoLGameEventType.GameStart, event);
                }
                break;

            case 'MinionsSpawning':
                this.events.emit('gameEvent', LoLGameEventType.MinionsSpawning, event);
                break;

            case 'GameEnd': {
                const win = this.isPlayerOnTeam(event.AcingTeam || this.playerTeam);
                this.events.emit('gameEnd', !!win);
                this.events.emit('gameEvent', LoLGameEventType.GameEnd, event);
                this.cleanupAfterGameEnd();
                break;
            }

            case 'ChampionKill':
                this.handleChampionKill(event);
                break;

            case 'FirstBlood':
                if (event.KillerName && this.isCurrentPlayer(event.KillerName)) {
                    console.log('[LoLClient] 事件: 第一滴血');
                    this.events.emit('gameEvent', LoLGameEventType.FirstBlood, event);
                }
                break;

            case 'MultiKill':
                if (event.KillerName && this.isCurrentPlayer(event.KillerName)) {
                    console.log('[LoLClient] 事件: 多杀');
                    this.events.emit('gameEvent', LoLGameEventType.MultiKill, event);
                }
                break;

            case 'DragonKill':
                if (event.KillerName && this.isCurrentPlayerTeam(event.KillerName)) {
                    console.log(`[LoLClient] 事件: 击杀小龙 (${event.DragonType || ''})`);
                    this.events.emit('gameEvent', LoLGameEventType.DragonKill, event);
                }
                break;

            case 'BaronKill':
                if (event.KillerName && this.isCurrentPlayerTeam(event.KillerName)) {
                    console.log('[LoLClient] 事件: 击杀大龙');
                    this.events.emit('gameEvent', LoLGameEventType.BaronKill, event);
                }
                break;

            case 'HeraldKill':
                if (event.KillerName && this.isCurrentPlayerTeam(event.KillerName)) {
                    console.log('[LoLClient] 事件: 击杀峡谷先锋');
                    this.events.emit('gameEvent', LoLGameEventType.HeraldKill, event);
                }
                break;

            case 'TurretKilled':
                if (event.KillerName && this.isCurrentPlayerTeam(event.KillerName)) {
                    console.log('[LoLClient] 事件: 推塔');
                    this.events.emit('gameEvent', LoLGameEventType.TurretKilled, event);
                }
                break;

            case 'InhibKilled':
                if (event.KillerName && this.isCurrentPlayerTeam(event.KillerName)) {
                    console.log('[LoLClient] 事件: 拆掉水晶');
                    this.events.emit('gameEvent', LoLGameEventType.InhibKilled, event);
                }
                break;

            case 'FirstBrick':
                if (event.KillerName && this.isCurrentPlayerTeam(event.KillerName)) {
                    console.log('[LoLClient] 事件: 首拆');
                    this.events.emit('gameEvent', LoLGameEventType.FirstBrick, event);
                }
                break;

            case 'Ace':
                if (event.AcingTeam && this.isPlayerOnTeam(event.AcingTeam)) {
                    console.log('[LoLClient] 事件: 团灭');
                    this.events.emit('gameEvent', LoLGameEventType.Ace, event);
                }
                break;

            case 'Multikill':
                if (event.KillerName && this.isCurrentPlayer(event.KillerName)) {
                    console.log(`[LoLClient] 事件: 多杀 x${event.KillStreak || ''}`);
                    this.events.emit('gameEvent', LoLGameEventType.MultiKill, event);
                }
                break;
        }
    }

    private handleChampionKill(event: LoLEvent): void {
        const isKiller = event.KillerName && this.isCurrentPlayer(event.KillerName);
        const isVictim = event.VictimName && this.isCurrentPlayer(event.VictimName);
        const isAssister = event.Assisters?.some(name => this.isCurrentPlayer(name));

        if (isKiller) {
            console.log('[LoLClient] 事件: 击杀英雄');
            this.events.emit('gameEvent', LoLGameEventType.ChampionKill, event);
        } else if (isVictim) {
            console.log('[LoLClient] 事件: 被击杀');
            this.events.emit('gameEvent', LoLGameEventType.Death, event);
        } else if (isAssister) {
            console.log('[LoLClient] 事件: 助攻');
            this.events.emit('gameEvent', LoLGameEventType.Assist, event);
        }
    }

    private cleanupAfterGameEnd(): void {
        this.isInGame = false;
        this.players = [];
        this.playerTeam = '';
        this.lastEventId = -1;
        this.lastHealth = null;
        this.lastIsDead = false;
    }

    private handleDisconnect(error: Error): void {
        const wasConnected = this.isConnected;
        const wasInGame = this.isInGame;

        this.isConnected = false;
        this.cleanupAfterGameEnd();

        if (wasConnected) {
            this.events.emit('connectionChanged', false);
            console.log('[LoLClient] 无法连接到客户端，可能未在对局中');
            this.logConnectionHint(error);
        }

        if (wasInGame) {
            this.events.emit('gameEnd', false);
            this.events.emit('gameEvent', LoLGameEventType.GameEnd);
        }

        this.events.emit('error', error);
    }

    private resetState(): void {
        this.polling = false;
        this.isConnected = false;
        this.cleanupAfterGameEnd();
    }

    private emitGameInfo(gameData: LoLGameData, players: LoLPlayer[]): void {
        if (!this.isInGame) return;

        const info: LoLLiveGameInfo = {
            playerName: this.playerName,
            playerTeam: this.playerTeam,
            gameData,
            players,
        };
        this.events.emit('gameInfoUpdated', info);
    }

    private async fetchActivePlayerName(): Promise<string> {
        return await this.fetchJson<string>('/liveclientdata/activeplayername');
    }

    private async fetchPlayerList(): Promise<LoLPlayer[]> {
        return await this.fetchJson<LoLPlayer[]>('/liveclientdata/playerlist');
    }

    private async fetchEventData(eventId: number): Promise<LoLEventResponse> {
        const id = Math.max(0, eventId);
        return await this.fetchJson<LoLEventResponse>(`/liveclientdata/eventdata?eventID=${id}`);
    }

    private async fetchGameStats(): Promise<LoLGameData> {
        return await this.fetchJson<LoLGameData>('/liveclientdata/gamestats');
    }

    private async fetchActivePlayerDetail(): Promise<any> {
        return await this.fetchJson<any>('/liveclientdata/activeplayer');
    }

    private async fetchJson<T>(path: string): Promise<T> {
        const response = await fetch(`${this.API_BASE}${path}`, {
            // @ts-ignore Node.js fetch 支持 agent/dispatcher
            agent: this.httpsAgent,
            dispatcher: this.dispatcher,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json() as T;
    }

    private lookupPlayerTeam(name: string, players: LoLPlayer[]): string | undefined {
        return players.find(p =>
            p.riotIdGameName === name || p.summonerName === name || p.riotId === name
        )?.team;
    }

    private isCurrentPlayer(name: string): boolean {
        return name === this.playerName ||
               this.players.some(p =>
                   p.riotId === name ||
                   p.riotIdGameName === name ||
                   p.summonerName === name
               );
    }

    private isCurrentPlayerTeam(name: string): boolean {
        if (!this.playerTeam) return false;
        const player = this.players.find(p =>
            p.riotIdGameName === name || p.summonerName === name || p.riotId === name
        );
        return player?.team === this.playerTeam;
    }

    private isPlayerOnTeam(teamName: string | undefined): boolean {
        if (!teamName) return false;
        return this.playerTeam === teamName;
    }

    /**
     * 健康值检测：掉血或死亡时兜底触发被击杀事件
     */
    private detectHealthAndDeath(activeDetail: any, players: LoLPlayer[]): void {
        const active = players.find(p =>
            p.riotIdGameName === this.playerName ||
            p.summonerName === this.playerName ||
            p.riotId === this.playerName
        );
        if (!active) return;

        const isDead = !!active.isDead;
        const stats = (activeDetail as any)?.championStats || {};
        const health = typeof stats.currentHealth === 'number'
            ? stats.currentHealth
            : typeof stats.health === 'number'
                ? stats.health
                : this.lastHealth;

        const prevHealth = this.lastHealth;
        if (health !== null && prevHealth !== null && health < prevHealth) {
            console.log(`[LoLClient] 事件: 掉血 -> ${health.toFixed(1)}`);
            this.events.emit('gameEvent', LoLGameEventType.Injured, {
                prevHealth,
                currentHealth: health,
            } as any);
            if (health <= 0) {
                this.events.emit('gameEvent', LoLGameEventType.Death);
            }
        }

        if (isDead && !this.lastIsDead) {
            this.events.emit('gameEvent', LoLGameEventType.Death);
        }

        this.lastHealth = health ?? this.lastHealth;
        this.lastIsDead = isDead;
    }

    public get connected(): boolean {
        return this.isConnected;
    }

    public get inGame(): boolean {
        return this.isInGame;
    }

    public get currentPlayerName(): string {
        return this.playerName;
    }

    /**
     * 输出更友好的连接错误提示（例如自签名证书）
     */
    private logConnectionHint(error: Error): void {
        const msg = (error as any)?.message || '';
        const code = (error as any)?.code || '';
        if (
            msg.toLowerCase().includes('unable to verify the first certificate') ||
            msg.toLowerCase().includes('self signed certificate') ||
            code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
        ) {
            console.warn('[LoLClient] 提示：检测到证书验证问题，已关闭校验证书（rejectUnauthorized=false / undici dispatcher）。若仍报错，请确认 LoL 客户端已启动并允许本地接口访问。', msg || code);
        } else {
            console.warn('[LoLClient] 连接错误：', msg || code);
        }
    }

    public on = this.events.on.bind(this.events);
    public once = this.events.once.bind(this.events);
    public off = this.events.off.bind(this.events);
    public removeAllListeners = this.events.removeAllListeners.bind(this.events);
}
