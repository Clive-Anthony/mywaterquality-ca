// src/pages/LeadBlogPage.jsx
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

export default function LeadBlogPage() {
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
                src="/images/blog/lead-featured-image.jpg"
                alt="Lead in Canadian Drinking Water"
                className="w-full h-full object-cover"
                onLoad={() => console.log('✅ Lead featured image loaded')}
                onError={(e) => {
                  console.log('❌ Lead featured image failed to load from:', e.target.src);
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
                  <p className="text-sm font-medium">Lead in Canadian Drinking Water</p>
                  <p className="text-xs text-gray-400 mt-1">Featured Image</p>
                  <p className="text-xs text-gray-400 mt-1">Store at: /public/images/blog/lead-featured-image.jpg</p>
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
                    <p className="text-xs text-gray-500">Published January 2025</p>
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
                  Lead in Canadian Drinking Water: What You Need to Know
                </h1>

                <p className="text-lg text-gray-600 mb-8 leading-relaxed italic">
                  Estimated reading time: 3 minutes
                </p>

                <p className="text-lg leading-relaxed mb-6">
                  When you turn on your tap for a glass of water, lead contamination probably isn't the first thing on your mind. For most Canadians, it wasn't a major concern – until we started looking closely at the data.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">The Hidden Threat in Our Pipes</h2>

                <p className="mb-6">
                  Lead is a heavy metal that occurs naturally in the earth's crust. It's also present in water but at very low concentrations (typically below 1 ug/L). It could be higher in regions with metal-rich geological formations but if elevated, it is most likely from other sources like lead pipes. This contamination is particularly concerning because lead cannot be seen, smelled, or tasted in water – making testing the only way to detect its presence.
                </p>

                <p className="mb-4">The health consequences of lead exposure are serious, especially for vulnerable populations. Children and developing fetuses face the greatest risk, as lead can cause:</p>

                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li><strong>Brain and nervous system damage</strong></li>
                  <li><strong>Slowed growth and development</strong></li>
                  <li><strong>Learning and behavior problems</strong></li>
                  <li><strong>Decreased IQ</strong></li>
                </ul>

                <p className="mb-6">
                  Adults aren't immune either. Long-term exposure can lead to cardiovascular issues, kidney damage, and reproductive problems.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Understanding Lead Levels: What the Numbers Mean</h2>

                <p className="mb-6">
                  Health Canada originally set the safety threshold at 10 ug/L back in 1992. However, as research revealed that health effects could occur at much lower levels than previously thought, the standard was tightened. In 2019, Health Canada lowered the maximum acceptable concentration to just 5 ug/L – recognizing that even low-level lead exposure can be harmful.
                </p>

                {/* First Image Placeholder - Lead Pipes/Testing */}
                <div className="my-8 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg overflow-hidden">
                  <img
                    src="/images/blog/lead-pipes-testing.jpg"
                    alt="Lead pipes and water testing in Canadian homes"
                    className="w-full h-64 object-cover"
                    onLoad={() => console.log('✅ Lead pipes image loaded')}
                    onError={(e) => {
                      console.log('❌ Lead pipes image failed to load from:', e.target.src);
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.pipes-image-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  {/* Fallback content */}
                  <div className="pipes-image-fallback p-8 text-center text-gray-500" style={{ display: 'none' }}>
                    <svg className="h-12 w-12 mx-auto mb-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm font-medium">Image Placeholder: Lead Pipes & Testing</p>
                    <p className="text-xs text-gray-400 mt-1">Store at: /public/images/blog/lead-pipes-testing.jpg</p>
                    <p className="text-xs text-gray-400">Suggested: Photo of lead pipes or water testing process</p>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Toronto's Success Story: A Model for Canada</h2>

                <p className="mb-6">
                  When a <a href="https://www.cbc.ca/news/canada/toronto/high-lead-levels-found-in-some-toronto-drinking-water-1.2648775" target="_blank" className="text-blue-600 hover:text-blue-800 underline">2014 CBC News investigation</a> revealed that 13% of Toronto households exceeded Health Canada's lead standards, the city took decisive action. The CBC report analyzed 15,000 water samples collected between 2008-2014 through Toronto's Residential Lead Testing Program, revealing that approximately 2,000 samples contained lead levels higher than the recommended limit.
                </p>

                <p className="mb-6">
                  The solution? In 2014, Toronto began adding phosphate to its water treatment process. This treatment creates a protective coating inside pipes, preventing lead from leaching into the drinking water supply.
                </p>

                <p className="mb-6">
                  But did it work? <a href="https://open.toronto.ca/how-the-city-is-winning-the-war-against-lead-contamination-in-drinking-water/" target="_blank" className="text-blue-600 hover:text-blue-800 underline">According to an article published on the City of Toronto's Open Data Portal</a>, the results are impressive. The analysis examined 12,810 water samples from Toronto homes collected between 2014 and 2024, and the findings tell a compelling story of success.
                </p>

                <p className="mb-4">After the phosphate treatment was implemented:</p>

                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li><strong>98.73% of water samples</strong> contained lead concentrations below the old 10 ug/L limit – a dramatic improvement from the original 87%</li>
                  <li><strong>97.14% of samples</strong> met the more stringent 5 ug/L standard introduced in 2019</li>
                  <li>Mean lead concentrations consistently declined from 1.53 ug/L in 2015 to just 0.15 ug/L by 2024</li>
                  <li>The improvement was consistent across all Toronto neighborhoods, indicating that location doesn't significantly impact the likelihood of elevated lead levels</li>
                </ul>

                <p className="mb-6">
                  These results provide strong evidence that proactive water treatment strategies can effectively protect public health.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Why Older Homes Are at Higher Risk</h2>

                <p className="mb-6">
                  Until 1975, <a href="https://www.canada.ca/en/health-canada/services/environmental-workplace-health/reports-publications/water-quality/water-talk-minimizing-exposure-lead-drinking-water-distribution-systems.html#s1" target="_blank" className="text-blue-600 hover:text-blue-800 underline">the National Plumbing Code of Canada permitted lead</a> as an acceptable material in pipes that bring water to homes. This means that older homes and neighborhoods built before this cutoff date are more likely to have lead service lines and plumbing components.
                </p>

                <p className="mb-4">The most significant source of lead in drinking water comes from:</p>

                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li><strong>Lead service lines</strong> connecting homes to the municipal water system</li>
                  <li><strong>Lead pipes and fittings</strong> within older buildings</li>
                  <li><strong>Brass fixtures and fittings</strong> that may contain some lead</li>
                  <li><strong>Lead solder</strong> used in plumbing joints</li>
                </ul>

                <p className="mb-6">
                  Even some newer buildings can have low-level lead leaching from brass fittings or soldered joints, making testing important regardless of your home's age.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">What Canadian Jurisdictions Are Doing</h2>

                <p className="mb-4">Across Canada, provinces and municipalities are taking action to address lead contamination:</p>

                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li><strong>School and childcare testing programs</strong> are being implemented in some provinces, with jurisdictions in Manitoba offering dedicated funding for testing and mitigation</li>
                  <li><strong>Lead service line replacement programs</strong> are being developed in many municipalities, often offering reduced costs when homeowners replace their portion of the service line alongside city replacements</li>
                  <li><strong>Water treatment adjustments</strong> similar to Toronto's phosphate addition are being considered or implemented in various jurisdictions</li>
                  <li><strong>Public education campaigns</strong> are helping homeowners understand their risk and take appropriate action</li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">What You Can Do to Protect Your Family</h2>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1. Test Your Water</h3>

                <p className="mb-4">Testing is the only way to know if lead is present in your drinking water. This is particularly important if:</p>

                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li>Your home was built before 1975</li>
                  <li>You live in an older neighborhood</li>
                  <li>You have young children or are pregnant</li>
                  <li>You've never had your water tested for lead</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. Treatment Options</h3>

                <p className="mb-4">If testing reveals elevated lead levels, several effective treatment methods are available:</p>

                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li><strong>Point-of-use water treatment devices</strong> – <a href="https://www.canada.ca/en/health-canada/services/environmental-workplace-health/reports-publications/water-quality/water-talk-minimizing-exposure-lead-drinking-water-distribution-systems.html#s5" target="_blank" className="text-blue-600 hover:text-blue-800 underline">Certified devices including reverse osmosis systems, activated carbon filters, and distillation units</a> that meet NSF International standards for lead removal are highly effective. Install these at your most-used drinking water tap (typically the kitchen tap). Make sure devices are maintained or replaced according to manufacturer instructions</li>
                  <li><strong>Lead service line replacement</strong> – <a href="https://www.canada.ca/en/health-canada/services/environmental-workplace-health/reports-publications/water-quality/water-talk-minimizing-exposure-lead-drinking-water-distribution-systems.html#s5" target="_blank" className="text-blue-600 hover:text-blue-800 underline">Replacing lead service lines and any lead interior pipes or fittings</a> is the most permanent solution. Some municipalities have programs where residents can replace their portion of the service line at reduced cost when main service lines are replaced</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3. Simple Precautions</h3>

                <p className="mb-4">
                  <a href="https://www.canada.ca/en/health-canada/services/environmental-workplace-health/reports-publications/water-quality/water-talk-minimizing-exposure-lead-drinking-water-distribution-systems.html#s4" target="_blank" className="text-blue-600 hover:text-blue-800 underline">Health Canada recommends these practical steps</a> while addressing the source of lead contamination:
                </p>

                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li><strong>Flush your tap</strong> – Run cold water for at least 5 minutes if water has sat in pipes for more than 6 hours (like overnight or during the day while at work). For shorter periods (30 minutes to 6 hours), flush for at least 2 minutes. This is especially important for first-draw water in the morning</li>
                  <li><strong>Use cold water for consumption</strong> – Always use cold water for drinking, cooking, and preparing baby formula. Hot water dissolves lead more readily from pipes and faucets</li>
                  <li><strong>Clean aerators regularly</strong> – Remove and clean faucet aerators to remove any lead particles</li>
                  <li><strong>Don't rely on boiling</strong> – Boiling water will not remove lead and may actually concentrate it</li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">The Bigger Picture: Progress and Vigilance</h2>

                <p className="mb-6">
                  The Toronto case study demonstrates that with proper treatment and monitoring, we can significantly reduce lead exposure through drinking water. Success stories like Toronto's phosphate treatment program show that meaningful progress is possible when jurisdictions take proactive steps to protect public health.
                </p>


                {/* Call-to-Action Section */}
                <div className="bg-blue-50 rounded-lg p-6 mt-8 mb-8">
                  <p className="text-center text-gray-700 mb-4">
                    <em>For comprehensive lead testing and expert guidance on protecting your drinking water, <a href="/contact" target="_blank" className="text-blue-600 hover:text-blue-800 underline font-medium">contact our water quality experts</a>. We provide professional testing services across Canada and help you understand your results and treatment options.</em>
                  </p>
                </div>

                {/* Related Resources */}
                <div className="bg-gray-50 rounded-lg p-6 mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Resources:</h3>
                  <ul className="space-y-2">
                    <li>
                      <a href="https://www.canada.ca/en/health-canada/services/publications/healthy-living/guidelines-canadian-drinking-water-quality-guideline-technical-document-lead.html" target="_blank" className="text-blue-600 hover:text-blue-800 underline">Health Canada Guidelines for Lead in Drinking Water</a>
                    </li>
                    <li>
                      <a href="https://open.toronto.ca/how-the-city-is-winning-the-war-against-lead-contamination-in-drinking-water/" target="_blank" className="text-blue-600 hover:text-blue-800 underline">Toronto's Lead Testing Data Analysis</a>
                    </li>
                    <li>
                      <a href="/shop" target="_blank" className="text-blue-600 hover:text-blue-800 underline">Water Testing Services</a> - Get your water tested for lead and other contaminants
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
              <p className="text-gray-600 text-sm mb-4">Get comprehensive water quality testing including lead analysis.</p>
              <a href="/shop" target="_blank" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
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
              <a href="/sampling-instructions" target="_blank" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
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