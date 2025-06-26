// src/pages/WaterSamplingInstructionsPage.jsx
import { useState } from 'react';
import PageLayout from '../components/PageLayout';

export default function WaterSamplingInstructionsPage() {
  const [activeSection, setActiveSection] = useState('location');

  // Hero section for the instructions page
  const InstructionsHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Water Sampling Instructions
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Follow these step-by-step instructions to properly collect your water sample 
            and ensure accurate testing results.
          </p>
        </div>
      </div>
    </div>
  );

  // Section navigation
  const sectionNav = [
    { id: 'location', name: 'Sample Location', icon: '📍' },
    { id: 'homeowner', name: 'Homeowner Kit', icon: '🏠' },
    { id: 'specialized', name: 'Specialized Kit', icon: '🧪' }
  ];

  return (
    <PageLayout hero={<InstructionsHero />}>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Section Navigation */}
        <div className="mb-12">
          <nav className="flex justify-center">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {sectionNav.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-colors duration-200 ${
                    activeSection === section.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.name}
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Content Sections */}
        <div className="max-w-4xl mx-auto">
          {/* Section 1: Where to Take Your Water Sample */}
          {activeSection === 'location' && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                <h2 className="text-2xl font-bold text-blue-900 flex items-center">
                  <span className="mr-3">📍</span>
                  Where to Take Your Water Sample
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    There are two types of water that can be sampled from a private water supply: <strong>Raw</strong> or <strong>Treated</strong>.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                        <span className="w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
                        Raw Water
                      </h3>
                      <p className="text-blue-800 text-sm">
                        Untreated water that comes directly from your water well.
                      </p>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                        <span className="w-3 h-3 bg-green-600 rounded-full mr-2"></span>
                        Treated Water
                      </h3>
                      <p className="text-green-800 text-sm">
                        Water that has passed through a treatment system such as a filter, UV system, or water softener.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded-r-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Important Guidelines</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>All water samples should be of <strong>raw water</strong>, unless you are testing to see if your treatment system is working</li>
                          <li>If testing treatment effectiveness, take one sample of <strong>Raw</strong> and one of <strong>Treated</strong> water</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <span className="text-blue-600 text-lg mr-2">🚰</span>
                      Raw Water Sample Collection
                    </h3>
                    <p className="text-gray-700 text-sm">
                      To collect a <strong>raw</strong> water sample from a home with a treatment system, 
                      please take the sample from an <strong>outdoor tap</strong> (not through a hose) 
                      or the tap that is found <strong>before</strong> water enters the treatment system.
                    </p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <span className="text-green-600 text-lg mr-2">🏠</span>
                      Treated Water Sample Collection
                    </h3>
                    <p className="text-gray-700 text-sm">
                      A <strong>treated</strong> sample can be taken from any tap within the home 
                      (kitchen is the most practical location).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Homeowner Kit Instructions */}
          {activeSection === 'homeowner' && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-green-50 px-6 py-4 border-b border-green-100">
                <h2 className="text-2xl font-bold text-green-900 flex items-center">
                  <span className="mr-3">🏠</span>
                  Homeowner Kit Instructions
                </h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-8">
                  {[
                    {
                      step: 1,
                      title: "Unpack Cooler",
                      content: (
                        <div>
                          <p className="mb-3 text-gray-700">The cooler contains:</p>
                          <ul className="list-disc list-inside text-gray-600 space-y-1">
                            <li>Laboratory Sample Bottles</li>
                            <li>Ice Pack</li>
                            <li>Disinfectant Wipe</li>
                            <li>Chain of Custody (paperwork)</li>
                            <li>Return Packing Tape</li>
                          </ul>
                        </div>
                      )
                    },
                    {
                      step: 2,
                      title: "Put the Ice Pack in Freezer",
                      content: (
                        <p className="text-gray-700">
                          Put the ice pack in the freezer at least <strong>the night before</strong> you plan to take the sample. 
                          The water samples need to remain cool until they arrive back to the laboratory.
                        </p>
                      )
                    },
                    {
                      step: 3,
                      title: "Contact Purolator",
                      content: (
                        <div className="text-gray-700">
                          <p className="mb-3">
                            <strong>The day before</strong> you take the sample, contact Purolator to arrange for the cooler to be picked up. 
                            You can either:
                          </p>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <ul className="space-y-2">
                              <li className="flex items-center">
                                <span className="text-blue-600 mr-2">📞</span>
                                Call Customer Service: <strong> 1-888-SHIP-123 (1-888-744-7123)</strong>
                              </li>
                              <li className="flex items-center">
                                <span className="text-blue-600 mr-2">🌐</span>
                                Create an account at <strong> www.purolator.com</strong>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )
                    },
                    {
                      step: 4,
                      title: "Pick a Sample Location(s)",
                      content: (
                        <p className="text-gray-700">
                          Pick an appropriate tap(s) to collect the sample from. This may be from an 
                          <strong> untreated (raw)</strong> or <strong>treated</strong> water tap, 
                          depending on the water quality package you ordered.
                        </p>
                      )
                    },
                    {
                      step: 5,
                      title: "Wash Your Hands",
                      content: (
                        <p className="text-gray-700">
                          Wash your hands thoroughly with soap and water before handling the sample bottles.
                        </p>
                      )
                    },
                    {
                      step: 6,
                      title: "Disinfect Tap",
                      content: (
                        <p className="text-gray-700">
                          Clean the mouth of the tap with the disinfectant wipe and let water run for 
                          <strong> 2 minutes</strong> before collecting the water sample.
                        </p>
                      )
                    },
                    {
                      step: 7,
                      title: "Fill Sample Bottles",
                      content: (
                        <p className="text-gray-700">
                          Run the cold water for <strong>2 minutes</strong> before collecting the water sample. 
                          Fill bottles to the marked line or until they are full but make sure they do not overflow.
                        </p>
                      )
                    },
                    {
                      step: 8,
                      title: "Fill out the Requisition Form",
                      content: (
                        <p className="text-gray-700">
                          Your cooler package will contain a requisition form known as a <strong>Chain of Custody</strong>. 
                          Fill in the highlighted areas, which will be the <strong>time and date</strong> the sample was collected, 
                          along with your <strong>name and signature</strong>.
                        </p>
                      )
                    },
                    {
                      step: 9,
                      title: "Repack Cooler",
                      content: (
                        <div className="text-gray-700">
                          <p className="mb-3">Repack cooler with:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Frozen ice pack</li>
                            <li>Filled water bottles</li>
                            <li>Laminated instructions</li>
                            <li>Completed requisition form</li>
                          </ul>
                          <p className="mt-3">Tape cooler closed with tape strips provided.</p>
                        </div>
                      )
                    },
                    {
                      step: 10,
                      title: "Ship Cooler",
                      content: (
                        <p className="text-gray-700">
                          Place shipping label on cooler and leave for Purolator to pick up or drop at a Purolator drop-off location.
                        </p>
                      )
                    }
                  ].map((step) => (
                    <div key={step.step} className="flex">
                      <div className="flex-shrink-0 mr-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-800 rounded-full font-semibold text-sm">
                          {step.step}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                        <div className="text-gray-600">{step.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Specialized Kit Instructions */}
          {activeSection === 'specialized' && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-purple-50 px-6 py-4 border-b border-purple-100">
                <h2 className="text-2xl font-bold text-purple-900 flex items-center">
                  <span className="mr-3">🧪</span>
                  Specialized Kit Instructions
                </h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-8">
                  {[
                    {
                      step: 1,
                      title: "Unpack Cooler",
                      content: (
                        <div>
                          <p className="mb-3 text-gray-700">The cooler contains:</p>
                          <ul className="list-disc list-inside text-gray-600 space-y-1">
                            <li>Laboratory Sample Bottles</li>
                            <li>Ice Pack</li>
                            <li>Disinfectant Wipe</li>
                            <li>Chain of Custody (paperwork)</li>
                            <li>Return Packing Tape</li>
                          </ul>
                        </div>
                      )
                    },
                    {
                      step: 2,
                      title: "Put the Ice Pack in Freezer",
                      content: (
                        <p className="text-gray-700">
                          Put the ice pack in the freezer at least <strong>the night before</strong> you plan to take the sample. 
                          The water samples need to remain cool until they arrive back to the laboratory.
                        </p>
                      )
                    },
                    {
                      step: 3,
                      title: "Contact Purolator",
                      content: (
                        <div className="text-gray-700">
                          <p className="mb-3">
                            <strong>The day before</strong> you take the sample, contact Purolator to arrange for the cooler to be picked up. 
                            You can either:
                          </p>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <ul className="space-y-2">
                              <li className="flex items-center">
                                <span className="text-blue-600 mr-2">📞</span>
                                Call Customer Service: <strong> 1-888-SHIP-123 (1-888-744-7123)</strong>
                              </li>
                              <li className="flex items-center">
                                <span className="text-blue-600 mr-2">🌐</span>
                                Create an account at <strong> www.purolator.com</strong>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )
                    },
                    {
                      step: 4,
                      title: "Pick a Sample Location(s)",
                      content: (
                        <p className="text-gray-700">
                          Pick an appropriate tap(s) to collect the sample from. This may be from an 
                          <strong> untreated (raw)</strong> or <strong>treated</strong> water tap, 
                          depending on the water quality package you ordered.
                        </p>
                      )
                    },
                    {
                      step: 5,
                      title: "Wash Your Hands",
                      content: (
                        <p className="text-gray-700">
                          Wash your hands thoroughly with soap and water before handling the sample bottles.
                        </p>
                      )
                    },
                    {
                      step: 6,
                      title: "Disinfect Tap",
                      content: (
                        <p className="text-gray-700">
                          Clean the mouth of the tap with the disinfectant wipe and let water run for 
                          <strong> 2 minutes</strong> before collecting the water sample.
                        </p>
                      )
                    },
                    {
                      step: "7a",
                      title: "Fill Sample Bottles",
                      content: (
                        <p className="text-gray-700">
                          Run the cold water for <strong>2 minutes</strong> before collecting the water sample. 
                          Fill bottles to the marked line or until they are full but make sure they do not overflow.
                        </p>
                      )
                    },
                    {
                      step: "7b",
                      title: "Fill Glass Vials",
                      content: (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-gray-700 font-medium mb-2">
                            ⚠️ Special Instructions for Volatile Compounds
                          </p>
                          <p className="text-gray-700">
                            In your bottle set there will be small amber vials for the volatile compounds. 
                            These bottles must contain <strong>zero headspace</strong> (no air in the vial).
                          </p>
                        </div>
                      )
                    },
                    {
                      step: "7c",
                      title: "Glass Vial Filling Process",
                      content: (
                        <div className="bg-purple-50 rounded-lg p-4">
                          <ol className="list-decimal list-inside text-gray-700 space-y-2">
                            <li>Completely fill the vial (slowly to minimize agitation and aeration)</li>
                            <li>Form a meniscus (dome of water) and then slowly screw on cap to seal the sample</li>
                            <li>Check for bubbles by inverting the vial and gently tapping it</li>
                            <li><strong>Add more water if you see air space or bubbles</strong></li>
                          </ol>
                        </div>
                      )
                    },
                    {
                      step: 8,
                      title: "Fill out the Requisition Form",
                      content: (
                        <p className="text-gray-700">
                          Your cooler package will contain a requisition form known as a <strong>Chain of Custody</strong>. 
                          Fill in the highlighted areas, which will be the <strong>time and date</strong> the sample was collected, 
                          along with your <strong>name and signature</strong>.
                        </p>
                      )
                    },
                    {
                      step: 9,
                      title: "Repack Cooler",
                      content: (
                        <div className="text-gray-700">
                          <p className="mb-3">Repack cooler with:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Frozen ice pack</li>
                            <li>Filled water bottles</li>
                            <li>Filled glass vials (if applicable)</li>
                            <li>Laminated instructions</li>
                            <li>Completed requisition form</li>
                          </ul>
                          <p className="mt-3">Tape cooler closed with tape strips provided.</p>
                        </div>
                      )
                    },
                    {
                      step: 10,
                      title: "Ship Cooler",
                      content: (
                        <p className="text-gray-700">
                          Place shipping label on cooler and leave for Purolator to pick up or drop at a Purolator drop-off location.
                        </p>
                      )
                    }
                  ].map((step) => (
                    <div key={step.step} className="flex">
                      <div className="flex-shrink-0 mr-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-800 rounded-full font-semibold text-sm">
                          {step.step}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                        <div className="text-gray-600">{step.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Need Help or Have Questions?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            If you have any questions about the sampling process or need assistance with your water testing kit, 
            our team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="inline-flex items-center px-6 py-3 border border-blue-600 text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors duration-200"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Support
            </a>
            <a
              href="/shop"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Order Test Kit
            </a>
          </div>
        </div>

        {/* Print-friendly version notice */}
        <div className="mt-8 text-center">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Instructions
          </button>
        </div>
      </div>
    </PageLayout>
  );
}