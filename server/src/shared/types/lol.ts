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

export const LOL_COMMAND_IDS = [
    'command_zero',
    'command_one',
    'command_two',
    'command_three',
    'command_four',
    'command_five',
    'command_six',
] as const;

export type LoLCommandId = typeof LOL_COMMAND_IDS[number];

/**
 * 事件触发配置
 */
export interface LoLEventTriggerConfig {
    /** 事件类型 */
    eventType: LoLGameEventType;
    /** 是否启用 */
    enabled: boolean;
    /** 触发的英文指令ID */
    commandId: LoLCommandId;
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
    { eventType: LoLGameEventType.ChampionKill, enabled: true, commandId: 'command_one' },
    { eventType: LoLGameEventType.Death, enabled: true, commandId: 'command_two' },
    { eventType: LoLGameEventType.Assist, enabled: true, commandId: 'command_zero' },
    { eventType: LoLGameEventType.MultiKill, enabled: true, commandId: 'command_three' },
    { eventType: LoLGameEventType.FirstBlood, enabled: true, commandId: 'command_three' },
    { eventType: LoLGameEventType.MinionsSpawning, enabled: false, commandId: 'command_zero' },
    { eventType: LoLGameEventType.FirstBrick, enabled: true, commandId: 'command_one' },
    { eventType: LoLGameEventType.DragonKill, enabled: true, commandId: 'command_two' },
    { eventType: LoLGameEventType.BaronKill, enabled: true, commandId: 'command_three' },
    { eventType: LoLGameEventType.HeraldKill, enabled: true, commandId: 'command_one' },
    { eventType: LoLGameEventType.TurretKilled, enabled: true, commandId: 'command_one' },
    { eventType: LoLGameEventType.InhibKilled, enabled: true, commandId: 'command_two' },
    { eventType: LoLGameEventType.Ace, enabled: true, commandId: 'command_four' },
    { eventType: LoLGameEventType.Injured, enabled: false, commandId: 'command_zero' },
];
