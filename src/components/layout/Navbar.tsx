import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Gift, Menu, X, LogOut, User, Settings } from 'lucide-react';

export function Navbar() {
  const { currentUser, userRole, userProfile, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Check if we're on a company sub-page
  const isOnCompanySubPage = location.pathname.startsWith('/company/');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const getDashboardLink = () => {
    console.log('getDashboardLink called:', { userRole, userProfile });
    
    if (!userRole || !userProfile) {
      console.log('No user role or profile, returning home');
      return '/';
    }
    
    switch (userRole) {
      case 'admin':
        return '/admin/dashboard';
      case 'corporate':
        return '/corporate/dashboard';
      case 'employee':
        console.log('Employee dashboard logic:', {
          corporateSlug: userProfile?.corporateSlug,
          currentPath: window.location.pathname,
          localStorage: localStorage.getItem('employeeCorporateSlug')
        });
        
        // For employees, use corporateSlug or check localStorage
        if (userProfile?.corporateSlug) {
          console.log('Using corporateSlug:', userProfile.corporateSlug);
          return `/company/${userProfile.corporateSlug}`;
        }
        
        // Fallback to localStorage
        const storedSlug = localStorage.getItem('employeeCorporateSlug');
        if (storedSlug) {
          console.log('Using stored slug from localStorage:', storedSlug);
          return `/company/${storedSlug}`;
        }
        
        // If we're currently on a company page, stay there
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/company/')) {
          const urlSlug = currentPath.split('/company/')[1];
          if (urlSlug) {
            console.log('Using current URL slug as fallback:', urlSlug);
            return `/company/${urlSlug}`;
          }
        }
        
        // If no slug is found, try to get it from the employee's corporate data
        if (userProfile?.corporateId) {
          console.log('Using corporateId as fallback slug:', userProfile.corporateId);
          return `/company/${userProfile.corporateId}`;
        }
        
        console.log('ERROR: No corporate info found for employee, redirecting to home');
        return '/';
      default:
        console.log('Unknown role, going to home');
        return '/';
    }
  };

  // Show loading state while auth is loading
  if (loading) {
    return (
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <img 
                src="https://surajintl.com/img/logo.png" 
                alt="Suraj International" 
                className="h-8 w-auto"
              />
                <span className="font-bold text-xl text-gray-900">Suraj International</span>
              </Link>
            </div>
            <div className="flex items-center">
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="https://surajintl.com/img/logo.png" 
                alt="Suraj International" 
                className="h-8 w-auto"
              />
              <span className="font-bold text-xl text-gray-900">Suraj International</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/about" className="text-gray-700 hover:text-red-600 transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-red-600 transition-colors">
              Contact
            </Link>
            <Link to="/faq" className="text-gray-700 hover:text-red-600 transition-colors">
              FAQ
            </Link>

            {/* Only show authenticated options on main site, not on company sub-pages */}
            {currentUser && !isOnCompanySubPage && (userRole === 'admin' || userRole === 'corporate') ? (
              <div className="flex items-center space-x-4">
                <Link
                  to={getDashboardLink()}
                  className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/corporate/login"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Corporate Login
                </Link>
                <Link
                  to="/corporate/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-gray-900"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              <Link
                to="/about"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                to="/contact"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <Link
                to="/faq"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                FAQ
              </Link>
              
              {/* Only show authenticated options on main site, not on company sub-pages */}
              {currentUser && !isOnCompanySubPage && (userRole === 'admin' || userRole === 'corporate') ? (
                <>
                  <Link
                    to={getDashboardLink()}
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-gray-700 hover:text-red-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/corporate/login"
                    className="block px-3 py-2 text-blue-600 hover:text-blue-700"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Corporate Login
                  </Link>
                  <Link
                    to="/corporate/register"
                    className="block px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ml-3 mr-3"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}