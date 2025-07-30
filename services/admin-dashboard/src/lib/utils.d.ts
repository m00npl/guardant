import { type ClassValue } from 'clsx';
export declare function cn(...inputs: ClassValue[]): string;
export declare function formatBytes(bytes: number, decimals?: number): string;
export declare function formatNumber(num: number, compact?: boolean): string;
export declare function formatDuration(milliseconds: number): string;
export declare function formatRelativeTime(date: Date | string): string;
export declare function formatPercentage(value: number, decimals?: number): string;
export declare function calculateUptime(uptime: number): {
    color: string;
    label: string;
};
export declare function getStatusColor(status: string): "blue" | "gray" | "green" | "red" | "yellow";
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
export declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
export declare function generateId(length?: number): string;
export declare function copyToClipboard(text: string): any;
export declare function downloadAsJson(data: any, filename: string): void;
export declare function downloadAsCsv(data: any[], filename: string): void;
export declare function validateEmail(email: string): boolean;
export declare function validateUrl(url: string): boolean;
export declare function sanitizeHtml(html: string): any;
export declare function truncateText(text: string, maxLength: number): string;
export declare function parseSearchParams(search: string): Record<string, string>;
export declare function buildSearchParams(params: Record<string, string | number | boolean | undefined>): string;
//# sourceMappingURL=utils.d.ts.map