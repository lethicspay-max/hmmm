import React from 'react';
import { Gift, Users, Award, Truck, Shield, Heart } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-red-600 to-red-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About Suraj International</h1>
          <p className="text-xl md:text-2xl text-red-100">
            Revolutionizing corporate gifting through innovative points-based technology
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-xl text-gray-600">
              At Suraj International, our mission is simple: to empower businesses to strengthen relationships and leave a lasting impression through thoughtful and personalized corporate gifts. We strive to provide innovative solutions that meet our clients' diverse needs, making the process of ordering and distributing gifts seamless and stress-free.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">The Problem We Solve</h3>
              <p className="text-gray-600 mb-4">
                Traditional corporate gifting is complex, involving budget management, payment processing, 
                and coordination challenges. Companies struggle with transparency, employees have limited choices, 
                and HR teams spend countless hours managing the process.
              </p>
              <p className="text-gray-600">
                Suraj International eliminates these pain points with our innovative points-based system, 
                giving employees the freedom to choose while keeping corporate administrators in control.
              </p>
            </div>
            <div className="bg-red-50 p-8 rounded-lg">
              <Gift className="h-16 w-16 text-red-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Points-Based Innovation</h4>
              <p className="text-gray-600">
                No payments, no complex approvals. Just simple point allocation and seamless redemption.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-red-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Transparency</h3>
              <p className="text-gray-600">
                Complete visibility into point allocation, usage, and order tracking for all stakeholders.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Employee Choice</h3>
              <p className="text-gray-600">
                Empowering employees to select gifts that truly resonate with their preferences and needs.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Simplicity</h3>
              <p className="text-gray-600">
                Streamlined processes that remove complexity and make gifting enjoyable for everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Started */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Started</h2>
          </div>
          
          <div className="bg-white border-l-4 border-red-600 pl-8 py-6">
            <blockquote className="text-lg text-gray-700 italic mb-4">
              "After managing corporate gifts for our 500+ employee company, I realized there had to be a better way. 
              The traditional approach was time-consuming, expensive, and often resulted in gifts that employees didn't want."
            </blockquote>
            <div className="flex items-center">
              <img 
                src="https://tapwell.in/wp-content/uploads/2024/07/Rases-Changoiwala.jpg"
                alt="Raja"
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="ml-4">
                <p className="font-semibold">Raja</p>
                <p className="text-sm text-gray-500">Founder & CEO, Suraj International</p>
              </div>
            </div>
          </div>

          <div className="mt-8 prose prose-lg text-gray-600">
            <p>
              Suraj International was born out of the belief that corporate gifting should be easy, efficient, and tailored to individual preferences. We recognized the challenges faced by companies in finding the perfect gifts for their stakeholders while managing the logistics and personalization.
            </p>To address this, we introduced the concept of company stores, empowering businesses to create their own customized store, complete with branded merchandise and a curated selection of products.
            <p>
              
            </p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Leadership Team</h2>
            <p className="text-xl text-gray-600">"Individually, we are one drop. Together, we are an ocean."
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <img 
                src="https://tapwell.in/wp-content/uploads/2024/07/Rases-Changoiwala.jpg"
                alt="Rases Changoiwala"
                className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold mb-1">RAJA</h3>
              <p className="text-red-600 mb-2">Founder & CEO</p>
              
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <img 
                src="https://tapwell.in/wp-content/uploads/2024/07/Ashima-Kothari-1.jpg"
                alt="Ashima Kothari"
                className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold mb-1">Vignesh Subramaniam</h3>
              <p className="text-green-600 mb-2">CFO & CO-FOUNDER</p>
              <p className="text-gray-600">Technology leader</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <img 
                src="https://companyshop.in/images/aboutus/vidya-3.jpg"
                alt="Vidya Jaiswar"
                className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold mb-1">Sayali Chavanr</h3>
              <p className="text-purple-600 mb-2">Administration & Operations</p>
            </div>


            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <img 
                src="https://companyshop.in/images/aboutus/ayushi-4.jpg"
                alt="Ayushi Patel"
                className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold mb-1">Smit Bhatt</h3>
              <p className="text-orange-600 mb-2">Business development & Operations</p>
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
            Join hundreds of companies already using Suraj International to create meaningful employee experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/corporate/register"
              className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors"
            >
              Get Started Today
            </a>
            <a
              href="/contact"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-red-600 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}