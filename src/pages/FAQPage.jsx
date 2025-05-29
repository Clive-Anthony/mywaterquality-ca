import { useState } from 'react';
import PageLayout from '../components/PageLayout';

export default function FAQPage() {
  const [openFAQ, setOpenFAQ] = useState(null);

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  // FAQ Hero Section
  const FAQHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Get answers to common questions about water testing, our services, and why water quality matters for your health and safety.
          </p>
        </div>
      </div>
    </div>
  );

  const faqData = [
    {
      question: "Why should I sample my drinking water?",
      answer: (
        <div className="space-y-4">
          <p>
            You should be sampling your drinking water for various reasons as it concerns your health and the health of your family. In addition to illness, a variety of less serious problems, such as taste, colour, and odour are signs of possible water quality issues.
          </p>
          <p>
            If your water comes from a private water well, you are solely responsible for assuring it is safe. For this reason, routine testing for the parameters covered in the Advanced Well Test is highly recommended. Even if you currently have a safe, clean water supply, regular testing can be valuable to establish a record of water quality. Having an understanding of your historical and current water quality may be helpful in solving any potential future problems and obtaining compensation if someone damages your water supply.
          </p>
          <p>
            If you are purchasing your water from a public/municipal water system, your water will be monitored at the source of treatment. These results will be publicly available from your local municipality. However, the water quality can change as the water travels through the pipes to your tap, including contaminants such as lead.
          </p>
        </div>
      )
    },
    {
      question: "My municipality/health unit will complete water sampling for free. Why should I pay to have my water sampled?",
      answer: (
        <div className="space-y-4">
          <p>
            Municipalities or local health units will analyze your drinking water if it is from a private surface water, groundwater or cistern source. However, testing is limited to E. coli, total coliforms and potentially nitrate. Although these are important health related parameters to test for, they do not provide a complete picture of the quality of your water.
          </p>
          <p>
            If your only concern is bacteria and/or nitrate, the free services are a great option.
          </p>
        </div>
      )
    },
    {
      question: "Some water treatment companies provide sampling services for free? Do they sample for the same parameters as mywaterquality.ca?",
      answer: (
        <div className="space-y-4">
          <p>
            Very few water treatment companies rely on an accredited and licensed laboratory to perform the free water testing. Typically, tests are completed with portable water quality meters or test strips for specific parameters that may not provide sufficient information about your water quality to allow for an interpretation of the water type and source of issues, if any. The precision and accuracy of the results can not compare to those analyzed by an accredited and licensed laboratory.
          </p>
          <p>
            In addition, <strong>My Water Quality</strong> does not sell water treatment systems. Our only mission is to provide knowledge to those who would like to understand what is in their drinking water. <strong>My Water Quality</strong> will provide a water report card that provides each homeowner with the complete water quality results from the accredited and licensed laboratory along with a water "score" based on the Canadian Water Quality Index for three water quality categories: all heath, aesthetic, and operational guidelines for the parameters tested.
          </p>
          <p>
            Guidance is provided on what treatment options could be utilized to improve the water quality.
          </p>
        </div>
      )
    },
    {
      question: "There are other at home testing kits you can buy online. What is the difference between these kits and the services provided by mywaterquality.ca?",
      answer: (
        <div className="space-y-4">
          <p>
            The majority of home testing kits use test strips to determine the general water quality. These test strips can serve as an initial screening tool, but do not provide the level of accuracy or precision to effectively compare concentrations to legislative guidelines. These test strips will give a range of results rather than a specific number.
          </p>
          <p>
            For example, a test strip for lead may have a minimum detection limit of 0.015 mg/L but the Ontario Drinking Water Objective for lead is 0.01 mg/L. Therefore, this test strip only detects lead if it is 50% higher than the health-related guideline.
          </p>
          <p>
            <strong>My Water Quality's</strong> laboratory accurately measures a variety of water quality parameters to determine water quality. This approach allows for an improved understanding of any potential water quality issues and aids in ensuring the correct treatment options are considered.
          </p>
        </div>
      )
    },
    {
      question: "How often should I test my drinking water?",
      answer: (
        <div className="space-y-4">
          <p>
            You should test your water annually for the parameters in the Advanced Well Test and bacteria (Add-on Package A, or through your health unit) to ensure that there have been no changes in your drinking water quality over time.
          </p>
          <p>
            More advanced chemical testing, such as parameters in the industrial and agricultural packages can be done less frequently.
          </p>
        </div>
      )
    },
    {
      question: "If I purchase a water sampling package from mywaterquality.ca, how long before I see the results?",
      answer: (
        <div className="space-y-4">
          <p>
            You will receive notification that your results are available on mywaterquality.ca within ten (10) to fifteen (15) business days. Your results will remain in your profile for future reference.
          </p>
        </div>
      )
    }
  ];

  return (
    <PageLayout hero={<FAQHero />}>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Introduction */}
        <div className="text-center mb-12">
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Find answers to the most common questions about water testing services, our laboratory processes, and why regular water quality monitoring is essential for your health and safety.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {faqData.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 last:border-b-0">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-6 text-left focus:outline-none focus:bg-blue-50 hover:bg-blue-50 transition-colors duration-200"
                aria-expanded={openFAQ === index}
                aria-controls={`faq-answer-${index}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 pr-8">
                    {faq.question}
                  </h3>
                  <div className="flex-shrink-0">
                    <svg
                      className={`h-6 w-6 text-blue-600 transform transition-transform duration-200 ${
                        openFAQ === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
              
              <div
                id={`faq-answer-${index}`}
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openFAQ === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-6">
                  <div className="text-gray-700 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-12 bg-blue-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Still Have Questions?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our water quality experts are here to help answer any additional questions you may have about our testing services or water quality concerns.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              Contact Our Experts
            </a>
            <a
              href="/test-kits"
              className="inline-flex items-center px-6 py-3 border border-blue-600 text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors duration-200"
            >
              Browse Test Kits
            </a>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sampling Instructions</h3>
            <p className="text-gray-600 text-sm mb-4">
              Learn how to properly collect water samples for accurate testing results.
            </p>
            <a
              href="/sampling-instructions"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              View Instructions →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Process</h3>
            <p className="text-gray-600 text-sm mb-4">
              Understand how our certified laboratory testing process works.
            </p>
            <a
              href="/process"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              Learn More →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">About Us</h3>
            <p className="text-gray-600 text-sm mb-4">
              Meet our team of water quality experts and learn about our mission.
            </p>
            <a
              href="/about-us"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              Meet the Team →
            </a>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}