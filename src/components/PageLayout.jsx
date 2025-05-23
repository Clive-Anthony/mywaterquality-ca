// src/components/PageLayout.jsx
import TopNav from './TopNav';
import Footer from './Footer';

export default function PageLayout({ children, hero = null }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navigation */}
      <TopNav />
      
      {/* Optional Hero Section */}
      {hero && hero}
      
      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}