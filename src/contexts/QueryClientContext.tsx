import React, { createContext, useContext, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Créer un QueryClient local pour Player-map
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutes par défaut
      gcTime: 5 * 60 * 1000,    // 5 minutes en cache
    },
  },
});

interface QueryClientContextType {
  queryClient: QueryClient;
}

const QueryClientContext = createContext<QueryClientContextType>({
  queryClient,
});

interface QueryClientProviderProps {
  children: ReactNode;
}

export const PlayerMapQueryClientProvider: React.FC<QueryClientProviderProps> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export const useQueryClientContext = () => {
  const context = useContext(QueryClientContext);
  return context.queryClient;
};
