import { z } from 'koa-swagger-decorator';

/**
 * 役次元IM连接配置
 */
export const YcyIMConfigSchema = z.object({
    uid: z.string().describe('用户ID，从役次元APP获取'),
    token: z.string().describe('认证Token，从役次元APP获取'),
});
export type YcyIMConfig = z.infer<typeof YcyIMConfigSchema>;

/**
 * 役次元IM认证响应
 */
export interface YcyIMAuthResponse {
    code: number;
    msg: string;
    data?: {
        appid: string;
        sign: string;
    };
}

/**
 * 役次元IM消息格式
 */
export interface YcyIMMessage {
    code: string;
    id?: string;
    data?: number;
    token?: string;
    payload?: Record<string, any>;
}
