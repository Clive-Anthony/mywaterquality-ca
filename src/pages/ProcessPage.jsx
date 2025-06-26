// src/pages/ProcessPage.jsx
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

export default function ProcessPage() {
  // Hero section for the process page
  const ProcessHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            My Water Quality Process
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Understanding how we test your drinking water and grade your results
          </p>
        </div>
      </div>
    </div>
  );

  const steps = [
    {
      number: 1,
      title: "Create a User Account",
      content: "Get started by creating your My Water Quality account to access our testing services and track your results.",
      hasButton: true
    },
    {
      number: 2,
      title: "Select Your Drinking Water Quality Test Kit",
      content: "Complete our wizard to select the appropriate drinking water test kit OR manually select the appropriate drinking water test kit that suits your needs."
    },
    {
      number: 3,
      title: "Complete Check-out",
      content: "Purchase your desired drinking water test kit. Look for a confirmation email with details on the drinking water test kit ordered and sampling instructions."
    },
    {
      number: 4,
      title: "Receive Your Testing Kit",
      content: "Your drinking water test kit will arrive by courier within 3-5 days."
    },
    {
      number: 5,
      title: "Read Sampling Instructions",
      content: "Review the sampling instructions provided in your confirmation email as well as within the cooler packaging."
    },
    {
      number: 6,
      title: "Collect Your Drinking Water Sample",
      content: "The day before the drinking water sample is collected, put the foam lid from the drinking water test kit into the freezer, which contains an ice-pack, \
      and arrange with the courier service to pick up sample the follow day. The following day, collect the water \
      sample, pack water bottles back into the drinking water test kit and replace lid from freezer. Place the drinking water test kit in \
      the shipping bag with the return coureri label provided and leave for courier to pick up."
    },
    {
      number: 7,
      title: "Receive Your Results",
      content: "You will receive an email confirming that your sample has been received at the laboratory for analysis, and you will receive a \
      follow-up email that will contain your drinking water quality results which will be in the form of a Report Card. Your results will \
      also be saved and accessible by logging into your User Account."
    }
  ];

  const cwqiGrades = [
    { range: "95-100", quality: "Excellent", description: "Water quality is protected with a virtual absence of threat or impairment; conditions very close to natural or pristine levels." },
    { range: "80-94", quality: "Good", description: "Water quality is protected with only a minor degree of threat or impairment; conditions rarely depart from natural or desirable levels." },
    { range: "65-79", quality: "Fair", description: "Water quality is usually protected but occasionally threatened or impaired; conditions sometimes depart from natural or desirable levels." },
    { range: "45-64", quality: "Marginal", description: "Water quality is frequently threatened or impaired; conditions often depart from natural or desirable levels." },
    { range: "0-44", quality: "Poor", description: "Water quality is almost always threatened or impaired; conditions usually depart from natural or desirable levels." }
  ];

  return (
    <PageLayout hero={<ProcessHero />}>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* Section 1: Water Ordering, Sampling & Reporting Process */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-blue-50 px-8 py-6 border-b border-blue-100">
              <h2 className="text-3xl font-bold text-gray-900 text-center">
                Drinking Water Test Kit Ordering, Sampling & Reporting Process
              </h2>
              <p className="mt-2 text-lg text-gray-600 text-center">
                There are only 7 simple steps
              </p>
            </div>
            
            <div className="px-8 py-8">
              <div className="space-y-8">
                {steps.map((step, index) => (
                  <div key={step.number} className="flex items-start">
                    {/* Step Number */}
                    <div className="flex-shrink-0 mr-6">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{step.number}</span>
                      </div>
                    </div>
                    
                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        Step {step.number}: {step.title}
                      </h3>
                      <p className="text-gray-700 text-base leading-relaxed mb-4">
                        {step.content}
                      </p>
                      
                      {/* Sign up button for Step 1 */}
                      {step.hasButton && (
                        <Link
                          to="/signup"
                          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          Sign Up Here
                          <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: How We Grade Your Water Supply Source */}
        <section>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-blue-50 px-8 py-6 border-b border-blue-100">
              <h2 className="text-3xl font-bold text-gray-900 text-center">
                How We Grade Your Drinking Water Supply Source
              </h2>
            </div>
            
            <div className="px-8 py-8">
              {/* Introduction */}
              <div className="mb-8">
                <p className="text-gray-700 text-base leading-relaxed mb-4">
                  The <strong>Canadian Water Quality Index (CWQI)</strong> is an effective method to rate the water quality and determine its suitability for drinking purposes. CWQI measures a wide variety of parameters of water quality and then cumulatively translates them into one score.
                </p>
                
                <p className="text-gray-700 text-base leading-relaxed mb-6">
                  The CWQI method requires a group of parameters that have drinking water objectives that have been set either by the Canadian government or a province to ensure that the water intended for human consumption:
                </p>
                
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6 ml-4">
                  <li><strong>Health-Related Standards:</strong> Shall not contain disease-causing organisms or unsafe concentrations of toxic chemicals.</li>
                  <li><strong>Aesthetic Objectives:</strong> Should be aesthetically acceptable and palatable.</li>
                  <li><strong>Operational Guidelines:</strong> Should not contain undesirable concentrations of parameters that, if not controlled, may negatively affect the efficient and effective treatment, disinfection, and distribution of water.</li>
                </ul>
                
                <p className="text-gray-700 text-base leading-relaxed mb-8">
                  The CWQI calculates three factors based on these objectives: (1) the number of parameters that fail their objectives, (2) the proportion of samples that fail their objectives, and (3) the relative magnitude of any failures. These factors are combined to give an overall rating that is related to common descriptors. Thus two important environmental aspects, the frequency and severity of adverse conditions, are included in the calculation of the CWQI.
                </p>
              </div>

              {/* CWQI Grading Table */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                  Canadian Water Quality Index (CWQI) Grading Scale
                </h3>
                
                <div className="overflow-hidden">
                  <div className="space-y-4">
                    {cwqiGrades.map((grade, index) => (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mr-4">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
                              grade.quality === 'Excellent' ? 'bg-green-600' :
                              grade.quality === 'Good' ? 'bg-blue-600' :
                              grade.quality === 'Fair' ? 'bg-yellow-600' :
                              grade.quality === 'Marginal' ? 'bg-orange-600' :
                              'bg-red-600'
                            }`}>
                              {grade.range}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">
                              {grade.quality}
                            </h4>
                            <p className="text-gray-700 text-sm leading-relaxed">
                              {grade.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <div className="mt-16 bg-blue-600 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl mb-4">
            Ready to Test Your Drinking Water Quality?
          </h2>
          <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
            Join thousands of Canadians who trust My Water Quality for their drinking water testing needs. 
            Get started today and receive your comprehensive water quality report.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
            >
              Create Your Account
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center px-8 py-3 border border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
            >
              View Drinking Water Test Kits
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}