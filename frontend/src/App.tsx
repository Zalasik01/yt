import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AgendaPage } from './pages/AgendaPage';
import { ApprovalPage } from './pages/ApprovalPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { FactoryPage } from './pages/FactoryPage';
import { PublishedPage } from './pages/PublishedPage';
import { ShortsPage } from './pages/ShortsPage';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <FactoryPage /> },
      { path: '/aprovacao', element: <ApprovalPage /> },
      { path: '/agenda', element: <AgendaPage /> },
      { path: '/shorts', element: <ShortsPage /> },
      { path: '/publicados', element: <PublishedPage /> },
      { path: '/canais', element: <ChannelsPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
