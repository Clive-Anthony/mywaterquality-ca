// src/pages/OrderHistoryPage.jsx - Updated to use OrdersList component
import PageLayout from '../components/PageLayout';
import OrdersList from '../components/OrdersList';

export default function OrderHistoryPage() {
  // Hero section
  const OrderHistoryHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Order History
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            View and track all your water testing kit orders.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout hero={<OrderHistoryHero />}>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <OrdersList 
          showTitle={false} 
          maxHeight="max-h-full" 
          compact={false} 
        />
      </div>
    </PageLayout>
  );
}