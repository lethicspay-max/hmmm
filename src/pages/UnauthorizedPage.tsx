import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <Shield className="h-24 w-24 text-red-500 mx-auto" />
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Access Denied
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          You don't have permission to access this page. Please check your account permissions or contact support if you believe this is an error.
        </p>
        
        <div className="space-y-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
          
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/corporate/login"
              className="text-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              Corporate Login
            </Link>
            <Link
              to="/admin/login"
              className="text-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              Admin Login
            </Link>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Need help? <Link to="/contact" className="text-blue-600 hover:text-blue-700">Contact Support</Link></p>
        </div>
      </div>
    </div>
  );
}