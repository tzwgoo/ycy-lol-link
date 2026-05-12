import { RouteLocationNormalizedLoaded } from "vue-router";
import type { ChartParamDef } from "../charts/types/ChartParamDef";

export function parseChartParams(route: RouteLocationNormalizedLoaded): Record<string, string> {
    const result: Record<string, any> = {};
    const params = (route.meta?.params as ChartParamDef[] | undefined) ?? [];

    for (const paramDef of params) {
        const value = route.query[paramDef.prop];
        if (value !== undefined && typeof value === 'string') {
            switch (paramDef.type) {
                case 'boolean':
                    result[paramDef.prop] = value === 'true' || value === '1';
                    break;
                case 'int':
                    result[paramDef.prop] = parseInt(value);
                    break;
                case 'float':
                    result[paramDef.prop] = parseFloat(value);
                    break;
                default:
                    result[paramDef.prop] = value;
                    break;
            }
        }
    }

    return result;
}
