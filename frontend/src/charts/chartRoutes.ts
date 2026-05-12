import type { RouteRecordRaw } from 'vue-router';
import ViewerPlaceholder from './ViewerPlaceholder.vue';

export const chartRoutes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'viewer-placeholder',
        component: ViewerPlaceholder,
    },
];
