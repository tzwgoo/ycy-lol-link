/**
 * 英雄联盟 Live Client Data API 类型定义
 * 共享类型 - 前后端通用
 */

/**
 * 游戏事件类型
 */
export enum LoLGameEventType {
    /** 游戏开始*/
    GameStart = 'GameStart',
    /** 兵线刷新 */
    MinionsSpawning = 'MinionsSpawning',
    /** 游戏结束 */
    GameEnd = 'GameEnd',
    /** 击杀英雄 */
    ChampionKill = 'ChampionKill',
    /** 被击杀 */
    Death = 'Death',
    /** 助攻 */
    Assist = 'Assist',
    /** 多杀 (双杀、三杀等) */
    MultiKill = 'MultiKill',
    /** 第一滴血 */
    FirstBlood = 'FirstBlood',
    /** 首拆（第一座塔） */
    FirstBrick = 'FirstBrick',
    /** 击杀小龙 */
    DragonKill = 'DragonKill',
    /** 击杀大龙 */
    BaronKill = 'BaronKill',
    /** 击杀峡谷先锋 */
    HeraldKill = 'HeraldKill',
    /** 推塔 */
    TurretKilled = 'TurretKilled',
    /** 拆除水晶 */
    InhibKilled = 'InhibKilled',
    /** 团灭（ACE） */
    Ace = 'Ace',
    /** 受伤（血量下降） */
    Injured = 'Injured',
}

/**
 * 事件名称映射
 */
export const LoLEventNames: Record<LoLGameEventType, string> = {
    [LoLGameEventType.GameStart]: '游戏开始',
    [LoLGameEventType.MinionsSpawning]: '兵线刷新',
    [LoLGameEventType.GameEnd]: '游戏结束',
    [LoLGameEventType.ChampionKill]: '击杀英雄',
    [LoLGameEventType.Death]: '死亡',
    [LoLGameEventType.Assist]: '助攻',
    [LoLGameEventType.MultiKill]: '多杀',
    [LoLGameEventType.FirstBlood]: '一血',
    [LoLGameEventType.FirstBrick]: '首拆',
    [LoLGameEventType.DragonKill]: '击杀小龙',
    [LoLGameEventType.BaronKill]: '击杀大龙',
    [LoLGameEventType.HeraldKill]: '击杀峡谷先锋',
    [LoLGameEventType.TurretKilled]: '摧毁防御塔',
    [LoLGameEventType.InhibKilled]: '摧毁水晶',
    [LoLGameEventType.Ace]: '团灭',
    [LoLGameEventType.Injured]: '受伤（掉血）',
};

/**
 * 事件触发配置
 */
export interface LoLEventTriggerConfig {
    /** 事件类型 */
    eventType: LoLGameEventType;
    /** 是否启用 */
    enabled: boolean;
    /** 触发的指令ID (0-6) */
    commandId: number;
}

/**
 * 英雄联盟游戏配置
 */
export interface LoLGameConfig {
    /** 是否启用英雄联盟联动 */
    enabled: boolean;
    /** 轮询间隔 (毫秒) */
    pollInterval: number;
    /** 事件触发配置列表 */
    eventTriggers: LoLEventTriggerConfig[];
}

/**
 * Live Client Data API 响应类型
 */
export interface LoLAllGameData {
    activePlayer: LoLActivePlayer;
    allPlayers: LoLPlayer[];
    events: LoLEvents;
    gameData: LoLGameData;
}

export interface LoLActivePlayer {
    riotId: string;
    riotIdGameName: string;
    summonerName: string;
    level: number;
    currentGold: number;
    championStats: Record<string, number>;
}

export interface LoLPlayer {
    riotId: string;
    riotIdGameName: string;
    summonerName: string;
    championName: string;
    team: 'ORDER' | 'CHAOS';
    position: string;
    scores: LoLPlayerScores;
    isDead: boolean;
    respawnTimer: number;
}

export interface LoLPlayerScores {
    kills: number;
    deaths: number;
    assists: number;
    creepScore: number;
    wardScore: number;
}

export interface LoLEvents {
    Events: LoLEvent[];
}

export interface LoLEvent {
    EventID: number;
    EventName: string;
    EventTime: number;
    KillerName?: string;
    VictimName?: string;
    Assisters?: string[];
    DragonType?: string;
    Stolen?: string;
    TurretKilled?: string;
    InhibKilled?: string;
    Acer?: string;
    AcingTeam?: string;
    KillStreak?: number;
}

export interface LoLGameData {
    gameMode: string;
    gameTime: number;
    mapName: string;
    mapNumber: number;
    mapTerrain: string;
}

/**
 * 局内信息（用于前端展示）
 */
export interface LoLLiveGameInfo {
    playerName: string;
    playerTeam: string;
    gameData: LoLGameData;
    players: LoLPlayer[];
}

/**
 * 游戏状态
 */
export interface GameStatus {
    deviceConnected: boolean;
    lolConnected: boolean;
    inGame: boolean;
    playerName: string;
}

/**
 * 默认事件触发配置
 */
export const DEFAULT_EVENT_TRIGGERS: LoLEventTriggerConfig[] = [
    { eventType: LoLGameEventType.ChampionKill, enabled: true, commandId: 1 },
    { eventType: LoLGameEventType.Death, enabled: true, commandId: 2 },
    { eventType: LoLGameEventType.Assist, enabled: true, commandId: 0 },
    { eventType: LoLGameEventType.MultiKill, enabled: true, commandId: 3 },
    { eventType: LoLGameEventType.FirstBlood, enabled: true, commandId: 3 },
    { eventType: LoLGameEventType.MinionsSpawning, enabled: false, commandId: 0 },
    { eventType: LoLGameEventType.FirstBrick, enabled: true, commandId: 1 },
    { eventType: LoLGameEventType.DragonKill, enabled: true, commandId: 2 },
    { eventType: LoLGameEventType.BaronKill, enabled: true, commandId: 3 },
    { eventType: LoLGameEventType.HeraldKill, enabled: true, commandId: 1 },
    { eventType: LoLGameEventType.TurretKilled, enabled: true, commandId: 1 },
    { eventType: LoLGameEventType.InhibKilled, enabled: true, commandId: 2 },
    { eventType: LoLGameEventType.Ace, enabled: true, commandId: 4 },
    { eventType: LoLGameEventType.Injured, enabled: false, commandId: 0 },
];

/**
 * 默认英雄联盟配置
 */
export const DEFAULT_LOL_CONFIG: LoLGameConfig = {
    enabled: false,
    pollInterval: 1000,
    eventTriggers: DEFAULT_EVENT_TRIGGERS,
};
