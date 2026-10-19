import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Tooltip from '@radix-ui/react-tooltip';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster, toast } from 'sonner';
import { App } from './App';
import './styles/global.css';
import './styles/ui.css';

const query_client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  // Todo erro de mutação vira toast; nada de alert() do navegador.
  mutationCache: new MutationCache({
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Algo deu errado'),
  }),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={query_client}>
      <Tooltip.Provider delayDuration={250}>
        <App />
      </Tooltip.Provider>
      <Toaster theme="dark" position="bottom-right" richColors closeButton toastOptions={{ className: 'df-toast' }} />
    </QueryClientProvider>
  </StrictMode>,
);
