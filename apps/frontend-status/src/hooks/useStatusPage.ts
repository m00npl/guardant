import { useState, useEffect, useCallback } from 'react';
import { statusAPI } from '../utils/api';
import type { StatusPageData } from '../types';

interface UseStatusPageResult {
  data: StatusPageData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: number | null;
}

export const useStatusPage = (): UseStatusPageResult => {
  const [data, setData] = useState<StatusPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const statusData = await statusAPI.getStatusPage();
      setData(statusData);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status data');
      console.error('Status page fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up real-time updates via SSE
  useEffect(() => {
    if (!data) return;

    const eventSource = statusAPI.subscribeToUpdates((update) => {
      setData((prevData) => {
        if (!prevData) return prevData;
        
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
  useEffect(() => {
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