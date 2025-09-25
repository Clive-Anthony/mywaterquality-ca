// src/pages/BlogPage.jsx
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <TopNav />

      {/* Hero Section with Background Pattern */}
      <section className="relative py-16 bg-gradient-to-r from-blue-600 to-blue-800 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="water-waves" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M0,50 Q25,25 50,50 T100,50" stroke="white" strokeWidth="2" fill="none" opacity="0.3"/>
                <path d="M0,60 Q25,35 50,60 T100,60" stroke="white" strokeWidth="1.5" fill="none" opacity="0.2"/>
                <path d="M0,40 Q25,15 50,40 T100,40" stroke="white" strokeWidth="1" fill="none" opacity="0.1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#water-waves)" />
          </svg>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl mb-6">
            Water Quality Blog
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Stay informed about water quality issues, testing insights, and health impacts across Canada
          </p>
        </div>
      </section>

      {/* Blog Content Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Article Header */}
          <article className="bg-white rounded-lg shadow-lg overflow-hidden">
            
            {/* Featured Image */}
<div className="h-64 sm:h-80 bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center border-b overflow-hidden">
  <img
    src="/images/blog/pfas-featured-image.jpg"
    alt="PFAS in Canadian Water - Featured Image"
    className="w-full h-full object-cover"
    onError={(e) => {
      // Fallback to placeholder if image fails to load
      e.target.style.display = 'none';
      e.target.nextSibling.style.display = 'flex';
    }}
  />
  {/* Fallback placeholder - hidden by default */}
  <div className="text-center text-gray-500" style={{ display: 'none' }}>
    <svg className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <p className="text-sm font-medium">Featured Image Loading...</p>
  </div>
