import { v4 as uuidv4 } from 'uuid';
import Koa, { Context } from 'koa';
import { body, responses, routeConfig, z } from 'koa-swagger-decorator';
import { LoLGameManager } from '../../managers/LoLGameManager.js';
import { YcyIMManager } from '../../managers/YcyIMManager.js';
import { MainConfig } from '../../config.js';
import { CustomSkinService } from '../../services/CustomSkinService.js';
import { GetClientConnectInfoResponse, GetClientConnectInfoResponseSchema, GetCustomSkinListResponse, GetCustomSkinListResponseSchema, ServerInfoResponse, ServerInfoResponseSchema, WebApiResponseSchema } from './schemas/Web.js';

export class WebController {
    @routeConfig({
        method: 'get',
        path: '/',
        summary: '当没有前端资源时显示的欢迎页面',
        operationId: 'Fallback Index',
        tags: ['Web'],
    })
    @responses(WebApiResponseSchema)
    public async index(ctx: Koa.ParameterizedContext): Promise<void> {
        ctx.body = {
            status: 1,
            code: 'OK',
            message: 'Welcome to LoL Link Server',
        };
    }

    @routeConfig({
        method: 'get',
        path: '/api/server_info',
        summary: '获取服务器信息',
        operationId: 'Get Server Info',
        tags: ['Web'],
    })
    @responses(ServerInfoResponseSchema)
    public async getServerInfo(ctx: Context): Promise<void> {
        const config = MainConfig.value;

        let wsUrl = '';
        if (config.webWsBaseUrl) {
            wsUrl = `${config.webWsBaseUrl}/ws/`;
        } else {
            wsUrl = '/ws/';
        }

        const apiBaseHttpUrl = config.apiBaseHttpUrl ?? config.webBaseUrl ?? `http://127.0.0.1:${config.port}`;

        ctx.body = {
            status: 1,
            code: 'OK',
            server: {
                wsUrl: wsUrl,
                apiBaseHttpUrl,
            },
        } as ServerInfoResponse;
    };

    @routeConfig({
        method: 'get',
        path: '/api/custom_skins',
        summary: '获取自定义皮肤列表',
        operationId: 'Get Custom Skin List',
        tags: ['Web'],
    })
    @responses(GetCustomSkinListResponseSchema)
    public async getCustomSkinList(ctx: Context): Promise<void> {
        ctx.body = {
            status: 1,
            code: 'OK',
            customSkins: CustomSkinService.instance.skins,
        } as GetCustomSkinListResponse;
    }

    @routeConfig({
        method: 'get',
        path: '/api/client/connect',
        summary: '获取客户端连接信息',
        operationId: 'Get Client Connect Info',
        tags: ['Web'],
    })
    @responses(GetClientConnectInfoResponseSchema)
    public async getClientConnectInfo(ctx: Context): Promise<void> {
        let clientId: string = '';
        for (let i = 0; i < 10; i++) {
            clientId = uuidv4();
            if (!YcyIMManager.instance.hasClient(clientId)) {
                break;
            } else {
                clientId = '';
            }
        }

        if (clientId === '') {
            ctx.body = {
                status: 0,
                code: 'ERR::CREATE_CLIENT_ID_FAILED',
                message: '无法创建唯一的客户端ID，请稍后重试',
            };
            return;
        }

        ctx.body = {
            status: 1,
            code: 'OK',
            clientId,
        } as GetClientConnectInfoResponse;
    }

    public async notImplemented(ctx: Context): Promise<void> {
        ctx.body = {
            status: 0,
            code: 'ERR::NOT_IMPLEMENTED',
            message: '此功能尚未实现',
        };
    }

    /**
     * 通过役次元IM连接设备
     */
    @routeConfig({
        method: 'post',
        path: '/api/client/connect/ycyim',
        summary: '通过役次元IM连接设备',
        operationId: 'Connect Via YcyIM',
        tags: ['Web'],
    })
    @body(z.object({
        clientId: z.string().describe('客户端ID'),
        uid: z.string().describe('役次元用户ID'),
        token: z.string().describe('役次元认证Token'),
    }))
    @responses(WebApiResponseSchema)
    public async connectViaYcyIM(ctx: Context): Promise<void> {
        const { clientId, uid, token } = ctx.request.body as { clientId: string; uid: string; token: string };

        if (!clientId || !uid || !token) {
            ctx.body = {
                status: 0,
                code: 'ERR::INVALID_PARAMS',
                message: '缺少必要参数: clientId, uid, token',
            };
            return;
        }

        try {
            await LoLGameManager.instance.connectViaYcyIM(clientId, { uid, token });

            ctx.body = {
                status: 1,
                code: 'OK',
                message: '役次元IM连接成功',
                clientId,
            };
        } catch (error: any) {
            console.error('役次元IM连接失败:', error);
            ctx.body = {
                status: 0,
                code: 'ERR::YCYIM_CONNECT_FAILED',
                message: `役次元IM连接失败: ${error.message}`,
            };
        }
    }
}
