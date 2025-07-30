"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStatusPage = void 0;
const react_1 = require("react");
const api_1 = require("../utils/api");
const useStatusPage = () => {
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [lastUpdated, setLastUpdated] = (0, react_1.useState)(null);
    const fetchData = (0, react_1.useCallback)(async () => {
        try {
            setError(null);
            const statusData = await api_1.statusAPI.getStatusPage();
            setData(statusData);
            setLastUpdated(Date.now());
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch status data');
            console.error('Status page fetch error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    const refetch = (0, react_1.useCallback)(async () => {
        setLoading(true);
        await fetchData();
    }, [fetchData]);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    // Set up real-time updates via SSE
    (0, react_1.useEffect)(() => {
        if (!data)
            return;
        const eventSource = api_1.statusAPI.subscribeToUpdates((update) => {
            setData((prevData) => {
                if (!prevData)
                    return prevData;
                return {
                    ...prevData,
                    ...update,
                    lastUpdated: Date.now(),
                };
            });
            setLastUpdated(Date.now());
        });
        return () => {
            eventSource.close();
        };
    }, [data]);
    // Auto-refresh every 30 seconds as fallback
    (0, react_1.useEffect)(() => {
        const interval = setInterval(() => {
            if (!loading && data) {
                fetchData();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [loading, data, fetchData]);
    return {
        data,
        loading,
        error,
        refetch,
        lastUpdated,
    };
};
exports.useStatusPage = useStatusPage;
//# sourceMappingURL=useStatusPage.js.map