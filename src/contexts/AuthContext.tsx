import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  userRole: string | null;
  userProfile: any | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: string, profileData: any) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Check if we're on a company sub-page
  const isOnCompanySubPage = location.pathname.startsWith('/company/');

  // Set up Firebase auth persistence
  useEffect(() => {
    const setupPersistence = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log('Firebase auth persistence set to local');
      } catch (error) {
        console.error('Error setting auth persistence:', error);
      }
    };
    setupPersistence();
  }, []);

  async function register(email: string, password: string, role: string, profileData: any) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email,
      role,
      createdAt: new Date().toISOString(),
      ...profileData
    });
  }

  async function login(email: string, password: string) {
    console.log('Login attempt for:', email);
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Login successful');
  }

  async function logout() {
    await signOut(auth);
    setUserRole(null);
    setUserProfile(null);
  }

  useEffect(() => {
    console.log('Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('=== AUTH STATE CHANGED ===');
      console.log('User:', user ? user.email : 'No user');
      console.log('User UID:', user ? user.uid : 'No UID');
      console.log('Is on company sub-page:', isOnCompanySubPage);
      
      if (user) {
        setCurrentUser(user);
        
        // Only process authentication for non-company sub-pages
        // Company sub-pages handle their own employee authentication
        if (!isOnCompanySubPage) {
          // Fetch user role and profile for admin/corporate users only
          try {
            console.log('Fetching user document for UID:', user.uid);
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            console.log('User document exists:', userDoc.exists());
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log('User document data:', userData);
              console.log('User role from document:', userData.role);
              
              // Only allow admin and corporate roles on main site
              if (userData.role && (userData.role === 'admin' || userData.role === 'corporate')) {
                setUserRole(userData.role);
                console.log('✅ User role set successfully:', userData.role);
                // Merge userData with default values to prevent undefined errors
                const userProfileWithDefaults = {
                  ...userData,
                  companyName: userData.companyName ?? '',
                  contactName: userData.contactName ?? '',
                  phone: userData.phone ?? '',
                  slug: userData.slug ?? '',
                  email: userData.email ?? '',
                  address: userData.address ?? '',
                  description: userData.description ?? '',
                  website: userData.website ?? ''
                };
                setUserProfile(userProfileWithDefaults);
                console.log('✅ User profile set successfully:', userData);
              } else {
                console.log('❌ User role not allowed on main site:', userData.role);
                // Sign out employees who try to access main site
                if (userData.role === 'employee') {
                  await signOut(auth);
                }
                setUserRole(null);
                setUserProfile(null);
              }
            } else {
              console.log('No user profile found for:', user.email);
              // Don't create profiles automatically - let users register properly
              setUserRole(null);
              setUserProfile(null);
            }
          } catch (error) {
            console.error('❌ Error fetching user profile:', error);
            setUserRole(null);
            setUserProfile(null);
          }
        } else {
          // On company sub-pages, don't set role/profile from main auth context
          // The sub-page handles its own employee authentication
          console.log('On company sub-page - skipping main auth processing');
          setUserRole(null);
          setUserProfile(null);
        }
      } else {
        console.log('No user logged in, clearing state');
        setCurrentUser(null);
        setUserRole(null);
        setUserProfile(null);
        // Clear stored employee slug on logout
        localStorage.removeItem('employeeCorporateSlug');
      }
      
      // Always set loading to false at the end
      setLoading(false);
      console.log('=== AUTH STATE PROCESSING COMPLETE ===');
      console.log('Final state - User:', !!user, 'Role:', userRole, 'Loading:', false);
    });

    return unsubscribe;
  }, [isOnCompanySubPage]);

  const value = {
    currentUser,
    userRole,
    userProfile,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}