import React from 'react';
import { Shield, Lock, Eye, Database, Mail, Phone } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-red-600 to-red-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-xl md:text-2xl text-red-100">
            Your privacy and data security are our top priorities
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <p className="text-gray-600 text-lg">
              <strong>Last updated:</strong> January 2, 2026
            </p>
          </div>

          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Lock className="h-6 w-6 text-red-600 mr-2" />
              Introduction
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Suraj International ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our corporate gifting platform.
            </p>
            <p className="text-gray-600 leading-relaxed">
              By using our service, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Database className="h-6 w-6 text-red-600 mr-2" />
              Information We Collect
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Personal Information</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Name and contact information (email, phone number)</li>
                  <li>Company information and job title</li>
                  <li>Shipping addresses for gift delivery</li>
                  <li>Account credentials and authentication data</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Usage Information</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Points allocation and redemption history</li>
                  <li>Product browsing and selection preferences</li>
                  <li>Order history and delivery tracking</li>
                  <li>Platform usage analytics and performance data</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Technical Information</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Operating system and screen resolution</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Eye className="h-6 w-6 text-red-600 mr-2" />
              How We Use Your Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-red-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Delivery</h3>
                <ul className="text-gray-600 space-y-2 text-sm">
                  <li>• Process gift orders and manage fulfillment</li>
                  <li>• Manage points allocation and redemption</li>
                  <li>• Provide customer support and assistance</li>
                  <li>• Maintain and improve platform functionality</li>
                </ul>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Communication</h3>
                <ul className="text-gray-600 space-y-2 text-sm">
                  <li>• Send order confirmations and updates</li>
                  <li>• Provide account notifications</li>
                  <li>• Share platform updates and new features</li>
                  <li>• Respond to inquiries and support requests</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="h-6 w-6 text-red-600 mr-2" />
              Data Security
            </h2>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-600 leading-relaxed mb-4">
                We implement industry-standard security measures to protect your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>End-to-end encryption for all data transmission</li>
                <li>Secure cloud storage with regular backups</li>
                <li>Multi-factor authentication for admin accounts</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Strict access controls and employee training</li>
              </ul>
            </div>
          </section>

          {/* Data Sharing */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Information Sharing</h2>
            
            <p className="text-gray-600 leading-relaxed mb-4">
              We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:
            </p>
            
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
              <li>With your explicit consent</li>
              <li>To fulfill gift orders (shipping partners)</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With service providers who assist in platform operations</li>
            </ul>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-yellow-800 font-medium">
                <strong>Important:</strong> All third-party service providers are contractually bound to protect your information and use it only for specified purposes.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Privacy Rights</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Access & Control</h3>
                <ul className="text-gray-600 space-y-2 text-sm">
                  <li>• View and update your personal information</li>
                  <li>• Download your data in a portable format</li>
                  <li>• Delete your account and associated data</li>
                  <li>• Opt out of non-essential communications</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Protection</h3>
                <ul className="text-gray-600 space-y-2 text-sm">
                  <li>• Request correction of inaccurate data</li>
                  <li>• Limit processing of your information</li>
                  <li>• Object to certain data processing activities</li>
                  <li>• File complaints with regulatory authorities</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies and Tracking</h2>
            
            <p className="text-gray-600 leading-relaxed mb-4">
              We use cookies and similar technologies to enhance your experience on our platform:
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-red-100 p-2 rounded-full mt-1">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Essential Cookies</h4>
                  <p className="text-gray-600 text-sm">Required for basic platform functionality and security</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 p-2 rounded-full mt-1">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Analytics Cookies</h4>
                  <p className="text-gray-600 text-sm">Help us understand how you use our platform to improve services</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 p-2 rounded-full mt-1">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Preference Cookies</h4>
                  <p className="text-gray-600 text-sm">Remember your settings and preferences for a better experience</p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us About Privacy</h2>
            
            <div className="bg-red-50 p-6 rounded-lg">
              <p className="text-gray-600 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-gray-600">Prema.surajinternational@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-gray-600">(+91) 63918 63918</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Updates */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Policy Updates</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically for any changes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}