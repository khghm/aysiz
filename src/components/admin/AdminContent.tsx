import AdminHome from './AdminHome';
import AdminOrders from './AdminOrders';
import AdminProducts from './AdminProducts';
import AdminReports from './AdminReports';
import AdminFinance from './AdminFinance';
import AdminCustomers from './AdminCustomers';
import AdminReviews from './AdminReviews';
import AdminDiscounts from './AdminDiscounts';
import AdminGrowth from './AdminGrowth';
import AdminReturns from './AdminReturns';
import AdminSupport from './AdminSupport';
import AdminOperations from './AdminOperations';
import AdminSystem from './AdminSystem';
import AdminSettings from './AdminSettings';
import AdminInsights from './AdminInsights';
import AdminAffiliates from './AdminAffiliates';
import AdminPOS from './AdminPOS';
import AdminContentManager from './AdminContentManager';
import AdminVendors from './AdminVendors';
import AdminLogistics from './AdminLogistics';
import AdminTasks from './AdminTasks';

export default function AdminContent({ section }: { section: string }) {
  switch (section) {
    case 'home': return <AdminHome />;
    case 'orders': return <AdminOrders />;
    case 'products': return <AdminProducts />;
    case 'reports': return <AdminReports />;
    case 'finance': return <AdminFinance />;
    case 'customers': return <AdminCustomers />;
    case 'reviews': return <AdminReviews />;
    case 'discounts': return <AdminDiscounts />;
    case 'growth': return <AdminGrowth />;
    case 'returns': return <AdminReturns />;
    case 'support': return <AdminSupport />;
    case 'operations': return <AdminOperations />;
    case 'system': return <AdminSystem />;
    case 'settings': return <AdminSettings />;
    case 'insights': return <AdminInsights />;
    case 'affiliates': return <AdminAffiliates />;
    case 'pos': return <AdminPOS />;
    case 'content': return <AdminContentManager />;
    case 'vendors': return <AdminVendors />;
    case 'logistics': return <AdminLogistics />;
    case 'tasks': return <AdminTasks />;
    default: return <AdminHome />;
  }
}
