// src/pages/WaterQualityStandardsPage.jsx
import PageLayout from '../components/PageLayout';

export default function WaterQualityStandardsPage() {
  // Hero section for the water quality standards page
  const WaterQualityHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Water Quality Standards & Guidelines
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Understanding Canadian drinking water quality standards and common contaminants 
            to help you make informed decisions about your water safety.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout hero={<WaterQualityHero />}>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Water Quality Standards Section */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
              <h2 className="text-2xl font-bold text-blue-900">
                Water Quality Standards
              </h2>
              <p className="text-blue-700 mt-1 font-medium">
                Canadian and Provincial Drinking Water Quality Standards & Guidelines
              </p>
            </div>
            
            <div className="px-6 py-8">
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-4">
                  The Canadian government has set out Guidelines for Canadian Drinking Water Quality 
                  which set out the maximum acceptable concentrations of substances in drinking water 
                  and the basic parameters that every water system should strive to achieve to provide 
                  the safest drinking water possible. These national guidelines are voluntary and non-enforceable.
                </p>
                
                <p className="text-gray-700 leading-relaxed mb-4">
                  In Canada, the provinces and territories have the authority to make decisions regarding 
                  what drinking water standards or guidelines are enforced.
                </p>
                
                <p className="text-gray-700 leading-relaxed">
                  My Water Quality imposes the more stringent of these standards or guidelines to evaluate 
                  the quality of your drinking water.
                </p>
              </div>
              
              {/* Additional info box */}
              <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-green-600 mt-1 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      My Water Quality's Commitment
                    </h3>
                    <p className="text-green-800 text-sm leading-relaxed">
                      We apply the most stringent standards to ensure your water quality assessment 
                      meets or exceeds both federal guidelines and provincial requirements, giving you 
                      the highest level of confidence in your water safety.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Potential Water Quality Concerns Section */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
              <h2 className="text-2xl font-bold text-orange-900">
                Potential Water Quality Concerns
              </h2>
              <p className="text-orange-700 mt-1 font-medium">
                Common Contaminants (Natural and Man-Made) Found in Groundwater Across Canada
              </p>
            </div>
            
            <div className="px-6 py-8">
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  The guidelines for Canadian drinking water quality have been established for various 
                  chemical parameters based on current, published scientific research related to health 
                  effects, aesthetic effects, and operational considerations.
                </p>
                
                {/* Common Contaminants Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  {/* Natural Contaminants */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center">
                      <svg className="h-5 w-5 text-amber-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h.5A2.5 2.5 0 0020 5.5v-1.5" />
                      </svg>
                      Natural Contaminants
                    </h3>
                    <ul className="text-amber-800 text-sm space-y-2">
                      <li>• Naturally occurring minerals (iron, manganese)</li>
                      <li>• Bacteria and microorganisms</li>
                      <li>• Heavy metals from geological sources</li>
                      <li>• Dissolved solids and salts</li>
                    </ul>
                  </div>

                  {/* Man-Made Contaminants */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                      <svg className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Man-Made Contaminants
                    </h3>
                    <ul className="text-red-800 text-sm space-y-2">
                      <li>• Pesticides and herbicides</li>
                      <li>• Industrial chemicals and solvents</li>
                      <li>• Petroleum products and fuel additives</li>
                      <li>• Pharmaceuticals and personal care products</li>
                      <li>• Nitrates from fertilizers</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testing Importance Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg text-white p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">
                Why Regular Drinking Water Testing Matters
              </h2>
              <p className="text-blue-100 mb-6 max-w-3xl mx-auto">
                Understanding these standards and potential contaminants is the first step toward 
                ensuring your drinking water is safe. Regular testing helps identify issues before 
                they become health concerns.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/shop"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  Browse Our Test Kits
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center px-6 py-3 border border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-blue-600 transition-colors duration-200"
                >
                  Speak with an Expert
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Additional Resources */}
        <section>
          <div className="bg-gray-50 rounded-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Additional Resources
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                  <svg className="h-8 w-8 text-blue-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="font-semibold text-gray-900 mb-2">Sampling Guide</h3>
                  <p className="text-gray-600 text-sm mb-4">Learn proper drinking water sampling techniques</p>
                  <a href="/sampling-instructions" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Guide →
                  </a>
                </div>
              </div>

              <div className="text-center">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                  <svg className="h-8 w-8 text-blue-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900 mb-2">FAQ</h3>
                  <p className="text-gray-600 text-sm mb-4">Common questions about drinking water testing</p>
                  <a href="/faq" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Read FAQ →
                  </a>
                </div>
              </div>

              <div className="text-center">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
                  <svg className="h-8 w-8 text-blue-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900 mb-2">Our Process</h3>
                  <p className="text-gray-600 text-sm mb-4">How My Water Quality drinking water testing works</p>
                  <a href="/process" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Learn More →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}