</div>

            <div className="p-8 sm:p-12">
              
              {/* Article Meta */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">MWQ</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">My Water Quality Team</p>
                    <p className="text-xs text-gray-500">Published January 2025</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">2-3 min read</p>
                </div>
              </div>

              {/* Article Content */}
              <div className="prose prose-lg max-w-none">
                
                {/* Title */}
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                  PFAS in Canadian Water: What You Need to Know About 'Forever Chemicals'
                </h1>

                <p className="text-lg text-gray-600 mb-8 leading-relaxed italic">
                  Estimated reading time: 2-3 minutes
                </p>

                <p className="text-lg leading-relaxed mb-6">
                  If you've been following water quality news across Canada, you've likely heard about PFAS – the so-called "forever chemicals" causing increasing concern from coast to coast. As a drinking water testing company serving Canadian communities, we believe it's crucial to help you understand what PFAS are and what steps you can take to protect your family's health.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">What Are PFAS?</h2>

                <p className="mb-6">
                  Per- and polyfluoroalkyl substances (PFAS) are a family of over 15,000 synthetic chemicals manufactured since the 1940s. They earned the nickname "forever chemicals" because they don't break down naturally – persisting for hundreds or thousands of years in the environment and our bodies.
                </p>

                <p className="mb-6">
                  You'll find PFAS in non-stick cookware, waterproof clothing, firefighting foams, and food packaging.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Health Concerns</h2>

                <p className="mb-4">Research has linked PFAS exposure to serious health effects:</p>

                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li><strong>Cancer risk</strong> (kidney and testicular cancers)</li>
                  <li><strong>Liver and kidney damage</strong></li>
                  <li><strong>Immune system disruption</strong></li>
                  <li><strong>Reproductive and developmental issues</strong></li>
                  <li><strong>Hormonal imbalances</strong></li>
                </ul>

                <p className="mb-6">
                  PFAS accumulate in our bodies over time, meaning even low-level exposure can become problematic over time.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">PFAS Across Canada: Current Situation</h2>

                <p className="mb-6">
                  Recent CBC News investigations reveal PFAS contamination is more widespread across Canada than many realize. <a href="https://newsinteractives.cbc.ca/features/2025/pfas-great-lakes/" className="text-blue-600 hover:text-blue-800 underline">CBC's analysis</a> found that Great Lakes and St. Lawrence tap water samples had median PFAS concentrations of 15 nanograms per litre (ng/L), compared to just 4 ng/L in the rest of Canada – affecting millions of Canadians who rely on these water sources.
                </p>

                <p className="mb-6">
                  While currently below Health Canada's 30 ng/L drinking water objective, experts warn thresholds may become stricter as research continues. PFAS contamination has been documented across the country, from <a href="https://www.cbc.ca/news/pfas-torbay-spread-1.7630010" className="text-blue-600 hover:text-blue-800 underline">Torbay, Newfoundland</a>, where contamination spread 3.5 kilometres from St. John's International Airport, to military bases and airports from coast to coast.
                </p>

                <p className="mb-6">
                  Federal data shows over 130 federal sites across Canada have confirmed or suspected PFAS contamination, many at military installations, airports, and firefighting training facilities where PFAS-containing foams were historically used.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Canada's Regulatory Response</h2>

                <p className="mb-6">
                  Health Canada established a drinking water objective of 30 ng/L for the sum of 25 PFAS compounds in 2024, significantly lowering previous limits that applied to only two compounds (PFOS at 600 ng/L and PFOA at 200 ng/L).
                </p>

                <p className="mb-6">
                  The federal government has also added all non-polymeric PFAS to the List of Toxic Substances under the Canadian Environmental Protection Act, providing legal authority for broad restrictions on manufacturing, use, and environmental releases. This makes Canada one of the first countries to regulate PFAS as a class rather than individual compounds.
                </p>

                <p className="mb-6">
                  Provincial responses vary: Ontario has interim advice at 70 ng/L for 11 PFAS compounds, while British Columbia and Quebec are incorporating PFAS into their contaminated sites regulations. However, most jurisdictions are still developing comprehensive wastewater discharge standards.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Common Contamination Sources Across Canada</h2>

                <p className="mb-4">PFAS contamination typically comes from:</p>

                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li>Military bases and airports (firefighting training) – found from coast to coast</li>
                  <li>Landfills and waste disposal sites</li>
                  <li>Wastewater treatment plants</li>
                  <li>Industrial facilities</li>
                </ul>

                <p className="mb-6">
                  Research suggests that effluent from wastewater treatment plants commonly contains 50-150 ng/L of PFAS, significantly higher than typical drinking water concentrations, highlighting the need for better source control and treatment technologies.
                </p>

                {/* Water Testing Kit Image */}
<div className="my-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg overflow-hidden">
  <img
    src="/images/blog/water-testing-kit.jpg"
    alt="My Water Quality Water Testing Kit Components"
    className="w-full h-64 object-cover"
    onLoad={() => console.log('✅ Testing kit image loaded')}
    onError={(e) => {
      console.log('❌ Testing kit image failed to load from:', e.target.src);
      // Hide the broken image and show fallback
      e.target.style.display = 'none';
      const fallback = e.target.parentElement.querySelector('.kit-image-fallback');
      if (fallback) fallback.style.display = 'flex';
    }}
  />
  {/* Fallback content */}
  <div className="kit-image-fallback p-8 text-center text-gray-500" style={{ display: 'none' }}>
    <svg className="h-12 w-12 mx-auto mb-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
    <p className="text-sm font-medium">My Water Quality Testing Kit</p>
    <p className="text-xs text-gray-400 mt-1">Professional Water Testing Components</p>
  </div>
</div>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">What You Can Do</h2>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Get Your Water Tested</h3>
                <p className="mb-6">
                  Testing is crucial across Canada, especially if you live near airports, military bases, industrial facilities, or use a private well. PFAS have no taste or smell, so testing is the only way to know if they're present. This is particularly important given the widespread nature of contamination documented from coast to coast.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Treatment Options</h3>
                <p className="mb-4">If PFAS are detected, effective treatment methods include:</p>

                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li><strong>Reverse Osmosis Systems</strong> – Highly effective (install at point-of-use)</li>
                  <li><strong>Activated Carbon Filters</strong> – Look for NSF/ANSI Standard 53 certification</li>
                  <li><strong>Ion Exchange Resins</strong> – When specifically designed for PFAS</li>
                </ul>

                <p className="mb-6">
                  Systems range from $50 for tap-mounted filters to thousands for whole-house systems. The Torbay case showed that residents with proper filtration saw PFAS levels drop from above guidelines to undetectable.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Take Action</h2>

                <p className="mb-4">PFAS contamination is one of Canada's most significant water quality challenges, but you can take concrete steps:</p>

                <ol className="list-decimal pl-6 mb-6 space-y-2">
                  <li><strong>Test your water</strong> – Especially in higher-risk areas near known contamination sources</li>
                  <li><strong>Install appropriate treatment</strong> if PFAS are detected</li>
                  <li><strong>Stay informed</strong> about federal and provincial regulations and local contamination</li>
                </ol>

                <p className="mb-6">
                  While PFAS may be "forever chemicals," proper testing and treatment can minimize their impact on your family's health. The key is knowing what's in your water and taking action accordingly.
                </p>

                {/* Call-to-Action Section */}
                <div className="bg-blue-50 rounded-lg p-6 mt-8 mb-8">
                  <p className="text-center text-gray-700 mb-4">
                    <em>For PFAS testing or treatment solutions, <a href="/contact" className="text-blue-600 hover:text-blue-800 underline font-medium">contact our water quality experts</a>. We provide comprehensive drinking water testing services across Canada and help you to understand your results and options.</em>
                  </p>
                </div>

              </div>

            </div>
          </article>

        </div>
      </section>

      {/* Related Content Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Related Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Water Testing Services</h3>
              <p className="text-gray-600 text-sm mb-4">Get comprehensive water quality testing including PFAS analysis.</p>
              <a href="/shop" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                Browse Testing Kits →
              </a>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Water Sampling Guide</h3>
              <p className="text-gray-600 text-sm mb-4">Learn how to properly collect water samples for accurate testing.</p>
              <a href="/sampling-instructions" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                View Instructions →
              </a>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Frequently Asked Questions</h3>
              <p className="text-gray-600 text-sm mb-4">Common questions about water quality and testing answered.</p>
              <a href="/faq" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                Read FAQ →
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}