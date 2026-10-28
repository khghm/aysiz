import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';
import { ShopProvider } from './context/ShopContext';
import { AdminProvider } from './context/AdminContext';
import AppRouter from './components/AppRouter';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ShopProvider>
        <AdminProvider>
          <AppRouter />
        </AdminProvider>
      </ShopProvider>
    </QueryClientProvider>
  );
}
