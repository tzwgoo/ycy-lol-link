export type ImWsCommandId = string | number;

export type ImWsClientMessage =
    | {
        type: 'login';
        uid: string;
        token: string;
    }
    | {
        type: 'sendCommand';
        userId: string;
        commandId: ImWsCommandId;
    }
    | {
        type: 'logout';
        userId: string;
    }
    | {
        type: 'ping';
    }
    | {
        type: 'getStatus';
    };

export interface ImWsServerMessage {
    type: string;
    success?: boolean;
    message?: string;
    data?: Record<string, any>;
    userId?: string;
    timestamp?: number;
}

export function normalizeUserId(uid: string): string {
    return uid.startsWith('game_') ? uid.slice(5) : uid;
}

export function buildLoginMessage(uid: string, token: string): ImWsClientMessage {
    return {
        type: 'login',
        uid,
        token,
    };
}

export function buildSendCommandMessage(userId: string, commandId: ImWsCommandId): ImWsClientMessage {
    return {
        type: 'sendCommand',
        userId,
        commandId,
    };
}

export function buildLogoutMessage(userId: string): ImWsClientMessage {
    return {
        type: 'logout',
        userId,
    };
}

export function isSuccessResponse(message: ImWsServerMessage): boolean {
    return message.success === true;
}
