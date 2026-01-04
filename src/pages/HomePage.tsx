import React from 'react';
import { Link } from 'react-router-dom';
import { Gift, Users, Award, Truck, CheckCircle, Star, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

export function HomePage() {
  const [openFAQ, setOpenFAQ] = React.useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [isMobile, setIsMobile] = React.useState(false);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const clients = [
    { name: '', logo: 'https://tapwell.in/wp-content/uploads/2024/05/safari.png' },
    { name: '', logo: 'https://tapwell.in/wp-content/uploads/2024/05/mahi.png' },
    { name: '', logo: 'https://tapwell.in/wp-content/uploads/2024/05/aditya.png' },
    { name: '', logo: 'https://tapwell.in/wp-content/uploads/2024/05/irctc.png' },
    { name: '', logo: 'https://tapwell.in/wp-content/uploads/2024/05/urban.png' },
    { name: '', logo: 'https://tapwell.in/wp-content/uploads/2024/05/cello.png' }
  ];

  // Check if mobile on mount and resize
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const itemsPerSlide = isMobile ? 1 : 3;
  const totalSlides = Math.ceil(clients.length / itemsPerSlide);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const getCurrentClients = () => {
    const start = currentSlide * itemsPerSlide;
    return clients.slice(start, start + itemsPerSlide);
  };

  // Auto-advance carousel
  React.useEffect(() => {
    const interval = setInterval(nextSlide, 3000);
    return () => clearInterval(interval);
  }, [totalSlides]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-red-600 to-red-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Streamline Corporate Gifting
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-red-100 max-w-3xl mx-auto">
              Transform your corporate gifting with our points-based blueemption platform. 
              No payments needed, just seamless employee experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/corporate/register"
                className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors"
              >
                Sign Up as Corporate
              </Link>
              <Link
                to="/contact"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-red-600 transition-colors"
              >
                Contact Gifting Company
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Suraj International?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simplify your corporate gifting process with our comprehensive platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Highlighted Feature */}
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <div className="bg-green-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 mt-2">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-green-800">No Platform Fees</h3>
              <p className="text-green-700 font-medium">
                Just pay for gifts - no hidden fees, no platform charges, no subscription costs.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-red-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Gift className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Points-Based System</h3>
              <p className="text-gray-600">
                No payment processing needed. Employees blueeem gifts using allocated points.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-red-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Custom Sub-Pages</h3>
              <p className="text-gray-600">
                Each corporate client gets a branded sub-page for their employees.
              </p>
            </div>
          </div>
          
          {/* Additional Features Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 max-w-4xl mx-auto">
            <div className="text-center p-6">
              <div className="bg-red-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Centralized Fulfillment</h3>
              <p className="text-gray-600">
                One gifting company manages all products, inventory, and shipping.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-red-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Expert Support</h3>
              <p className="text-gray-600">
                Dedicated support team to help you select the perfect gifts for your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted Clients Section */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Clients Who Trust Us
            </h2>
            <p className="text-gray-600">
              Trusted by leading companies worldwide
            </p>
          </div>
          
          <div className="relative">
            {/* Carousel Container */}
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {Array.from({ length: totalSlides }).map((_, slideIndex) => (
                  <div key={slideIndex} className="w-full flex-shrink-0">
                    <div className="flex justify-center items-center space-x-8 px-4">
                      {clients
                        .slice(slideIndex * itemsPerSlide, (slideIndex + 1) * itemsPerSlide)
                        .map((client, index) => (
                          <div 
                            key={`${slideIndex}-${index}`}
                            className="flex-shrink-0 w-32 h-20 md:w-40 md:h-24 bg-white rounded-lg flex items-center justify-center border hover:shadow-md transition-all duration-300 hover:border-red-300 p-4"
                          >
                            <img 
                              src={client.logo} 
                              alt={`${client.name} logo`}
                              className="h-12 md:h-16 w-auto object-contain"
                              onError={(e) => {
                                // Fallback to text if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'text-lg md:text-xl font-bold text-red-600';
                                  fallback.textContent = client.name.substring(0, 2).toUpperCase();
                                  parent.insertBefore(fallback, target.nextSibling);
                                }
                              }}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors z-10"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            
            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors z-10"
            >
              <ChevronRight className="h-6 w-6 text-gray-600" />
            </button>

            {/* Slide Indicators */}
            <div className="flex justify-center mt-6 space-x-2">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-red-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Simple steps to get your corporate gifting program up and running
            </p>
          </div>

          <div className="space-y-6">
            {/* FAQ 1: Corporate signs up */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => toggleFAQ(1)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</div>
                  <h3 className="text-lg font-medium text-gray-900">Corporate signs up</h3>
                </div>
                <div className="flex-shrink-0">
                  {openFAQ === 1 ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </button>
              
              {openFAQ === 1 && (
                <div className="px-6 pb-4">
                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4">
                        <div className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 text-sm font-bold">1</div>
                        <p className="text-gray-700 font-medium">Register your company</p>
                      </div>
                      <div className="text-center p-4">
                        <div className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 text-sm font-bold">2</div>
                        <p className="text-gray-700 font-medium">Get your custom sub-page</p>
                      </div>
                      <div className="text-center p-4">
                        <div className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 text-sm font-bold">3</div>
                        <p className="text-gray-700 font-medium">Start adding employees</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FAQ 2: Gifting company adds products */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => toggleFAQ(2)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</div>
                  <h3 className="text-lg font-medium text-gray-900">Gifting company adds products</h3>
                </div>
                <div className="flex-shrink-0">
                  {openFAQ === 2 ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </button>
              
              {openFAQ === 2 && (
                <div className="px-6 pb-4">
                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4">
                        <div className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 text-sm font-bold">1</div>
                        <p className="text-gray-700 font-medium">Curate product catalog</p>
                      </div>
                      <div className="text-center p-4">
                        <div className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 text-sm font-bold">2</div>
                        <p className="text-gray-700 font-medium">Set point values for each item</p>
                      </div>
                      <div className="text-center p-4">
                        <div className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 text-sm font-bold">3</div>
                        <p className="text-gray-700 font-medium">Manage inventory and fulfillment</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FAQ 3: Corporate allots points */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => toggleFAQ(3)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</div>
                  <h3 className="text-lg font-medium text-gray-900">Corporate allots points</h3>
                </div>
                <div className="flex-shrink-0">
                  {openFAQ === 3 ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </button>
              
              {openFAQ === 3 && (
                <div className="px-6 pb-4">
                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4">
                        <div className="bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 text-sm font-bold">1</div>
                        <p className="text-gray-700 font-medium">Upload excel with names, mails and points</p>
                      </div>
                      <div className="text-center p-4">
                        <div className="bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 text-sm font-bold">2</div>
                        <p className="text-gray-700 font-medium">Allot points to 1 or 10000 no limits</p>
                      </div>
                      <div className="text-center p-4">
                        <div className="bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 text-sm font-bold">3</div>
                        <p className="text-gray-700 font-medium">Edit points after adding employees</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FAQ 4: Recipients blueeem */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => toggleFAQ(4)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">4</div>
                  <h3 className="text-lg font-medium text-gray-900">Recipients blueeem</h3>
                </div>
                <div className="flex-shrink-0">
                  {openFAQ === 4 ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </button>
              
              {openFAQ === 4 && (
                <div className="px-6 pb-4">
                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4">
                        <div className="bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 text-sm font-bold">1</div>
                        <p className="text-gray-700 font-medium">They select their favourite product</p>
                      </div>
                      <div className="text-center p-4">
                        <div className="bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 text-sm font-bold">2</div>
                        <p className="text-gray-700 font-medium">Add shipping and other details</p>
                      </div>
                      <div className="text-center p-4">
                        <div className="bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 text-sm font-bold">3</div>
                        <p className="text-gray-700 font-medium">We deliver directly to their homes</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Get Started CTA */}
      <section className="py-12 bg-red-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 mb-6">
            Join thousands of companies already using our platform
          </p>
          <Link
            to="/corporate/register"
            className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Get Started. It's Free
          </Link>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Perfect for Every Occasion
            </h2>
            <p className="text-xl text-gray-600">
              Versatile gifting solutions for all your corporate needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg">
              <div className="bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Employee Recognition</h3>
              <p className="text-gray-600">
                Celebrate achievements, milestones, and outstanding performance with meaningful gifts that employees actually want.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
              <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Gift className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Holiday Gifting</h3>
              <p className="text-gray-600">
                Make holidays special with personalized gift selections. From Christmas to Diwali, let employees choose what matters to them.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
              <div className="bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Onboarding Gifts</h3>
              <p className="text-gray-600">
                Welcome new hires with thoughtful gifts that help them feel valued from day one and build company culture.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg">
              <div className="bg-yellow-600 text-white rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Project Completion</h3>
              <p className="text-gray-600">
                Reward teams for successful project deliveries and major milestones with gifts that celebrate their hard work.
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg">
              <div className="bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Star className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Anniversary Gifts</h3>
              <p className="text-gray-600">
                Honor work anniversaries and company milestones with memorable gifts that show appreciation for loyalty.
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg">
              <div className="bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Client Appreciation</h3>
              <p className="text-gray-600">
                Strengthen business relationships by sending thoughtful gifts to clients, partners, and stakeholders.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-gray-600 mb-6">
              Whatever the occasion, Suraj International makes corporate gifting simple, personal, and impactful.
            </p>
            <div className="mb-4">
              <Link
                to="/corporate/register"
                className="bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors inline-block"
              >
                Get Started Today
              </Link>
            </div>
            <Link
              to="/contact"
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Discuss your specific use case with our team →
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Clients Say
            </h2>
            <p className="text-xl text-gray-600">
              Trusted by leading companies worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                "I've been working with Suraj International for the past 4 years now & I love the passion & professionalism they have maintained."
              </p>
              <div className="flex items-center">
                <img 
                  src="https://tapwell.in/wp-content/uploads/2024/06/mahindra.png"
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="ml-3">
                  <p className="font-semibold">Mahindra</p>
                  <p className="text-sm text-gray-500">Ritesh Seth</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                "Working with them was like working with my extended team because they understood my requirement so well."
              </p>
              <div className="flex items-center">
                <img 
                  src="https://pnghdpro.com/wp-content/themes/pnghdpro/download/social-media-and-brands/urban-company-app-icon.png"
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="ml-3">
                  <p className="font-semibold">Urban Company</p>
                  <p className="text-sm text-gray-500">Aditya Saini</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                "Our employees love the variety of gifts available. The point system makes it fair and transparent."
              </p>
              <div className="flex items-center">
                <img 
                  src="https://tapwell.in/wp-content/uploads/2024/06/bda6b3a3c5c093ab3b7a62b867652bb5.jpg"
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="ml-3">
                  <p className="font-semibold">Safari</p>
                  <p className="text-sm text-gray-500">Shruti Talekar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-red-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Corporate Gifting?
          </h2>
          <p className="text-xl mb-8 text-red-100">
            Join hundblues of companies already using Suraj International to delight their employees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/corporate/register"
              className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors"
            >
              Get Started Today
            </Link>
            <Link
              to="/contact"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-red-600 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}