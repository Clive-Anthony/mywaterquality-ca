// OPTION: Update the existing BlogPage.jsx to serve as an index/landing page
// Or keep it as the PFAS article and create a separate BlogIndexPage.jsx

// If you want to create a blog index page listing both articles:
// src/pages/BlogIndexPage.jsx

import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

export default function BlogIndexPage() {
  const blogArticles = [
    {
    title: "Arsenic in Canadian Drinking Water: The Silent Threat in Your Well",
    excerpt: "When Newfoundland tested over 1,000 private wells, 10% exceeded Health Canada's arsenic limits. Learn about this colorless, odorless threat and how to protect your family.",
    readTime: "3 min read",
    date: "October 2025",
    slug: "/blog/arsenic-in-canadian-water",
    image: "/images/blog/arsenic-featured-image.jpg",
    tags: ["Arsenic", "Well Water", "Health"]
    },
    {
      title: "PFAS in Canadian Water: What You Need to Know About 'Forever Chemicals'",
      excerpt: "Recent CBC News investigations reveal PFAS contamination is more widespread across Canada than many realize. Learn about these 'forever chemicals' and what you can do to protect your family.",
      readTime: "2-3 min read",
      date: "October 2025",
      slug: "/blog/pfas-in-canadian-water",
      image: "/images/blog/pfas-featured-image.jpg",
      tags: ["PFAS", "Water Quality", "Health"]
    },
    {
      title: "Lead in Canadian Drinking Water: What You Need to Know",
      excerpt: "Toronto's success story shows how phosphate treatment dramatically reduced lead levels. Discover what's being done across Canada and how to protect your home from lead contamination.",
      readTime: "3 min read",
      date: "October 2025",
      slug: "/blog/lead-in-canadian-water",
      image: "/images/blog/lead-featured-image.jpg",
      tags: ["Lead", "Water Testing", "Public Health"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <TopNav />

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-blue-600 to-blue-800 overflow-hidden">
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
            Expert insights on water quality issues, testing methods, and health impacts across Canada
          </p>
        </div>
      </section>

      {/* Blog Articles Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {blogArticles.map((article, index) => (
              <Link 
                key={index}
                to={article.slug}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 group"
              >
                {/* Article Image */}
                <div className="h-64 bg-gradient-to-r from-blue-100 to-indigo-100 overflow-hidden">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.style.display = 'flex';
                      e.target.parentElement.style.alignItems = 'center';
                      e.target.parentElement.style.justifyContent = 'center';
                    }}
                  />
                </div>

                {/* Article Content */}
                <div className="p-6">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {article.tags.map((tag, tagIndex) => (
                      <span 
                        key={tagIndex}
                        className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-200">
                    {article.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {article.excerpt}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{article.date}</span>
                    <span>{article.readTime}</span>
                  </div>

                  {/* Read More Link */}
                  <div className="mt-4 flex items-center text-blue-600 font-medium group-hover:text-blue-800">
                    <span>Read Article</span>
                    <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Stay Informed About Water Quality
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get the latest insights and updates delivered to your inbox
          </p>
          <Link
            to="/newsletter"
            className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            Subscribe to Newsletter
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}