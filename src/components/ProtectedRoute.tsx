import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { currentUser, userRole, userProfile, loading } = useAuth();
  const location = useLocation();

  console.log('=== PROTECTED ROUTE CHECK ===');
  console.log('Current User exists:', !!currentUser);
  console.log('User Role:', userRole);
  console.log('User Profile exists:', !!userProfile);
  console.log('Allowed Roles:', allowedRoles);
  console.log('Loading:', loading);
  console.log('Require Auth:', requireAuth);
  console.log('Current Path:', location.pathname);

  if (loading || (requireAuth && currentUser && !userProfile)) {
    console.log('🔄 Still loading auth state or user profile...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (requireAuth && !currentUser) {
    console.log('❌ No current user, redirecting to home');
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    console.log('❌ Role check failed!');
    console.log('User role:', userRole);
    console.log('Required roles:', allowedRoles);
    return <Navigate to="/" replace />;
  }

  console.log('✅ Access granted!');
  return <>{children}</>;
}