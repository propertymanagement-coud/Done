import { useQuery } from '@tanstack/react-query';
import type { Property } from '@/lib/types';
import { supabase, initPromise } from '@/lib/supabase';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PropertiesApiResponse {
  success: boolean;
  data: {
    properties: Property[];
    pagination: PaginationInfo;
  };
  message?: string;
}

export function useProperties() {
  const { data, isLoading: loading, error } = useQuery<PropertiesApiResponse>({
    queryKey: ['/api/v2/properties'],
    queryFn: async () => {
      await initPromise;
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY && supabase) {
        console.log('[useProperties] Fetching directly from Supabase');
        const { data: properties, error } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('[useProperties] Supabase error:', error);
          throw error;
        }
        
        console.log('[useProperties] Found properties:', properties?.length);
        
        return {
          success: true,
          data: {
            properties: (properties || []) as Property[],
            pagination: {
              page: 1,
              limit: 100,
              total: properties?.length || 0,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false
            }
          }
        };
      }

      const res = await fetch('/api/v2/properties');
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json();
    },
    staleTime: 60000,
    refetchOnMount: true,
  });

  const properties = data?.data?.properties || [];

  return { properties, loading, error };
}

export function useAllProperties() {
  return useProperties();
}
