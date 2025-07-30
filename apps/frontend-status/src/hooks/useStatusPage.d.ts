import type { StatusPageData } from '../types';
interface UseStatusPageResult {
    data: StatusPageData | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    lastUpdated: number | null;
}
export declare const useStatusPage: () => UseStatusPageResult;
export {};
//# sourceMappingURL=useStatusPage.d.ts.map