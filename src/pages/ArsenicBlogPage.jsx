// src/pages/ArsenicBlogPage.jsx
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

export default function ArsenicBlogPage() {
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
            <div className="h-64 sm:h-80 bg-gradient-to-r from-blue-100 to-indigo-100 border-b overflow-hidden relative">
              <img
                src="/images/blog/arsenic-featured-image.jpg"
                alt="Arsenic in Canadian Drinking Water"
                className="w-full h-full object-cover"
                onLoad={() => console.log('✅ Arsenic featured image loaded')}
                onError={(e) => {
                  console.log('❌ Arsenic featured image failed to load from:', e.target.src);
                  e.target.style.display = 'none';
                  const fallback = e.target.parentElement.querySelector('.image-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              {/* Fallback content */}
              <div className="image-fallback absolute inset-0 flex items-center justify-center text-center text-gray-500" style={{ display: 'none' }}>
                <div>
                  <svg className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium">Arsenic in Canadian Drinking Water</p>
                  <p className="text-xs text-gray-400 mt-1">Featured Image</p>
                  <p className="text-xs text-gray-400 mt-1">Store at: /public/images/blog/arsenic-featured-image.jpg</p>
                </div>
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
                    <p className="text-xs text-gray-500">Published October 2025</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">3 min read</p>
                </div>
              </div>

              {/* Article Content */}
              <div className="prose prose-lg max-w-none">
                
                {/* Title */}
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                  Arsenic in Canadian Drinking Water: The Silent Threat in Your Well
                </h1>

                <p className="text-lg text-gray-600 mb-8 leading-relaxed italic">
                  Estimated reading time: 3 minutes
                </p>

                <p className="text-lg leading-relaxed mb-6">
                  For decades, arsenic has been hiding in plain sight across Canada – colorless, odorless, and tasteless in the water Canadians drink from private wells. From Newfoundland's coastal communities to rural areas across the country, this naturally occurring element poses serious health risks that many well owners never knew existed.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">A Wake-Up Call from Coast to Coast</h2>

                <p className="mb-6">
                  When Newfoundland and Labrador launched a free well testing program in 2022, the results were startling: <a href="https://www.cbc.ca/news/canada/newfoundland-labrador/arsenic-test-results-1.6920066" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">out of just over 1,000 tests, 112 wells contained arsenic levels above Health Canada's safe limit of 10 parts per billion (ppb)</a>. That's 10% of tested wells.
                </p>

                <p className="mb-6">
                  With approximately 40,000 private wells across the province, experts estimate some 4,000 households could be drinking arsenic-contaminated water without knowing it.
                </p>

                <p className="mb-6">
                  Debbie Rideout from Moreton's Harbour discovered her family had been drinking water with arsenic levels 80 times above the safe limit. "My advice to families who found out about their unsafe water is to not dwell on it, to move forward in a positive way, and also to be very thankful that they know about it now," she told CBC.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">What Is Arsenic?</h2>

                <p className="mb-6">
                  Arsenic is classified as a human carcinogen by Health Canada. According to Health Canada's guideline technical document on arsenic, exposure to any level in drinking water may increase cancer risk, particularly for:
                </p>

                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li><strong>Bladder, kidney, and liver cancers</strong></li>
                  <li><strong>Lung cancer</strong></li>
                  <li><strong>Skin lesions</strong> – including hyperpigmentation and hyperkeratosis</li>
                </ul>

                <p className="mb-4">Beyond cancer, chronic arsenic exposure has been linked to:</p>
                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li>Peripheral vascular disease</li>
                  <li>Cardiovascular issues</li>
                  <li>Neurological problems</li>
                  <li>Developmental effects in children</li>
                </ul>

                <p className="mb-6">
                  The maximum acceptable concentration for arsenic in Canadian drinking water is 10 micrograms per litre (µg/L or ppb). Health Canada emphasizes that arsenic levels should be kept "as low as reasonably achievable" since no level of exposure is completely without risk.
                </p>

                {/* First Image Placeholder - Well Testing */}
                <div className="my-8 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg overflow-hidden">
                  <img
                    src="/images/blog/arsenic-well-testing.jpg"
                    alt="Depiction of arsenic"
                    className="w-full h-64 object-cover"
                    onLoad={() => console.log('✅ Well testing image loaded')}
                    onError={(e) => {
                      console.log('❌ Well testing image failed to load from:', e.target.src);
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.well-image-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  {/* Fallback content */}
                  <div className="well-image-fallback p-8 text-center text-gray-500" style={{ display: 'none' }}>
                    <svg className="h-12 w-12 mx-auto mb-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium">Image Placeholder: Well Water Testing</p>
                    <p className="text-xs text-gray-400 mt-1">Store at: /public/images/blog/arsenic-well-testing.jpg</p>
                    <p className="text-xs text-gray-400">Suggested: Photo of well testing or water sampling</p>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Where Does Arsenic Come From?</h2>

                <p className="mb-4">Arsenic enters drinking water from two primary sources:</p>

                <p className="mb-2"><strong>Natural Geological Sources:</strong></p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Erosion and weathering of arsenic-containing minerals</li>
                  <li>Common in areas with sulphide minerals</li>
                  <li>More prevalent in groundwater than surface water</li>
                </ul>

                <p className="mb-2"><strong>Industrial Sources:</strong></p>
                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li>Historical mining operations</li>
                  <li>Industrial effluents</li>
                  <li>Atmospheric deposition from smelting operations</li>
                </ul>

                <p className="mb-6">
                  <a href="https://healthycanadians.gc.ca/publications/healthy-living-vie-saine/water-arsenic-eau/alt/water-arsenic-eau-eng.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Elevated arsenic levels have been documented in Nova Scotia, Newfoundland, Saskatchewan, Alberta, and British Columbia</a>, with groundwater sources typically showing higher concentrations than surface water.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Who Is At Risk?</h2>

                <p className="mb-6">
                  Private well owners face the highest risk, as municipal systems are regularly monitored and treated. High-risk areas include regions with naturally high arsenic in bedrock, locations near mining operations, and areas with volcanic rock or sulphide mineral deposits.
                </p>

               

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">What You Can Do to Protect Your Family</h2>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1. Test Your Water</h3>

                <p className="mb-6">
                  Testing is the only way to know if arsenic is present, especially if you live in a high-risk area, are near mining sites, or have never tested your well.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. Treatment Options</h3>

                <p className="mb-4">
                  If arsenic exceeds 10 µg/L, <a href="https://healthycanadians.gc.ca/publications/healthy-living-vie-saine/water-arsenic-eau/alt/water-arsenic-eau-eng.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">several effective treatments are available</a>:
                </p>

                <p className="mb-2"><strong>Residential-Scale Treatment:</strong></p>
                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li><strong>Reverse Osmosis Systems</strong> – Remove up to 98% of arsenic when properly maintained</li>
                  <li><strong>Distillation Units</strong> – Remove virtually all arsenic</li>
                  <li><strong>Certified Adsorption Filters</strong> – Using iron, aluminum, or titanium oxide media</li>
                </ul>

                <p className="mb-6">
                  <a href="https://healthycanadians.gc.ca/publications/healthy-living-vie-saine/water-arsenic-eau/alt/water-arsenic-eau-eng.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Health Canada recommends devices certified to NSF/ANSI standards 53, 58, or 62 for arsenic removal</a>. All systems require regular maintenance and periodic testing to verify effectiveness.
                </p>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3. Alternative Solutions</h3>

                <p className="mb-6">
                  For dangerously high levels, consider bottled water for drinking and cooking, connecting to municipal supply if available, or drilling a new well in a different location.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">The Path Forward</h2>

                <p className="mb-6">
                  Arsenic contamination in Canadian drinking water represents a significant but manageable public health challenge. The experience of Newfoundland well owners demonstrates both the importance of testing and the effectiveness of proper treatment when contamination is discovered.
                </p>

                <p className="mb-6">
                  For well owners across Canada, the message is clear: test your water, understand your risks, and take action if needed. Because when it comes to arsenic, what you don't know can hurt you – but what you do know can save lives.
                </p>

                {/* Call-to-Action Section */}
                <div className="bg-blue-50 rounded-lg p-6 mt-8 mb-8">
                  <p className="text-center text-gray-700 mb-4">
                    <em>For comprehensive arsenic testing and expert guidance on water treatment solutions, <a href="/contact" className="text-blue-600 hover:text-blue-800 underline font-medium">contact our water quality experts</a>. We provide professional testing services across Canada and help you understand your results and treatment options.</em>
                  </p>
                </div>

                {/* Related Resources */}
                <div className="bg-gray-50 rounded-lg p-6 mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Resources:</h3>
                  <ul className="space-y-2">
                    <li>
                      <a href="https://healthycanadians.gc.ca/publications/healthy-living-vie-saine/water-arsenic-eau/alt/water-arsenic-eau-eng.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Health Canada Guidelines for Arsenic in Drinking Water</a>
                    </li>
                    <li>
                      <a href="https://www.cbc.ca/news/canada/newfoundland-labrador/arsenic-test-results-1.6920066" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">CBC: High levels of arsenic detected in N.L. wells</a>
                    </li>
                    <li>
                      <a href="/shop" className="text-blue-600 hover:text-blue-800 underline">Water Testing Services</a> – Get your water tested for arsenic and other contaminants
                    </li>
                  </ul>
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
              <p className="text-gray-600 text-sm mb-4">Get comprehensive water quality testing including arsenic analysis.</p>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">More Blog Articles</h3>
              <p className="text-gray-600 text-sm mb-4">Read more about water quality issues affecting Canadians.</p>
              <a href="/blog" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                View All Articles →
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