import Toasts from './shared/Toasts';
import Header from './shared/Header';
import Footer from './shared/Footer';
import HomeView from './storefront/HomeView';
import ShopView from './storefront/ShopView';
import ProductDetail from './storefront/ProductDetail';
import CartView from './storefront/CartView';
import BlogView from './storefront/BlogView';
import BlogPostView from './storefront/BlogPostView';
import PaymentResult from './storefront/PaymentResult';
import CustomerLogin from './storefront/CustomerLogin';
import CustomerAccount from './customer/CustomerAccount';
import AdminPanel from './admin/AdminPanel';
import { useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { useAdmin } from '../context/AdminContext';

export default function AppRouter() {
  const { view, setView } = useShop();
  const { isAdmin } = useAdmin();

  // بازگشت از درگاه پرداخت (زرین‌پال) به مسیر /payment-result
  useEffect(() => {
    if (window.location.pathname === '/payment-result') setView('payment-result');
  }, []);

  if (view === 'admin' || (isAdmin && view !== 'home' && view !== 'shop' && view !== 'product' && view !== 'cart' && view !== 'blog' && view !== 'post' && view !== 'login' && view !== 'account' && view !== 'payment-result')) {
    return <AdminPanel />;
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <Header />
      <main>
        {view === 'home' && <HomeView />}
        {view === 'shop' && <ShopView />}
        {view === 'product' && <ProductDetail />}
        {view === 'cart' && <CartView />}
        {view === 'blog' && <BlogView />}
        {view === 'post' && <BlogPostView />}
        {view === 'login' && <CustomerLogin />}
        {view === 'account' && <CustomerAccount />}
        {view === 'payment-result' && <PaymentResult />}
      </main>
      <Footer />
      <Toasts />
    </div>
  );
}
