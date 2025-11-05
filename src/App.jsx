// src/App.jsx - Complete version with updated routing
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthRedirect from './components/AuthRedirect';
import CallbackDebugger from './components/CallbackDebugger';
import ScrollToTop from './components/ScrollToTop';
import LegacyKitClaimPage from './pages/LegacyKitClaimPage';
import TestKitDetailPage from './pages/TestKitDetailPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import HomePage from './pages/HomePage';
import UserPage from './pages/UserPage';
import TestKitsPage from './pages/TestKitsPage';
import WaterSamplingInstructionsPage from './pages/WaterSamplingInstructionsPage';
import CheckoutPage from './pages/CheckoutPage';
import PayPalTest from './components/PayPalTest';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import WaterQualityStandardsPage from './pages/WaterQualityStandardsPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import ProcessPage from './pages/ProcessPage';
// import ReportPage from './pages/ReportPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import KitRegistrationPage from './pages/KitRegistrationPage';
import AdminPage from './pages/AdminPage';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import InsightsPage from './pages/InsightsPage';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import NewsletterPage from './pages/NewsletterPage';
import BlogIndexPage from './pages/BlogIndexPage';  
import PfasBlogPage from './pages/PfasBlogPage';    
import LeadBlogPage from './pages/LeadBlogPage';
import ArsenicBlogPage from './pages/ArsenicBlogPage';
import { useEffect } from 'react';
import PartnerShopPage from './pages/PartnerShopPage';
import PartnerPortalPage from './pages/PartnerPortalPage';
import PartnerProtectedRoute from './components/PartnerProtectedRoute';

export default function App() {
  // Add a state to check if Tailwind is loaded
  // const [setTailwindWorks] = useState(null);

  useEffect(() => {
    // Simple check to see if Tailwind styles are applied
    const testElement = document.createElement('div');
    testElement.className = 'hidden';
    document.body.appendChild(testElement);
    
    // Check computed style - if hidden is working, Tailwind is likely working
    // const computedStyle = window.getComputedStyle(testElement);
    // setTailwindWorks(computedStyle.display === 'none');
    
    document.body.removeChild(testElement);
    
    // console.log('Tailwind CSS working?', computedStyle.display === 'none');
  }, );

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          {/* Scroll to top on route changes */}
          <ScrollToTop />
          
          {/* Add callback debugger (invisible component) */}
          {/* <CallbackDebugger /> */}
          
          {/* ADD THIS LINE - Cart Debugger
          <CartDebugger /> */}
          
          {/* Add a simple visual indicator of Tailwind status */}
          {/* {tailwindWorks !== null && (
            <div style={{ 
              position: 'fixed', 
              bottom: '10px', 
              right: '10px', 
              padding: '8px', 
              backgroundColor: tailwindWorks ? '#10B981' : '#EF4444',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              zIndex: 9999
            }}>
              Tailwind CSS: {tailwindWorks ? 'Working' : 'Not Working'}
            </div>
          )} */}
          
          <Routes>
            {/* Public home page */}
            <Route path="/" element={<HomePage />} />
            
            {/* Public test kits page */}
            <Route path="/shop" element={<TestKitsPage />} />

            {/* Individual test kit detail pages */}
            <Route path="/shop/:slug" element={<TestKitDetailPage />} />
            
            {/* Public Canada's water page */}
            <Route path="/about-canadas-drinking-water" element={<WaterQualityStandardsPage />} />

            {/* Public Contact page */}
            <Route path="/contact" element={<ContactPage />} />

            {/* Public About Us page */}
            <Route path="/about-us" element={<AboutPage />} />

            {/* Public FAQ page */}
            <Route path="/faq" element={<FAQPage />} />

            {/* Demo Report Page (Public) */}
            {/* <Route path="/demo-report" element={<ReportPage />} /> */}
            
            {/* Public Terms and Conditions page */}
            <Route path="/terms-and-conditions" element={<TermsConditionsPage/>} />

            {/* Public Process page */}
            <Route path="/process" element={<ProcessPage />} />

            {/* Public Water Sampling Instructions */}
            <Route path="/sampling-instructions" element={<WaterSamplingInstructionsPage />} />

            {/* Partner shop route - Public */}
            <Route path="/shop/:partnerSlug" element={<PartnerShopPage />} />


            {/* Public Blog Index page - Landing page for all blog articles */}
            <Route path="/blog" element={<BlogIndexPage />} />


            {/* Individual Blog Articles */}
            <Route path="/blog/pfas-in-canadian-water" element={<PfasBlogPage />} />
            <Route path="/blog/lead-in-canadian-water" element={<LeadBlogPage />} />
            <Route path="/blog/arsenic-in-canadian-water" element={<ArsenicBlogPage />} />

            {/* PAYPAL TEST ROUTE - Add this temporarily */}
            {/* <Route path="/paypal-test" element={<PayPalTest />} /> */}

            {/* Protected kit registration page */}
            <Route 
              path="/register-kit" 
              element={
                <ProtectedRoute>
                  <KitRegistrationPage />
                </ProtectedRoute>
              } 
            />

            {/* Protected legacy kit claim page (not in navigation) */}
            <Route 
              path="/claim-kit" 
              element={
                <ProtectedRoute>
                  <LegacyKitClaimPage />
                </ProtectedRoute>
              } 
            />
          
            
            {/* Protected checkout page */}
            <Route 
              path="/checkout" 
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected order history page */}
            <Route 
              path="/orders" 
              element={
                <ProtectedRoute>
                  <OrderHistoryPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected user dashboard */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <UserPage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/dashboard/insights" 
              element={
                <ProtectedRoute>
                  <InsightsPage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/orders" 
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/dashboard/reports" 
              element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              } 
            />

            {/* Shared report detail page - accessible by both customers and admins */}
            <Route 
              path="/dashboard/reports/:kitCode" 
              element={
                <ProtectedRoute>
                  <ReportDetailPage />
                </ProtectedRoute>
              } 
            />

            {/* Admin-accessible report detail page - same component, different context */}
            <Route 
              path="/admin/reports/:kitCode" 
              element={
                <AdminProtectedRoute>
                  <ReportDetailPage />
                </AdminProtectedRoute>
              } 
            />

            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />

            {/* Protected admin dashboard */}
            <Route 
              path="/admin-dashboard" 
              element={
                <AdminProtectedRoute>
                  <AdminPage />
                </AdminProtectedRoute>
              } 
            />

            {/* Partner portal route - Protected */}
            <Route 
              path="/partner-portal" 
              element={
                <PartnerProtectedRoute>
                  <PartnerPortalPage />
                </PartnerProtectedRoute>
              } 
            />
            
            {/* Public routes */}
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Public Newsletter page */}
<Route path="/newsletter" element={<NewsletterPage />} />

            {/* Update Password Page */}
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            
            {/* Auth redirect handler - This handles both URL parameters and hash fragments */}
            <Route path="/auth/callback" element={<AuthRedirect />} />
            
            {/* Catch all other routes and redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}