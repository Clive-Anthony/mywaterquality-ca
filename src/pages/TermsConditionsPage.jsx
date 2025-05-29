import { useState } from 'react';
import PageLayout from '../components/PageLayout';

export default function TermsConditionsPage() {
  const [openSections, setOpenSections] = useState({});

  // Toggle section open/closed
  const toggleSection = (sectionId) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Hero section component
  const TermsHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Terms and Conditions
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Please read these terms and conditions carefully before using our water testing services.
          </p>
          <p className="mt-2 text-blue-200 text-sm">
            Last updated: {new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );

  // Terms and conditions data
  const termsData = [
    {
      id: 'intellectual-property',
      title: '1. Intellectual Property',
      content: `All content published and made available on our Site is the property of My Water Quality and the Site's creators. This includes, but is not limited to images, text, logos, documents, downloadable files and anything that contributes to the composition of our Site.`
    },
    {
      id: 'scope-of-service',
      title: '2. Scope of Service',
      content: `My Water Quality, through a third-party laboratory will provide water quality and reporting services.

These services will be paid for in full when the services are ordered.

These Terms and Conditions apply to all the services that are displayed on our Site at the time you access it. All information, descriptions, or images that we provide about our services are as accurate as possible. However, we are not legally bound by such information, descriptions, or images as we cannot guarantee the accuracy of all services we provide. You agree to purchase services from our Site at your own risk.

We reserve the right to modify, reject, or cancel your order whenever it becomes necessary. If we cancel your order and have already processed your payment, we will give you a refund equal to the amount you paid. You agree that it is your responsibility to monitor your payment instrument to verify receipt of any refund.`
    },
    {
      id: 'source-water',
      title: '3. Source Water',
      content: `The customer acknowledges that their water samples are from a private (non-commercial) water source and this source is not being served to the public.`
    },
    {
      id: 'sampling',
      title: '4. Sampling',
      content: `The customer shall sample its water and ship the water samples according to the sampling and shipping instructions provided by My Water Quality. The customer shall properly use and ship the sample bottles provided by My Water Quality.`
    },
    {
      id: 'sample-integrity',
      title: '5. Sample Integrity',
      content: `My Water Quality services, test results and report apply only to the samples received and tested by My Water Quality. My Water Quality will not be responsible for any samples that can not be analyzed due to poor sample integrity due to incorrect sampling procedures. If sample integrity is compromised during shipping, My Water Quality will provide replacement bottles to the customer at no cost.`
    },
    {
      id: 'validity-of-test-results',
      title: '6. Validity of Test Results',
      content: `The results of the test report represent a "snapshot" of the presence of parameters in the water sample selected for testing. My Water Quality makes no representation that the reported test results are representative of the entire volume of water contained in the Water Source at the time the test samples were taken, or the water contained in the Water Source at any time before or after the samples were selected.`
    },
    {
      id: 'accounts',
      title: '7. Accounts',
      content: `When you create an account on our Site, you agree to the following:

• You are solely responsible for your account and the security and privacy of your account, including passwords or sensitive information attached to the account.

• All personal information you provide to us through your account is up to date, accurate, and truthful and that you will update your personal information if it changes.

• We reserve the right to suspend or terminate your account if you are using our Site illegally or if you violate these Terms and Conditions.

You can unsubscribe from My Water Quality services though your account profile at any time.`
    },
    {
      id: 'payments',
      title: '8. Payments',
      content: `We accept the following payment methods on our Site:

• PayPal

When you provide us with your payment information, you authorize our use of and access to the payment instrument you have chosen to use. By providing us with your payment information, you authorize us to charge the amount due to this payment instrument.

If we believe your payment has violated any law or these Terms and Conditions, we reserve the right to cancel or reverse your transaction.`
    },
    {
      id: 'consumer-protection',
      title: '9. Consumer Protection Law',
      content: `Where the Consumer Protection Act, or any other consumer protection legislation in your jurisdiction applies and cannot be excluded, these Terms and Conditions will not limit your legal rights and remedies under that legislation. These Terms and Conditions will be read subject to the mandatory provisions of that legislation. If there is a conflict between these Terms and Conditions and that legislation, the mandatory provisions of the legislation will apply.`
    },
    {
      id: 'links-to-other-websites',
      title: '10. Links to Other Websites',
      content: `Our Site contains links to third party websites or services that we do not own or control. We are not responsible for the content, policies, or practices of any third party website or service linked to on our Site. It is your responsibility to read the terms and conditions and privacy policies of these third party websites before using these sites.`
    },
    {
      id: 'limitation-of-liability',
      title: '11. Limitation of Liability',
      content: `My Water Quality and our directors, officers, agents, employees, subsidiaries, and affiliates will not be liable for any actions, claims, losses, damages, liabilities and expenses including legal fees from your use of the Site.`
    },
    {
      id: 'indemnity',
      title: '12. Indemnity',
      content: `Except where prohibited by law, by using this Site you indemnify and hold harmless My Water Quality and our directors, officers, agents, employees, subsidiaries, and affiliates from any actions, claims, losses, damages, liabilities and expenses including legal fees arising out of your use of our Site and your violation of these Terms and Conditions.`
    },
    {
      id: 'applicable-law',
      title: '13. Applicable Law',
      content: `These Terms and Conditions are governed by the laws of the Province of Ontario.`
    },
    {
      id: 'severability',
      title: '14. Severability',
      content: `If at any time any of the provisions set forth in these Terms and Conditions are found to be inconsistent or invalid under applicable laws, those provisions will be deemed void and will be removed from these Terms and Conditions. All other provisions will not be affected by the removal and the rest of these Terms and Conditions will still be considered valid.`
    },
    {
      id: 'changes',
      title: '15. Changes',
      content: `These Terms and Conditions may be amended from time to time in order to maintain compliance with the law and to reflect any changes to the way we operate our Site and the way we expect users to behave on our Site. We will notify users by email of changes to these Terms and Conditions or post a notice on our Site.`
    },
    {
      id: 'contact-details',
      title: '16. Contact Details',
      content: `Please contact us if you have any questions or concerns. Our contact details are as follows:

Email: info@mywaterquality.ca`
    }
  ];

  return (
    <PageLayout hero={<TermsHero />}>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Introduction */}
        <div className="mb-12 bg-blue-50 rounded-lg p-6">
          <p className="text-gray-700 text-base leading-relaxed">
            These terms and conditions (the "Terms and Conditions") govern the use of{' '}
            <span className="font-semibold text-blue-600">www.mywaterquality.ca</span> (the "Site"). 
            This Site is owned and operated by My Water Quality. This Site is an ecommerce website.
          </p>
          <p className="text-gray-600 text-sm mt-4">
            Click on any section below to expand and read the full terms.
          </p>
        </div>

        {/* Terms and Conditions Accordion */}
        <div className="space-y-4">
          {termsData.map((section) => (
            <div 
              key={section.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors duration-200"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {section.title}
                </h3>
                <div className="flex-shrink-0 ml-4">
                  <svg 
                    className={`h-5 w-5 text-blue-600 transition-transform duration-200 ${
                      openSections[section.id] ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Section Content */}
              {openSections[section.id] && (
                <div className="px-6 pb-6 border-t border-gray-100 bg-white">
                  <div className="pt-4">
                    {section.content.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="text-gray-700 leading-relaxed mb-4 last:mb-0">
                        {paragraph.split('\n').map((line, lineIndex) => (
                          <span key={lineIndex}>
                            {line}
                            {lineIndex < paragraph.split('\n').length - 1 && <br />}
                          </span>
                        ))}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Contact Information */}
        <div className="mt-12 bg-gray-50 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Questions About These Terms?
          </h3>
          <p className="text-gray-600 mb-4">
            If you have any questions or concerns about these Terms and Conditions, please don't hesitate to contact us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a 
              href="mailto:info@mywaterquality.ca"
              className="inline-flex items-center px-4 py-2 border border-blue-600 text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors duration-200"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Us
            </a>
            <a 
              href="/contact"
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              Contact Form
            </a>
          </div>
        </div>

        {/* Print-Friendly Notice */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            For your records, you can print this page or save it as a PDF using your browser's print function.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}