import 'reflect-metadata'; // 反射元数据

import http from 'http';
import Koa from 'koa';
import WebSocket, { WebSocketServer } from 'ws';
import KoaRouter from 'koa-router';
import serveStatic from "koa-static";
import koaLogger from 'koa-logger';
import { bodyParser } from '@koa/bodyparser';

import { WebSocketRouter } from './utils/WebSocketRouter.js';
import { setupWebSocketServer } from './utils/websocket.js';
import { createSwaggerRouter, setupRouter as initCommonRouter } from './router.js';
import { MainConfig } from './config.js';

// 加载Managers
import './managers/LoLGameManager.js';
import { DGLabPulseService } from './services/DGLabPulse.js';
import { LocalIPAddress, openBrowser } from './utils/utils.js';
import { SiteNotificationService } from './services/SiteNotificationService.js';
import { CustomSkinService } from './services/CustomSkinService.js';
import { createDatabaseConnection } from './database.js';
import { LoLGameManager } from './managers/LoLGameManager.js';
import { ServerContext } from './types/server.js';
import { WebWSManager } from './managers/WebWSManager.js';

// 给 Node 环境补上 WebSocket 以满足依赖浏览器 WebSocket 的 SDK（役次元 IM）
if (!(globalThis as any).WebSocket) {
    (globalThis as any).WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
}

async function main() {
    // blocked((time, stack) => {
    //     console.log(`Blocked for ${time}ms, operation started here:`, stack)
    // });

    await MainConfig.initialize();

    const app = new Koa();
    const httpServer = http.createServer(app.callback());
    
    const database = await createDatabaseConnection(MainConfig.value);
    app.context.database = database; // 将数据库连接挂载到Koa上下文中

    // 在HTTP服务器上创建WebSocket服务器
    const wsServer = new WebSocketServer({
        server: httpServer
    });

    await DGLabPulseService.instance.initialize();
    await SiteNotificationService.instance.initialize();
    await CustomSkinService.instance.initialize();

    const serverContext = {
        database,
    } as ServerContext;

    await LoLGameManager.instance.initialize(serverContext);
    await WebWSManager.instance.initialize(serverContext);

    // 静态资源
    app.use(serveStatic('public'));

    // 中间件
    app.use(bodyParser());

    if (MainConfig.value.enableAccessLogger) {
        app.use(koaLogger());
    }

    const router = new KoaRouter();
    const wsRouter = new WebSocketRouter();

    // 初始化WebSocket路由拦截器
    setupWebSocketServer(wsServer, wsRouter);

    // 加载其他路由
    initCommonRouter(router, wsRouter);

    app.use(router.routes())
        .use(router.allowedMethods());

    // 加载控制器路由
    const swaggerRouter = createSwaggerRouter(MainConfig.value);
    app.use(swaggerRouter.routes())
        .use(swaggerRouter.allowedMethods());

    // 在Electron环境下，使用固定端口3000以便前端连接
    const isElectronEnv = process.env.ELECTRON_ENV === 'true';
    const port = isElectronEnv ? 3000 : (MainConfig.value?.port ?? 8920);
    const host = isElectronEnv ? '127.0.0.1' : (MainConfig.value?.host ?? 'localhost');

    httpServer.listen({
        port,
        host,
    }, () => {
        const serverAddr = httpServer.address();
        let serverAddrStr = '';
        const ipAddrList = LocalIPAddress.getIPAddrList();

        if (serverAddr && typeof serverAddr === 'object') {
            if (serverAddr.family.toLocaleLowerCase() === 'ipv4') {
                serverAddrStr = `http://${serverAddr.address}:${serverAddr.port}`;
            } else {
                serverAddrStr = `http://[${serverAddr.address}]:${serverAddr.port}`;
            }
        } else if (serverAddr && typeof serverAddr === 'string') {
            serverAddrStr = serverAddr;
        }

        console.log(`Server is running at ${serverAddrStr}`);
        if (serverAddr && typeof serverAddr === 'object') {
            console.log(`You can access the console via: http://127.0.0.1:${serverAddr.port}`);

            // 在非Electron环境下自动打开浏览器
            if (!isElectronEnv && MainConfig.value.openBrowser) {
                try {
                    openBrowser(`http://127.0.0.1:${serverAddr.port}`);
                } catch (err) {
                    console.error('Cannot open browser:', err);
                }
            }
        }

        console.log('Local IP Address List:');
        ipAddrList.forEach((ipAddr) => {
            console.log(`  - ${ipAddr}`);
        });
    });
}

main().catch((err) => {
    console.error(err);
});
