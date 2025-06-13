// src/pages/AboutPage.jsx
import PageLayout from '../components/PageLayout';

export default function AboutPage() {
  // Hero section for the about page
  const AboutHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            About My Water Quality
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Meet our founder and learn about our mission to make drinking water testing accessible to all Canadians
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout hero={<AboutHero />}>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Section 1: About Tecia White */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-blue-50 px-8 py-6 border-b border-blue-100">
              <h2 className="text-3xl font-bold text-gray-900 text-center">
                About Tecia White M.Sc., P.Geo
              </h2>
            </div>
            
            <div className="px-8 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Image Column */}
                <div className="lg:col-span-1">
                  <div className="relative">
                    <img
                      src="/images/tecia_white.jpg"
                      alt="Tecia White, M.Sc., P.Geo - Founder of My Water Quality"
                      className="w-full h-auto rounded-lg shadow-md object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    {/* Fallback if image doesn't load */}
                    <div className="hidden w-full h-64 bg-blue-100 rounded-lg shadow-md items-center justify-center">
                      <div className="text-center">
                        <svg className="h-16 w-16 text-blue-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="text-blue-600 font-medium">Tecia White</p>
                        <p className="text-blue-500 text-sm">M.Sc., P.Geo</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Professional Credentials */}
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Professional Credentials</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                        <span><strong>M.Sc.</strong> Hydrogeology, University of Toronto</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                        <span><strong>Honours Degree</strong> Geology, McMaster University</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                        <span><strong>P.Geo</strong> Professional Geoscientist</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                        <span><strong>25+ Years</strong> Hydrogeology Experience</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {/* Content Column */}
                <div className="lg:col-span-2">
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700 text-lg leading-relaxed mb-6">
                      I have been a practicing hydrogeologist for over 25 years with expertise in completing water quality and quantity analysis. During this time, I have provided hands-on water quality testing and reporting services for homeowners on their domestic water supplies.
                    </p>
                    
                    <p className="text-gray-700 text-lg leading-relaxed mb-6">
                      Over the years I have seen an increase in rural and city homeowners looking to learn more about the quality of their drinking water supply. To do this, they are retaining experts, like myself, to complete the testing and to provide an explanation of the results in a detailed hydrogeological report.
                    </p>
                    
                    <p className="text-gray-700 text-lg leading-relaxed mb-8">
                      I have an Honours Degree in Geology from McMaster University, and a Masters Degree in Hydrogeology from University of Toronto. I have also continued my education with advanced water quality courses through University of Waterloo and Fractured Rock Educational Services.
                    </p>
                    
                    {/* Education & Training Section */}
                    <div className="bg-blue-50 rounded-lg p-6 mt-8">
                      <h3 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
                        <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                        Education & Continued Learning
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-blue-800 mb-2">Formal Education</h4>
                          <ul className="text-blue-700 text-sm space-y-1">
                            <li>• Masters in Hydrogeology - University of Toronto</li>
                            <li>• Honours Geology - McMaster University</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-800 mb-2">Advanced Training</h4>
                          <ul className="text-blue-700 text-sm space-y-1">
                            <li>• Advanced Water Quality Courses - University of Waterloo</li>
                            <li>• Fractured Rock Educational Services</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Why Are We Doing This? */}
        <section>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-blue-50 px-8 py-6 border-b border-blue-100">
              <h2 className="text-3xl font-bold text-gray-900 text-center">
                Why Are We Doing This?
              </h2>
            </div>
            
            <div className="px-8 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Content Column */}
                <div className="lg:col-span-2 order-2 lg:order-1">
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-700 text-lg leading-relaxed mb-6">
                      With the objectives of <strong className="text-blue-600">increasing access to affordable water testing</strong> and <strong className="text-blue-600">advancing homeowners' knowledge</strong> on their drinking water quality, I have brought a team of experts together to develop My Water Quality.
                    </p>
                    
                    <p className="text-gray-700 text-lg leading-relaxed mb-8">
                      The My Water Quality team has partnered with a laboratory to bring this water supply sampling and reporting service to homeowners across Canada.
                    </p>
                    
                    {/* Laboratory Credentials */}
                    <div className="bg-green-50 rounded-lg p-6 mb-8">
                      <h3 className="text-xl font-semibold text-green-900 mb-4 flex items-center">
                        <svg className="h-6 w-6 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Laboratory Accreditation & Licensing
                      </h3>
                      <p className="text-green-800 mb-4">
                        Our laboratory partner maintains the highest standards of quality and compliance:
                      </p>
                      <ul className="space-y-3 text-green-700">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span><strong>ISO/IEC 17025 Accredited</strong> through the Canadian Association of Laboratory Accreditation (CALA)</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span><strong>Licensed by MECP</strong> under the Safe Drinking Water Act by the Ministry of the Environment, Conservation and Parks</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                          <span><strong>CCIL Member</strong> - Proud member of the Canadian Council of Independent Laboratories</span>
                        </li>
                      </ul>
                    </div>
                    
                    {/* Mission Statement */}
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-blue-900 mb-3 flex items-center">
                        <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Our Mission
                      </h3>
                      <p className="text-blue-800 text-lg font-medium">
                        Making professional water quality testing accessible and affordable for every Canadian homeowner, 
                        while providing clear, actionable insights about their drinking water.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Image Column */}
                <div className="lg:col-span-1 order-1 lg:order-2">
                  <div className="relative">
                    <img
                      src="/images/tecia_white_about.jpg"
                      alt="Tecia White and the My Water Quality team"
                      className="w-full h-auto rounded-lg shadow-md object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    {/* Fallback if image doesn't load */}
                    <div className="hidden w-full h-64 bg-blue-100 rounded-lg shadow-md items-center justify-center">
                      <div className="text-center">
                        <svg className="h-16 w-16 text-blue-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-blue-600 font-medium">My Water Quality Team</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Values Box */}
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Our Core Values</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                        <span><strong>Accessibility</strong> - Making testing affordable</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                        <span><strong>Education</strong> - Clear, understandable results</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                        <span><strong>Quality</strong> - Professional laboratory standards</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                        <span><strong>Trust</strong> - 25+ years of expertise</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Learn About Your Water Quality?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            With over 25 years of expertise and certified laboratory partnerships, 
            we're here to help you understand and improve your drinking water quality.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/test-kits"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 8.172V5L8 4z" />
              </svg>
              Get Your Water Tested
            </a>
            <a
              href="/contact"
              className="inline-flex items-center px-6 py-3 border border-blue-600 text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors duration-200"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Contact Our Experts
            </a>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}