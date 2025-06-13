// src/components/Footer.jsx - Enhanced with Contact Us link
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold text-white mb-4">My Water Quality</h3>
            <p className="text-gray-300 mb-4">
              Professional drinking water testing services for Canadian homes and businesses. 
              Get the knowledge you need to make informed decisions about your drinking water quality.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-300 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/careers" className="text-gray-300 hover:text-white transition-colors">Careers</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link to="/help" className="text-gray-300 hover:text-white transition-colors">Help Center</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors">Get Support</Link></li>
              <li><Link to="/privacy" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-and-conditions" className="text-gray-300 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-center text-gray-300 mb-4 md:mb-0">
              © 2025 My Water Quality. All rights reserved.
            </p>
            
            {/* Quick Contact Info */}
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-300">
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>info@mywaterquality.ca</span>
              </div>
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Mon-Fri 9AM-5PM EST</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}