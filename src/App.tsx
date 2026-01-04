import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ScrollToTop } from './components/ScrollToTop';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Pages
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/static/AboutPage';
import { ContactPage } from './pages/static/ContactPage';
import { FAQPage } from './pages/static/FAQPage';
import { PrivacyPage } from './pages/static/PrivacyPage';

// Auth Pages
import { AdminLogin } from './pages/auth/AdminLogin';
import { CorporateLogin } from './pages/auth/CorporateLogin';
import { CorporateRegister } from './pages/auth/CorporateRegister';
import { ForgotPassword } from './pages/auth/ForgotPassword';

// Dashboard Pages
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { CorporateDashboard } from './pages/dashboards/CorporateDashboard';

// Sub-page
import { CompanySubPage } from './pages/CompanySubPage';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Public Routes with Layout */}
          <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
          <Route path="/about" element={<AppLayout><AboutPage /></AppLayout>} />
          <Route path="/contact" element={<AppLayout><ContactPage /></AppLayout>} />
          <Route path="/faq" element={<AppLayout><FAQPage /></AppLayout>} />
          <Route path="/privacy" element={<AppLayout><PrivacyPage /></AppLayout>} />

          {/* Authentication Routes with Layout */}
          <Route path="/admin/login" element={<AppLayout><AdminLogin /></AppLayout>} />
          <Route path="/corporate/login" element={<AppLayout><CorporateLogin /></AppLayout>} />
          <Route path="/corporate/register" element={<AppLayout><CorporateRegister /></AppLayout>} />
          <Route path="/forgot-password" element={<AppLayout><ForgotPassword /></AppLayout>} />

          {/* Protected Dashboard Routes with Layout */}
          <Route 
            path="/admin/dashboard" 
            element={
              <AppLayout>
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              </AppLayout>
            } 
          />
          <Route 
            path="/corporate/dashboard" 
            element={
              <AppLayout>
                <ProtectedRoute allowedRoles={['corporate']}>
                  <CorporateDashboard />
                </ProtectedRoute>
              </AppLayout>
            } 
          />

          {/* Company Sub-pages WITHOUT Layout (no navbar/footer) */}
          <Route path="/company/:slug" element={<CompanySubPage />} />

          {/* Catch-all 404 with Layout */}
          <Route path="*" element={
            <AppLayout>
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
                  <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
                  <a href="/" className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">
                    Back to Home
                  </a>
                </div>
              </div>
            </AppLayout>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;