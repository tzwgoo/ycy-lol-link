import { ChartParamDef } from "../charts/types/ChartParamDef";

export type ServerInfoResData = {
    server: {
        wsUrl: string,
        clientWsUrls: ClientConnectUrlInfo[],
        apiBaseHttpUrl: string,
    },
};

export type ClientConnectUrlInfo = {
    domain: string;
    connectUrl: string;
};

export type ClientConnectInfoResData = {
    clientId: string,
};

export type CustomSkinInfo = {
    name: string;
    url: string;
    help?: string;
    params?: ChartParamDef[];
};

export type CustomSkinsResData = {
    customSkins: CustomSkinInfo[],
};

export type YcyIMConnectRequest = {
    clientId: string;
    uid: string;
    token: string;
};

export type ApiResponse<T> = {
    status: number,
    message?: string,
} & T;

export const webApi = {
    getServerInfo: async (): Promise<ApiResponse<ServerInfoResData> | null> => {
        try {
            console.log('Fetching server info...');
            const response = await fetch('/api/server_info');
            console.log('Server info response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Server info data:', data);
            return data;
        }
        catch (error) {
            console.error('Failed to get server info:', error);
            return null;
        }
    },
    getClientConnectInfo: async (): Promise<ApiResponse<ClientConnectInfoResData> | null> => {
        try {
            const response = await fetch('/api/client/connect');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Failed to get client connect info:', error);
            return null;
        }
    },
    connectViaYcyIM: async (params: YcyIMConnectRequest): Promise<ApiResponse<{}> | null> => {
        try {
            const response = await fetch('/api/client/connect/ycyim', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });
            return response.json();
        }
        catch (error) {
            console.error('Failed to connect via YcyIM:', error);
            return null;
        }
    },
};