import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Search } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

export function FAQPage() {
  const [openItems, setOpenItems] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const faqs: FAQ[] = [
    {
      question: "How does the points-based redemption system work?",
      answer: "Corporate admins allocate virtual points to employees. Employees can then browse the product catalog and redeem items using their allocated points. No real money changes hands - everything is managed through the points system.",
      category: "points"
    },
    {
      question: "How long does it take to get corporate account approval?",
      answer: "Corporate account approval typically takes 1-2 business days. Our admin team reviews each application to ensure it meets our requirements. You'll receive an email notification once your account is approved.",
      category: "account"
    },
    {
      question: "Can we customize our company's sub-page?",
      answer: "Yes! Each corporate client gets a branded sub-page with customizable elements including company logos, color schemes, and themes. You can manage these settings from your corporate dashboard once approved.",
      category: "customization"
    },
    {
      question: "How do employees access their gifting portal?",
      answer: "Once you add employees to your account, they receive access to your company's custom sub-page (e.g., /company/Corporate-name). They can log in using their email if it matches what you've provided.",
      category: "employees"
    },
    {
      question: "Who handles shipping and fulfillment?",
      answer: "All shipping and fulfillment is managed by our central gifting company. Once an employee places an order, it's automatically processed and shipped directly to their address. Corporates can track all orders through their dashboard.",
      category: "shipping"
    },
    {
      question: "Can employees choose from all available products?",
      answer: "No, corporate admins select which products from our catalog are available to their employees. This gives companies control over what gifts their employees can choose from while maintaining budget oversight.",
      category: "products"
    },
    {
      question: "What happens if an employee doesn't have enough points?",
      answer: "Employees can only order items if they have sufficient points in their balance. The system prevents orders that exceed their available points. Corporate admins can add more points to any employee's account at any time.",
      category: "points"
    },
    {
      question: "How do I add multiple employees at once?",
      answer: "You can bulk upload employees using our CSV format. Simply prepare a file with email, name, and initial points for each employee (one per line), then use the bulk upload feature in your dashboard.",
      category: "employees"
    },
    {
      question: "Can I track orders placed by my employees?",
      answer: "Yes, corporate admins have full visibility into all orders placed by their employees, including order status, tracking information, and points used. This information is available in your dashboard's orders section.",
      category: "tracking"
    },
    {
      question: "Is there a minimum number of employees required?",
      answer: "No, there's no minimum employee requirement. Whether you have 5 employees or 5,000, our platform scales to meet your needs.",
      category: "account"
    },
    {
      question: "How secure is employee data?",
      answer: "We take data security seriously. All employee information is encrypted and stored securely. We only collect the minimum information needed for account management and order fulfillment.",
      category: "security"
    },
    {
      question: "Can points expire?",
      answer: "Points don't expire by default, but corporate admins can set expiration policies if needed. This is configurable in your account settings.",
      category: "points"
    },
    {
      question: "What if a product is out of stock?",
      answer: "If a product goes out of stock after being ordered, we'll contact the employee with alternatives or offer a full point refund. Stock levels are updated in real-time on the platform.",
      category: "products"
    },
    {
      question: "Can employees return or exchange items?",
      answer: "Yes, we have a standard return/exchange policy. Employees can contact our support team within 30 days of delivery. Points will be refunded for returns, and exchanges are processed based on availability.",
      category: "returns"
    },
    {
      question: "How do I contact support?",
      answer: "You can reach our support team via email at rases@tapwell.co.in, through the contact form on our website, or by phone during business hours. We typically respond within 24 hours.",
      category: "support"
    }
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'points', label: 'Points System' },
    { value: 'account', label: 'Account Management' },
    { value: 'employees', label: 'Employee Management' },
    { value: 'products', label: 'Products' },
    { value: 'shipping', label: 'Shipping & Fulfillment' },
    { value: 'customization', label: 'Customization' },
    { value: 'security', label: 'Security' },
    { value: 'support', label: 'Support' }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <HelpCircle className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Frequently Asked Questions</h1>
          <p className="text-xl md:text-2xl text-blue-100">
            Find answers to common questions about Suraj International
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Search and Filter */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search for answers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-gray-600 text-center">
            {filteredFAQs.length} {filteredFAQs.length === 1 ? 'question' : 'questions'} found
            {searchTerm && ` for "${searchTerm}"`}
            {selectedCategory !== 'all' && ` in ${categories.find(c => c.value === selectedCategory)?.label}`}
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-medium text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  <div className="flex-shrink-0">
                    {openItems.includes(index) ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </button>
                
                {openItems.includes(index) && (
                  <div className="px-6 pb-4">
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search terms or category filter.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 bg-blue-50 p-8 rounded-lg text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Still have questions?
          </h2>
          <p className="text-gray-600 mb-6">
            Our support team is here to help with any additional questions you might have.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </a>
            <a
              href="mailto:rases@tapwell.co.in"
              className="border border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-600 hover:text-white transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}