import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  orderBy 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Gift, ShoppingCart, LogOut, Plus, Minus, Truck, Package, Star, Eye, EyeOff, Mail, Lock, ArrowLeft, CheckCircle, X, User as UserIcon, Clock, Send, MessageSquare } from 'lucide-react';

interface Employee {
  id: string;
  email: string;
  name: string;
  points: number;
  corporateId: string;
  hasPassword?: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  pointCost: number;
  stock: number;
  category: string;
  imageUrl: string;
  sizes?: string[];
  colors?: string[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface CorporateBranding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  greeting?: string;
  festivalGreeting?: string;
  banner?: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    description?: string;
    banner?: string;
  };
}

interface Corporate {
  id: string;
  companyName: string;
  slug: string;
  status: string;
  branding?: CorporateBranding;
}

interface Order {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  corporateId: string;
  corporateName: string;
  products: any[];
  totalPoints: number;
  shippingAddress: any;
  status: string;
  createdAt: string;
  trackingNumber?: string;
}
interface TicketFormData {
  subject: string;
  category: string;
  priority: string;
  description: string;
  orderId?: string;
}

export function CompanySubPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Company and employee data
  const [corporate, setCorporate] = useState<Corporate | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [selectedOrderForTicket, setSelectedOrderForTicket] = useState<Order | null>(null);
  const [ticketForm, setTicketForm] = useState<TicketFormData>({
    subject: '',
    category: 'order_issue',
    priority: 'medium',
    description: '',
    orderId: ''
  });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [corporateSettings, setCorporateSettings] = useState<any>(null);
  const [ticketSuccess, setTicketSuccess] = useState<{
    show: boolean;
    message: string;
    ticketId: string;
  }>({
    show: false,
    message: '',
    ticketId: ''
  });

  // Authentication flow state
  const [authStep, setAuthStep] = useState<'email' | 'first-time' | 'returning' | 'authenticated'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Shopping cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'confirmation'>('cart');
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    phone: '',
    countryCode: '+1',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });
  const [detectedCountry, setDetectedCountry] = useState<string>('');
  
  // Product view modal state
  const [selectedProductForView, setSelectedProductForView] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  
  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success'
  });
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('products');

  // Country codes and countries data
  const countryCodes = [
    { code: '+1', country: 'US', name: 'United States' },
    { code: '+1', country: 'CA', name: 'Canada' },
    { code: '+44', country: 'GB', name: 'United Kingdom' },
    { code: '+33', country: 'FR', name: 'France' },
    { code: '+49', country: 'DE', name: 'Germany' },
    { code: '+39', country: 'IT', name: 'Italy' },
    { code: '+34', country: 'ES', name: 'Spain' },
    { code: '+31', country: 'NL', name: 'Netherlands' },
    { code: '+32', country: 'BE', name: 'Belgium' },
    { code: '+41', country: 'CH', name: 'Switzerland' },
    { code: '+43', country: 'AT', name: 'Austria' },
    { code: '+45', country: 'DK', name: 'Denmark' },
    { code: '+46', country: 'SE', name: 'Sweden' },
    { code: '+47', country: 'NO', name: 'Norway' },
    { code: '+358', country: 'FI', name: 'Finland' },
    { code: '+351', country: 'PT', name: 'Portugal' },
    { code: '+30', country: 'GR', name: 'Greece' },
    { code: '+48', country: 'PL', name: 'Poland' },
    { code: '+420', country: 'CZ', name: 'Czech Republic' },
    { code: '+36', country: 'HU', name: 'Hungary' },
    { code: '+91', country: 'IN', name: 'India' },
    { code: '+86', country: 'CN', name: 'China' },
    { code: '+81', country: 'JP', name: 'Japan' },
    { code: '+82', country: 'KR', name: 'South Korea' },
    { code: '+65', country: 'SG', name: 'Singapore' },
    { code: '+852', country: 'HK', name: 'Hong Kong' },
    { code: '+61', country: 'AU', name: 'Australia' },
    { code: '+64', country: 'NZ', name: 'New Zealand' },
    { code: '+55', country: 'BR', name: 'Brazil' },
    { code: '+52', country: 'MX', name: 'Mexico' },
    { code: '+54', country: 'AR', name: 'Argentina' },
    { code: '+56', country: 'CL', name: 'Chile' },
    { code: '+57', country: 'CO', name: 'Colombia' },
    { code: '+51', country: 'PE', name: 'Peru' },
    { code: '+27', country: 'ZA', name: 'South Africa' },
    { code: '+971', country: 'AE', name: 'United Arab Emirates' },
    { code: '+966', country: 'SA', name: 'Saudi Arabia' },
    { code: '+90', country: 'TR', name: 'Turkey' },
    { code: '+7', country: 'RU', name: 'Russia' }
  ];

  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'BE', name: 'Belgium' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'AT', name: 'Austria' },
    { code: 'DK', name: 'Denmark' },
    { code: 'SE', name: 'Sweden' },
    { code: 'NO', name: 'Norway' },
    { code: 'FI', name: 'Finland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'GR', name: 'Greece' },
    { code: 'PL', name: 'Poland' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'HU', name: 'Hungary' },
    { code: 'IN', name: 'India' },
    { code: 'CN', name: 'China' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'SG', name: 'Singapore' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'AU', name: 'Australia' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' },
    { code: 'CO', name: 'Colombia' },
    { code: 'PE', name: 'Peru' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'TR', name: 'Turkey' },
    { code: 'RU', name: 'Russia' }
  ];

  // Create dynamic styles based on branding colors
  const getBrandingStyles = () => {
    if (!corporate?.branding) return {};
    
    const { primaryColor, secondaryColor, accentColor } = corporate.branding;
    
    return {
      '--brand-primary': primaryColor || '#3B82F6',
      '--brand-secondary': secondaryColor || '#1E40AF', 
      '--brand-accent': accentColor || '#10B981'
    } as React.CSSProperties;
  };

  // Auto-detect country by IP
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_code) {
          setDetectedCountry(data.country_code);
          const countryInfo = countryCodes.find(c => c.country === data.country_code);
          if (countryInfo) {
            setShippingInfo(prev => ({
              ...prev,
              country: data.country_code,
              countryCode: countryInfo.code
            }));
          }
        }
      } catch (error) {
        console.log('Could not detect country from IP');
      }
    };

    detectCountry();
  }, []);

  const handleCountryChange = (countryCode: string) => {
    const countryInfo = countryCodes.find(c => c.country === countryCode);
    setShippingInfo(prev => ({
      ...prev,
      country: countryCode,
      countryCode: countryInfo?.code || '+1'
    }));
  };

  useEffect(() => {
    if (slug) {
      loadCorporateData();
    }
  }, [slug]);

  useEffect(() => {
    if (corporate && authStep === 'authenticated') {
      loadProducts();
    }
  }, [corporate, authStep]);

  useEffect(() => {
    if (employee && activeTab === 'orders') {
      loadOrders();
    }
  }, [employee, activeTab]);

  const loadOrders = async () => {
    if (!employee) return;
    
    try {
      // Try multiple query approaches to find orders
      let ordersQuery;
      
      // First try with employeeId
      ordersQuery = query(
        collection(db, 'orders'),
        where('employeeId', '==', employee.id)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      let ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      
      // If no orders found with employeeId, try with employeeEmail
      if (ordersData.length === 0) {
        ordersQuery = query(
          collection(db, 'orders'),
          where('employeeEmail', '==', employee.email)
        );
        const ordersSnapshot2 = await getDocs(ordersQuery);
        ordersData = ordersSnapshot2.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));
      }
      
      // If still no orders, try getting all orders for this corporate and filter
      if (ordersData.length === 0 && corporate) {
        ordersQuery = query(
          collection(db, 'orders'),
          where('corporateId', '==', corporate.id)
        );
        const ordersSnapshot3 = await getDocs(ordersQuery);
        const allCorporateOrders = ordersSnapshot3.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));
        
        // Filter by employee email or name
        ordersData = allCorporateOrders.filter(order => 
          order.employeeEmail === employee.email || 
          order.employeeName === employee.name
        );
      }
      
      setOrders(ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      
      console.log('Orders loaded:', ordersData.length, 'orders found for employee:', employee.email);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadCorporateData = async () => {
    try {
      setLoading(true);
      
      if (!slug) {
        return;
      }
      
      const corporatesQuery = query(
        collection(db, 'users'),
        where('slug', '==', slug),
        where('role', '==', 'corporate')
      );
      const corporatesSnapshot = await getDocs(corporatesQuery);
      
      if (corporatesSnapshot.empty) {
        setError('Company not found');
        setLoading(false);
        return;
      }

      const corporateData = {
        id: corporatesSnapshot.docs[0].id,
        ...corporatesSnapshot.docs[0].data()
      } as Corporate;
      
     

      if (corporateData.status !== 'approved') {
        setError('This company page is not available');
        setLoading(false);
        return;
      }

      setCorporate(corporateData);

      // Load branding settings
      const settingsQuery = query(
        collection(db, 'corporateSettings'),
        where('corporateId', '==', corporateData.id)
      );
      const settingsSnapshot = await getDocs(settingsQuery);
      
      if (!settingsSnapshot.empty) {
        const settings = settingsSnapshot.docs[0].data();
        setCorporate(prev => prev ? { ...prev, branding: settings.branding } : null);
      }

      // Load available products for this corporate
      const selectedProductsIds = settingsSnapshot.empty ? [] : 
        (settingsSnapshot.docs[0].data().selectedProducts || []);
      
      if (selectedProductsIds.length > 0) {
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const allProducts = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
        
        const availableProducts = allProducts.filter(product => 
          selectedProductsIds.includes(product.id) && product.stock > 0
        );
        setProducts(availableProducts);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading corporate data:', error);
      setError('Failed to load company information');
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    if (!corporate) return;

    try {
      // Get selected products from corporateSettings
      const settingsQuery = query(
        collection(db, 'corporateSettings'),
        where('corporateId', '==', corporate.id)
      );
      const settingsSnapshot = await getDocs(settingsQuery);

      if (settingsSnapshot.empty) {
        setProducts([]);
        return;
      }

      const selectedProductsIds = settingsSnapshot.docs[0].data().selectedProducts || [];

      if (selectedProductsIds.length === 0) {
        setProducts([]);
        return;
      }

      // Get all active products from Firebase
      const productsQuery = query(
        collection(db, 'products'),
        where('status', '==', 'active')
      );
      const productsSnapshot = await getDocs(productsQuery);

      if (productsSnapshot.empty) {
        setProducts([]);
        return;
      }

      const allProducts = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter to only selected products with stock > 0
      const productsInStock = allProducts.filter((product: any) =>
        selectedProductsIds.includes(product.id) && product.stock > 0
      );

      if (productsInStock.length === 0) {
        setProducts([]);
        return;
      }

      // Get corporate product settings for custom pricing
      const customPricingQuery = query(
        collection(db, 'corporateProductSettings'),
        where('corporateId', '==', corporate.id)
      );
      const customPricingSnapshot = await getDocs(customPricingQuery);

      // Create a map of custom pricing from corporateProductSettings
      const customPricing = new Map();
      customPricingSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.customPrice !== null && data.customPrice !== undefined) {
          customPricing.set(data.productId, data.customPrice);
        }
      });

      // Apply custom pricing to products
      const availableProducts = productsInStock.map((product: any) => {
        const customPrice = customPricing.get(product.id);
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          pointCost: customPrice !== undefined && customPrice !== null ? customPrice : product.pointCost,
          stock: product.stock,
          category: product.category,
          imageUrl: product.imageUrl,
          sizes: product.sizes,
          colors: product.colors,
        };
      });

      setProducts(availableProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!corporate || !emailInput.trim()) return;

    setAuthLoading(true);
    setAuthError('');

    try {
      // Check if employee exists - try multiple approaches
      let employeeData = null;
      
      // First try: exact email match with corporateId
      let employeesQuery = query(
        collection(db, 'employees'),
        where('email', '==', emailInput.toLowerCase().trim()),
        where('corporateId', '==', corporate.id)
      );
      let employeesSnapshot = await getDocs(employeesQuery);
      
      if (!employeesSnapshot.empty) {
        employeeData = {
          id: employeesSnapshot.docs[0].id,
          ...employeesSnapshot.docs[0].data()
        } as Employee;
      } else {
        // Second try: case-insensitive search without toLowerCase
        employeesQuery = query(
          collection(db, 'employees'),
          where('email', '==', emailInput.trim()),
          where('corporateId', '==', corporate.id)
        );
        employeesSnapshot = await getDocs(employeesQuery);
        
        if (!employeesSnapshot.empty) {
          employeeData = {
            id: employeesSnapshot.docs[0].id,
            ...employeesSnapshot.docs[0].data()
          } as Employee;
        } else {
          // Third try: get all employees for this corporate and search manually
          const allEmployeesQuery = query(
            collection(db, 'employees'),
            where('corporateId', '==', corporate.id)
          );
          const allEmployeesSnapshot = await getDocs(allEmployeesQuery);
          
          const foundEmployee = allEmployeesSnapshot.docs.find(doc => {
            const data = doc.data();
            return data.email && data.email.toLowerCase().trim() === emailInput.toLowerCase().trim();
          });
          
          if (foundEmployee) {
            employeeData = {
              id: foundEmployee.id,
              ...foundEmployee.data()
            } as Employee;
          }
        }
      }
      
      if (!employeeData) {
        console.log('Employee search failed for:', {
          email: emailInput,
          corporateId: corporate.id,
          corporateName: corporate.companyName
        });
        setAuthError('Email not found. Please contact your HR department.');
        setAuthLoading(false);
        return;
      }

      console.log('Employee found:', {
        id: employeeData.id,
        email: employeeData.email,
        name: employeeData.name,
        corporateId: employeeData.corporateId
      });

      setEmployee(employeeData);

      // Check if employee has a password (returning user) or needs to create one (first-time)
      if (employeeData.hasPassword) {
        setAuthStep('returning');
      } else {
        setAuthStep('first-time');
      }

      setAuthLoading(false);
    } catch (error) {
      console.error('Error checking employee:', error);
      setAuthError('Failed to verify email. Please try again.');
      setAuthLoading(false);
    }
  };

  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !passwordInput || !confirmPasswordInput) return;

    if (passwordInput.length < 6) {
      setAuthError('Password must be at least 6 characters long');
      return;
    }

    if (passwordInput !== confirmPasswordInput) {
      setAuthError('Passwords do not match');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      try {
        // Create Firebase Auth account
        await createUserWithEmailAndPassword(auth, employee.email, passwordInput);
      } catch (createError: any) {
        if (createError.code === 'auth/email-already-in-use') {
          // Email already exists, try to sign in with provided password
          try {
            await signInWithEmailAndPassword(auth, employee.email, passwordInput);
            // Sign in successful, update employee record
            await updateDoc(doc(db, 'employees', employee.id), {
              hasPassword: true,
              updatedAt: new Date().toISOString()
            });
            setAuthStep('authenticated');
            setAuthLoading(false);
            return;
          } catch (signInError: any) {
            // Sign in failed, account exists but password is wrong
            setAuthError('An account with this email already exists. Please contact your HR department or try logging in with your existing password.');
            setAuthLoading(false);
            return;
          }
        } else {
          // Other creation error
          throw createError;
        }
      }

      // Account created successfully, update employee record
      await updateDoc(doc(db, 'employees', employee.id), {
        hasPassword: true,
        updatedAt: new Date().toISOString()
      });

      setAuthStep('authenticated');
      setAuthLoading(false);
    } catch (error: any) {
      console.error('Error creating account:', error);
      setAuthError(error.message || 'Failed to create account. Please try again.');
      setAuthLoading(false);
    }
  };

  const handleReturningUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !passwordInput) return;

    setAuthLoading(true);
    setAuthError('');

    try {
      await signInWithEmailAndPassword(auth, employee.email, passwordInput);
      setAuthStep('authenticated');
      
      // Trigger confetti animation after successful login
     var count = 500;
var defaults = {
  origin: { y: 0.7 }
};

function fire(particleRatio, opts) {
  confetti({
    ...defaults,
    ...opts,
    particleCount: Math.floor(count * particleRatio)
  });
}

fire(0.25, {
  spread: 26,
  startVelocity: 55,
});
fire(0.2, {
  spread: 60,
});
fire(0.35, {
  spread: 100,
  decay: 0.91,
  scalar: 0.8
});
fire(0.1, {
  spread: 120,
  startVelocity: 25,
  decay: 0.92,
  scalar: 1.2
});
fire(0.1, {
  spread: 120,
  startVelocity: 45,
});
      
      setAuthLoading(false);
    } catch (error: any) {
      console.error('Error signing in:', error);
      setAuthError('Incorrect password. Please try again.');
      setAuthLoading(false);
    }
  };

  const openViewModal = (product: Product) => {
    setSelectedProductForView(product);
    setSelectedSize('');
    setSelectedColor('');
  };

  const closeViewModal = () => {
    setSelectedProductForView(null);
    setSelectedSize('');
    setSelectedColor('');
  };

  const addToCart = (product: Product) => {
    // Check if product has size/color requirements
    const hasRequiblueSelections = 
      (!product.sizes || product.sizes.length === 0 || selectedSize) &&
      (!product.colors || product.colors.length === 0 || selectedColor);

    if (!hasRequiblueSelections) {
      setNotification({
        show: true,
        message: 'Please select requiblue options (size/color) before adding to cart',
        type: 'error'
      });
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
      return;
    }

    // Create product with selected options
    const productWithOptions = {
      ...product,
      selectedSize: selectedSize || undefined,
      selectedColor: selectedColor || undefined
    };

    setCart(prevCart => {
      const existingItem = prevCart.find(item => 
        item.product.id === product.id &&
        item.product.selectedSize === selectedSize &&
        item.product.selectedColor === selectedColor
      );
      
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id &&
          item.product.selectedSize === selectedSize &&
          item.product.selectedColor === selectedColor
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product: productWithOptions, quantity: 1 }];
    });
    
    // Show notification
    setNotification({
      show: true,
      message: `${product.name} added to cart!`,
      type: 'success'
    });
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);

    // Close modal if open
    if (selectedProductForView) {
      closeViewModal();
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const getTotalPoints = () => {
    return cart.reduce((total, item) => total + (item.product.pointCost * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (!employee || !corporate) return;

    // Prevent double submission
    if (orderProcessing) return;

    const totalPoints = getTotalPoints();
    if (totalPoints > employee.points) {
      alert('Insufficient points for this order');
      return;
    }

    try {
      setOrderProcessing(true);

      // Create order
      await addDoc(collection(db, 'orders'), {
        employeeId: employee.id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        corporateId: corporate.id,
        corporateName: corporate.companyName,
        products: cart.map(item => ({
          id: item.product.id,
          name: item.product.name,
          pointCost: item.product.pointCost,
          quantity: item.quantity,
          selectedSize: item.product.selectedSize,
          selectedColor: item.product.selectedColor
        })),
        totalPoints,
        shippingAddress: shippingInfo,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Update product stock in Firebase
      for (const item of cart) {
        const productRef = doc(db, 'products', item.product.id);
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
          const currentStock = productDoc.data().stock;
          const newStock = Math.max(0, currentStock - item.quantity);
          await updateDoc(productRef, { stock: newStock });
        }
      }

      // Update employee points
      await updateDoc(doc(db, 'employees', employee.id), {
        points: employee.points - totalPoints,
        updatedAt: new Date().toISOString()
      });
      
      // Track order statistics for corporate (optional - for reporting only)
      if (corporate) {
        const corporateRef = doc(db, 'users', corporate.id);
        const corporateDoc = await getDoc(corporateRef);
        
        if (corporateDoc.exists()) {
          const currentData = corporateDoc.data();
          const currentOrderCount = currentData.totalOrders || 0;
          const currentOrderValue = currentData.totalOrderValue || 0;
          
          // Only update statistics, not available points
          await updateDoc(corporateRef, {
            totalOrders: currentOrderCount + 1,
            totalOrderValue: currentOrderValue + totalPoints,
            lastOrderDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Update employee state
      setEmployee(prev => prev ? { ...prev, points: prev.points - totalPoints } : null);

      // Clear cart and show confirmation
      setCart([]);
      
      // Reload products to reflect updated stock
      await loadProducts();
      
      setCheckoutStep('confirmation');
      setOrderProcessing(false);
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
      setOrderProcessing(false);
    }
  };

  const resetAuth = () => {
    setAuthStep('email');
    setEmailInput('');
    setPasswordInput('');
    setConfirmPasswordInput('');
    setAuthError('');
    setEmployee(null);
  };
  const handleRaiseTicket = (order?: Order) => {
    if (order) {
      setSelectedOrderForTicket(order);
      setTicketForm(prev => ({
        ...prev,
        orderId: order.id,
        subject: `Issue with order #${order.id.slice(-6)}`
      }));
    } else {
      setSelectedOrderForTicket(null);
      setTicketForm(prev => ({
        ...prev,
        orderId: '',
        subject: ''
      }));
    }
    setShowTicketForm(true);
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee || !corporate) return;
    
    try {
      setTicketSubmitting(true);
      
      const ticketRef = await addDoc(collection(db, 'tickets'), {
        ...ticketForm,
        employeeId: employee.id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        corporateId: corporate.id,
        corporateName: corporate.companyName,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        responses: []
      });
      
      // Reset form and close modal
      setTicketForm({
        subject: '',
        category: 'order_issue',
        priority: 'medium',
        description: '',
        orderId: ''
      });
      setShowTicketForm(false);
      setSelectedOrderForTicket(null);
      
      // Show embedded success message
      setTicketSuccess({
        show: true,
        message: 'Ticket raised successfully! You will receive updates via email.',
        ticketId: ticketRef.id
      });
      
      // Hide success message after 10 seconds
      setTimeout(() => {
        setTicketSuccess(prev => ({ ...prev, show: false }));
      }, 10000);
      
    } catch (error) {
      console.error('Error submitting ticket:', error);
      alert('Failed to submit ticket. Please try again.');
    } finally {
      setTicketSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div 
          className="animate-spin rounded-full h-32 w-32 border-b-2"
          style={{ 
            borderBottomColor: corporate?.branding?.primaryColor || '#3B82F6',
            ...getBrandingStyles() 
          }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Company Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!corporate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Company Not Available</h1>
          <p className="text-gray-600 mb-6">This company page is currently not available.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Authentication screens
  if (authStep !== 'authenticated') {
    const primaryColor = corporate.branding?.primaryColor || '#2563eb';
    const secondaryColor = corporate.branding?.secondaryColor || '#1d4ed8';

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            {corporate.branding?.logo ? (
              <img 
                src={corporate.branding.logo}
                alt={`${corporate.companyName} logo`}
                className="h-16 w-auto"
              />
            ) : (
              <Gift className="h-16 w-16" style={{ color: primaryColor }} />
            )}
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {corporate.companyName}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Employee Gift Portal
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {authStep === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      requiblue
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ 
                        focusRingColor: primaryColor,
                        '--tw-ring-color': primaryColor 
                      } as any}
                      placeholder="Enter your work email"
                    />
                    <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                {authError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                    {authError}
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      backgroundColor: primaryColor,
                      focusRingColor: primaryColor 
                    }}
                  >
                    {authLoading ? 'Checking...' : 'Continue'}
                  </button>
                </div>
              </form>
            )}

            {authStep === 'first-time' && employee && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={resetAuth}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Change email
                  </button>
                </div>

                <div className="text-center mb-6">
                  <UserIcon className="h-12 w-12 mx-auto mb-2" style={{ color: primaryColor }} />
                  <h3 className="text-lg font-medium text-gray-900">Welcome, {employee.name}!</h3>
                  <p className="text-sm text-gray-600">First time here? Create your password</p>
                </div>

                <form onSubmit={handleFirstTimeSetup} className="space-y-6">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Create Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        requiblue
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ 
                          focusRingColor: primaryColor,
                          '--tw-ring-color': primaryColor 
                        } as any}
                        placeholder="Minimum 6 characters"
                      />
                      <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <a 
                        href="/forgot-password?type=employee" 
                        className="text-red-600 hover:text-red-500"
                      >
                        Forgot your password?
                      </a>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        requiblue
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ 
                          focusRingColor: primaryColor,
                          '--tw-ring-color': primaryColor 
                        } as any}
                        placeholder="Confirm your password"
                      />
                      <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {authError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                      {authError}
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ 
                        backgroundColor: primaryColor,
                        focusRingColor: primaryColor 
                      }}
                    >
                      {authLoading ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {authStep === 'returning' && employee && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={resetAuth}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Change email
                  </button>
                </div>

                <div className="text-center mb-6">
                  <UserIcon className="h-12 w-12 mx-auto mb-2" style={{ color: primaryColor }} />
                  <h3 className="text-lg font-medium text-gray-900">Welcome back, {employee.name}!</h3>
                  <p className="text-sm text-gray-600">{employee.email}</p>
                </div>

                <form onSubmit={handleReturningUserLogin} className="space-y-6">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        requiblue
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ 
                          focusRingColor: primaryColor,
                          '--tw-ring-color': primaryColor 
                        } as any}
                        placeholder="Enter your password"
                      />
                      <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <a 
                        href="/forgot-password?type=employee" 
                        className="text-red-600 hover:text-red-500"
                      >
                        Forgot your password?
                      </a>
                    </div>
                  </div>

                  {authError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                      {authError}
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ 
                        backgroundColor: primaryColor,
                        focusRingColor: primaryColor 
                      }}
                    >
                      {authLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main shopping interface (authenticated)
  const primaryColor = corporate.branding?.primaryColor || '#2563eb';

  return (
    <div className="min-h-screen bg-gray-50" style={getBrandingStyles()}>
      {/* Header */}
      <header 
        className="shadow-sm border-b text-white"
        style={{ backgroundColor: corporate.branding?.primaryColor || '#3B82F6' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {corporate.logoUrl ? (
                <img 
                  src={corporate.logoUrl} 
                  alt={`${corporate.companyName} logo`}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <img 
                  src="https://surajintl.com/img/logo.png" 
                  alt="Default logo"
                  className="h-10 w-10 object-contain"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-white">{corporate.companyName}</h1>
                <p className="text-sm text-white opacity-90">Employee Gift Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-white" />
                <span className="text-white">{employee?.name}</span>
              </div>
              <div className="text-sm text-white">
                Points: <span className="font-semibold">{employee?.points}</span>
              </div>
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative bg-white bg-opacity-20 text-white px-4 py-2 rounded-md hover:bg-opacity-30 transition-colors flex items-center space-x-2"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Cart</span>
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                    {getTotalItems()}
                  </span>
                )}
              </button>
              <button
                onClick={resetAuth}
                className="flex items-center space-x-1 text-white hover:text-red-200 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div 
        className="border-b"
        style={{ backgroundColor: `${corporate.branding?.primaryColor || '#3B82F6'}10` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Order History
            </button>
          </nav>
        </div>
      </div>

      {/* Greeting Section */}
      {corporate.branding?.greeting && (
        <div className="bg-gradient-to-r from-red-50 to-indigo-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {corporate.branding.festivalGreeting && (
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {corporate.branding.festivalGreeting}
              </h2>
            )}
            {corporate.branding.greeting && (
              <p className="text-lg text-gray-700">
                {corporate.branding.greeting}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ticket Success Message */}
        {ticketSuccess.show && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  Support Ticket Created Successfully!
                </h3>
                <p className="text-green-700 mb-2">
                  {ticketSuccess.message}
                </p>
                <div className="bg-green-100 rounded-md p-3 mb-3">
                  <p className="text-sm text-green-800">
                    <strong>Ticket ID:</strong> #{ticketSuccess.ticketId.slice(-8)}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Please save this ticket ID for your records. Our support team will respond within 24 hours.
                  </p>
                </div>
                <button
                  onClick={() => setTicketSuccess(prev => ({ ...prev, show: false }))}
                  className="text-sm text-green-600 hover:text-green-800 font-medium"
                >
                  Dismiss
                </button>
              </div>
              <button
                onClick={() => setTicketSuccess(prev => ({ ...prev, show: false }))}
                className="text-green-400 hover:text-green-600 ml-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <>
            {/* Company Banner */}
            {corporate?.branding?.banner && (
              <div className="mb-8 rounded-lg overflow-hidden shadow-md">
                <img
                  src={corporate.branding.banner}
                  alt="Company Banner"
                  className="w-full h-48 md:h-64 object-cover"
                />
              </div>
            )}

            {products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Available</h3>
                <p className="text-gray-600">
                  Your company hasn't selected any products yet. Please contact your HR department.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-48 object-cover cursor-pointer"
                    onClick={() => openViewModal(product)}
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                    <div className="flex justify-between items-center mb-3">
                      <span 
                        className="font-bold text-lg"
                        style={{ color: corporate.branding?.primaryColor || '#3B82F6' }}
                      >
                        {product.pointCost} points
                      </span>
                    </div>
                    <button
                      onClick={() => openViewModal(product)}
                      className="w-full text-white py-2 px-4 rounded-md transition-colors"
                      style={{ 
                        backgroundColor: corporate.branding?.primaryColor || '#3B82F6'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = corporate.branding?.secondaryColor || '#1E40AF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = corporate.branding?.primaryColor || '#3B82F6';
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Order History</h2>
              <p className="text-gray-600">View all your past orders and their status</p>
            </div>
            <div className="p-6">
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                  <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
                  <button
                    onClick={() => setActiveTab('products')}
                    className="text-white px-6 py-2 rounded-md transition-colors"
                    style={{ backgroundColor: corporate.branding?.primaryColor || '#3B82F6' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = corporate.branding?.secondaryColor || '#1E40AF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = corporate.branding?.primaryColor || '#3B82F6';
                    }}
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map(order => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Order #{order.id.slice(-8)}
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            order.status === 'deliveblue' ? 'bg-green-100 text-green-800' :
                            order.status === 'shipped' ? 'bg-red-100 text-red-800' :
                            order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                          {order.trackingNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Tracking:</span>
                              <a
                                href={`https://shiprocket.co/tracking/${order.trackingNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                              >
                                Track on Shiprocket →
                              </a>
                            </div>
                          )}
                          <button
                            onClick={() => handleRaiseTicket(order)}
                            className="flex items-center space-x-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-md hover:bg-orange-200 transition-colors text-sm"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>Raise Ticket</span>
                          </button>
                          <p 
                            className="font-medium"
                            style={{ color: corporate.branding?.primaryColor || '#3B82F6' }}
                          >
                            {order.totalPoints} points
                          </p>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-medium text-gray-900 mb-2">Items Ordeblue:</h4>
                        <div className="space-y-2">
                          {(order.products || []).map((product: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700">
                                {product.name} × {product.quantity}
                                {product.selectedSize && (
                                  <span className="text-gray-500 ml-2">Size: {product.selectedSize}</span>
                                )}
                                {product.selectedColor && (
                                  <span className="text-gray-500 ml-2">Color: {product.selectedColor}</span>
                                )}
                              </span>
                              <span 
                                className="font-medium"
                                style={{ color: corporate.branding?.primaryColor || '#3B82F6' }}
                              >
                                {product.pointCost * product.quantity} points
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {order.shippingAddress && (
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <h4 className="font-medium text-gray-900 mb-2">Shipping Address:</h4>
                          <div className="text-sm text-gray-600">
                            <p>{order.shippingAddress.fullName}</p>
                            <p>{order.shippingAddress.addressLine1}</p>
                            {order.shippingAddress.addressLine2 && (
                              <p>{order.shippingAddress.addressLine2}</p>
                            )}
                            <p>
                              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                            </p>
                            <p>{order.shippingAddress.country}</p>
                            <p>Phone: {order.shippingAddress.countryCode} {order.shippingAddress.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Product View Modal */}
      {selectedProductForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <button
                onClick={closeViewModal}
                className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
                {/* Product Image */}
                <div className="space-y-4">
                  <img
                    src={selectedProductForView.imageUrl}
                    alt={selectedProductForView.name}
                    className="w-full h-96 object-cover rounded-lg"
                  />
                </div>

                {/* Product Details */}
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {selectedProductForView.name}
                    </h1>
                    <div className="flex items-center space-x-4 mb-4">
                      <span 
                        className="text-2xl font-bold"
                        style={{ color: corporate.branding?.primaryColor || '#3B82F6' }}
                      >
                        {selectedProductForView.pointCost} points
                      </span>
                    </div>

                    <div className="space-y-6">
                      {/* Description */}
                      {selectedProductForView.description && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                          <p className="text-gray-600 leading-relaxed">
                            {selectedProductForView.description}
                          </p>
                        </div>
                      )}

                      {/* Size Selection */}
                      {selectedProductForView.sizes && selectedProductForView.sizes.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Available Sizes {selectedProductForView.sizes.length > 0 && <span className="text-red-500">*</span>}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedProductForView.sizes.map((size: string, index: number) => (
                              <button
                                key={index}
                                onClick={() => setSelectedSize(size)}
                                className={`px-4 py-2 border rounded-md font-medium transition-colors ${
                                  selectedSize === size
                                    ? 'bg-green-600 text-white border-green-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Color Selection */}
                      {selectedProductForView.colors && selectedProductForView.colors.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Available Colors {selectedProductForView.colors.length > 0 && <span className="text-red-500">*</span>}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedProductForView.colors.map((color: string, index: number) => (
                              <button
                                key={index}
                                onClick={() => setSelectedColor(color)}
                                className={`px-4 py-2 border rounded-md font-medium transition-colors ${
                                  selectedColor === color
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500'
                                }`}
                              >
                                {color}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Product Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Category</h4>
                          <p className="text-gray-600">{selectedProductForView.category}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t pt-6">
                      <div className="flex space-x-4">
                        <button
                          onClick={closeViewModal}
                          className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => addToCart(selectedProductForView)}
                          className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Add to Cart
                        </button>
                      </div>
                      
                      {/* Requiblue Selection Notice */}
                      {((selectedProductForView.sizes && selectedProductForView.sizes.length > 0) || 
                        (selectedProductForView.colors && selectedProductForView.colors.length > 0)) && (
                        <p className="text-sm text-gray-500 text-center mt-2">
                          <span className="text-red-500">*</span> Requiblue selection
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer 
        className="py-6 text-center text-white"
        style={{ backgroundColor: corporate?.branding?.primaryColor || '#2563eb' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-2">
            <p className="text-sm opacity-90">
              Poweblue by{' '}
              <a 
                href="https://clientsark.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold hover:opacity-80 transition-opacity"
              >
                Suraj International
              </a>
            </p>
            <p className="text-xs opacity-75">
              © 2026 Suraj International. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Shopping Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full my-8 overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Shopping Cart</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[50vh] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium">{item.product.name}</h3>
                        <p className="text-sm text-gray-600">{item.product.pointCost} points each</p>
                        {item.product.selectedSize && (
                          <p className="text-xs text-gray-500">Size: {item.product.selectedSize}</p>
                        )}
                        {item.product.selectedColor && (
                          <p className="text-xs text-gray-500">Color: {item.product.selectedColor}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 rounded-full hover:opacity-80"
                          style={{ backgroundColor: `${corporate.branding?.primaryColor || '#3B82F6'}20` }}
                        >
                          <Minus 
                            className="h-4 w-4"
                            style={{ color: corporate.branding?.primaryColor || '#3B82F6' }}
                          />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 rounded-full hover:opacity-80"
                        >
                          <Plus 
                            className="h-4 w-4"
                            style={{ color: corporate.branding?.primaryColor || '#3B82F6' }}
                          />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.product.pointCost * item.quantity} points</p>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total: {getTotalPoints()} points</span>
                  <span className="text-sm text-gray-600">Available: {employee?.points} points</span>
                </div>
                
                {checkoutStep === 'cart' && (
                  <div>
                    {getTotalPoints() > (employee?.points || 0) && (
                      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-md text-sm">
                        Insufficient points for this order
                      </div>
                    )}
                    <button
                      onClick={() => setCheckoutStep('shipping')}
                      disabled={getTotalPoints() > (employee?.points || 0)}
                      className="w-full text-white py-3 rounded-md transition-colors"
                      style={{ backgroundColor: corporate.branding?.primaryColor || '#3B82F6' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = corporate.branding?.secondaryColor || '#1E40AF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = corporate.branding?.primaryColor || '#3B82F6';
                      }}
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                )}

                {checkoutStep === 'shipping' && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Shipping Information</h3>
                    {detectedCountry && (
                      <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-md text-sm">
                        📍 Auto-detected location: {countries.find(c => c.code === detectedCountry)?.name}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto">
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={shippingInfo.fullName}
                        onChange={(e) => setShippingInfo({...shippingInfo, fullName: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:border-transparent"
                        style={{ 
                          '--tw-ring-color': corporate.branding?.primaryColor || '#3B82F6'
                        } as React.CSSProperties}
                        requiblue
                      />
                      <div className="flex">
                        <select
                          value={shippingInfo.countryCode}
                          onChange={(e) => setShippingInfo({...shippingInfo, countryCode: e.target.value})}
                          className="border border-gray-300 rounded-l-md px-2 py-2 bg-gray-50 text-xs w-16"
                        >
                          {countryCodes.map((country, index) => (
                            <option key={`${country.code}-${country.country}-${index}`} value={country.code}>
                              {country.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          placeholder="Phone Number"
                          value={shippingInfo.phone}
                          onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                          className="border border-gray-300 rounded-r-md px-3 py-2 flex-1 text-sm"
                          requiblue
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Address Line 1"
                        value={shippingInfo.addressLine1}
                        onChange={(e) => setShippingInfo({...shippingInfo, addressLine1: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:border-transparent"
                        style={{ 
                          '--tw-ring-color': corporate.branding?.primaryColor || '#3B82F6'
                        } as React.CSSProperties}
                        requiblue
                      />
                      <input
                        type="text"
                        placeholder="Address Line 2 (Optional)"
                        value={shippingInfo.addressLine2}
                        onChange={(e) => setShippingInfo({...shippingInfo, addressLine2: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:border-transparent"
                        style={{ 
                          '--tw-ring-color': corporate.branding?.primaryColor || '#3B82F6'
                        } as React.CSSProperties}
                      />
                      <input
                        type="text"
                        placeholder="City"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:border-transparent"
                        style={{ 
                          '--tw-ring-color': corporate.branding?.primaryColor || '#3B82F6'
                        } as React.CSSProperties}
                        requiblue
                      />
                      <input
                        type="text"
                        placeholder="State/Province"
                        value={shippingInfo.state}
                        onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:border-transparent"
                        style={{ 
                          '--tw-ring-color': corporate.branding?.primaryColor || '#3B82F6'
                        } as React.CSSProperties}
                        requiblue
                      />
                      <input
                        type="text"
                        placeholder="ZIP/Postal Code"
                        value={shippingInfo.zipCode}
                        onChange={(e) => setShippingInfo({...shippingInfo, zipCode: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:border-transparent"
                        style={{ 
                          '--tw-ring-color': corporate.branding?.primaryColor || '#3B82F6'
                        } as React.CSSProperties}
                        requiblue
                      />
                      <select
                        value={shippingInfo.country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:border-transparent"
                        style={{ 
                          '--tw-ring-color': corporate.branding?.primaryColor || '#3B82F6'
                        } as React.CSSProperties}
                      >
                        {countries.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setCheckoutStep('cart')}
                        className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleCheckout}
                        disabled={orderProcessing || !shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.addressLine1 || !shippingInfo.city || !shippingInfo.state || !shippingInfo.zipCode}
                        className="flex-1 text-white py-3 rounded-md transition-colors"
                        style={{ 
                          backgroundColor: orderProcessing ? '#9CA3AF' : (corporate.branding?.primaryColor || '#3B82F6'),
                          cursor: orderProcessing ? 'not-allowed' : 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          if (!orderProcessing) {
                            e.currentTarget.style.backgroundColor = corporate.branding?.secondaryColor || '#1E40AF';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!orderProcessing) {
                            e.currentTarget.style.backgroundColor = corporate.branding?.primaryColor || '#3B82F6';
                          }
                        }}
                      >
                        {orderProcessing ? 'Processing Order...' : 'Place Order'}
                      </button>
                    </div>
                  </div>
                )}

                {checkoutStep === 'confirmation' && (
                  <div className="text-center py-8">
                    <CheckCircle 
                      className="h-16 w-16 mx-auto mb-4"
                      style={{ color: corporate.branding?.accentColor || '#10B981' }}
                    />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Order Placed Successfully!</h3>
                    <p className="text-gray-600 mb-6">
                      Thank you for your order. You will receive a confirmation email shortly.
                    </p>
                    <div className="bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200 rounded-lg p-4 mb-6">
                      <p className="text-gray-600 mb-4">
                        🎉 {corporate.branding?.festivalGreeting?.replace('{employee?.name}', employee?.name || 'there') || 'Happy holidays!'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowCart(false);
                        setCheckoutStep('cart');
                      }}
                      className="text-white px-6 py-2 rounded-md transition-colors"
                      style={{ backgroundColor: corporate.branding?.primaryColor || '#3B82F6' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = corporate.branding?.secondaryColor || '#1E40AF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = corporate.branding?.primaryColor || '#3B82F6';
                      }}
                    >
                      Continue Shopping
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket Form Modal */}
      {showTicketForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Raise Support Ticket</h2>
                <button
                  onClick={() => setShowTicketForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {selectedOrderForTicket && (
                <div className="bg-red-50 p-4 rounded-lg mb-6">
                  <h3 className="font-medium text-red-900 mb-2">Related Order</h3>
                  <p className="text-sm text-red-700">
                    Order #{selectedOrderForTicket.id.slice(-6)} - {selectedOrderForTicket.totalPoints} points
                  </p>
                </div>
              )}

              <form onSubmit={handleTicketSubmit} className="space-y-6">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    requiblue
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      id="category"
                      requiblue
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="order_issue">Order Issue</option>
                      <option value="product_defect">Product Defect</option>
                      <option value="shipping_delay">Shipping Delay</option>
                      <option value="account_issue">Account Issue</option>
                      <option value="points_issue">Points Issue</option>
                      <option value="general_inquiry">General Inquiry</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                      Priority *
                    </label>
                    <select
                      id="priority"
                      requiblue
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    requiblue
                    rows={6}
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Please provide detailed information about your issue..."
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowTicketForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={ticketSubmitting}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>{ticketSubmitting ? 'Submitting...' : 'Submit Ticket'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg animate-slide-in ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}