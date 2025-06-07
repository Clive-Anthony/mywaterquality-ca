// src/pages/HomePage.jsx
import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <TopNav />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Hero Image - Left side */}
            <div className="order-2 lg:order-1">
              <div className="relative">
                <img
                  src="/images/MWQ_Home_Hero.jpg"
                  alt="My Water Quality - Professional Drinking Water Testing"
                  className="w-full h-auto rounded-lg shadow-2xl"
                />
              </div>
            </div>

            {/* Hero Content - Right side */}
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
                Curious about what is in your drinking water?
              </h1>
              <p className="mt-6 text-xl text-blue-100 lg:max-w-none">
                We can tell you! My Water Quality provides comprehensive drinking water testing results in an understandable report card format that gives you the knowledge to make informed decisions about the safety of drinking water.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  TEST MY WATER
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="learn-more" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Why Choose My Water Quality?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Professional drinking water testing made simple and accessible for everyone
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center">
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Comprehensive Testing</h3>
              <p className="mt-2 text-gray-600">
                Test for natural and man-made contaminants including bacteria, heavy metals, pesticides, and more.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center">
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Easy-to-Read Results</h3>
              <p className="mt-2 text-gray-600">
                Get your results in a clear, report card format that's easy to understand and act upon.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center">
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Fast Results</h3>
              <p className="mt-2 text-gray-600">
                Receive your detailed water quality report within 5-7 business days of submitting your sample.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Simple steps to get your water tested
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="text-center">
              <div className="flex justify-center">
                <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-lg">
                  1
                </div>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Order Your Kit</h3>
              <p className="mt-2 text-gray-600">
                Choose your testing kit and we'll ship it directly to your home.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="flex justify-center">
                <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Collect Your Sample</h3>
              <p className="mt-2 text-gray-600">
                Follow the simple instructions to collect your water sample at home.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="flex justify-center">
                <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-lg">
                  3
                </div>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Get Your Results</h3>
              <p className="mt-2 text-gray-600">
                Receive detailed results and recommendations within a week.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to Test Your Water?
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Join thousands of Canadians who trust My Water Quality for their water testing needs.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/test-kits"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
            >
              Browse Test Kits
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center px-8 py-3 border border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
            >
              Get Started Today
            </Link>
          </div>
        </div>
      </section>

      {/* Why Sample Your Water Video Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content - Left side */}
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-6">
                Why Should I Sample My Water?
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Testing the quality of your drinking water on a regular basis is an important part of maintaining a safe and reliable source. This will help ensure that the water source is being properly protected from potential contamination.
              </p>
              <Link
                to="/process"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Learn About the Process
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Video - Right side */}
            <div className="order-1 lg:order-2">
              <div className="relative rounded-lg overflow-hidden shadow-xl">
                <div className="aspect-w-16 aspect-h-9">
                  <iframe
                    src="https://www.youtube.com/embed/wuNShId7NGE"
                    title="Why Should I Sample My Water - My Water Quality"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                    style={{ aspectRatio: '16/9', minHeight: '300px' }}
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}