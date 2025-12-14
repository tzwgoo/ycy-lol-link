import { ApiResponse } from "../apis/webApi";

export class ApiError extends Error {
    public response: any;

    constructor(message: string, response: any) {
        super(message);
        this.response = response;
    }

    public get status(): number {
        return this.response?.status ?? -1;
    }

    public toString(): string {
        return `API request failed: ${this.message}`;
    }
};

export function handleApiResponse(response: ApiResponse<any>) {
    console.log('API Response:', response); // 调试日志
    if (!response) {
        throw new ApiError('No response received', response);
    }
    if (response.status !== 1) {
        throw new ApiError(response.message || `Request failed with status: ${response.status}`, response);
    }
}