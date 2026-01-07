import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  Package,
  Award,
  Settings,
  Plus,
  Upload,
  Eye,
  Edit,
  Trash2,
  Mail,
  DollarSign,
  Gift,
  Download,
  MessageSquare,
  X,
  Search,
  Truck,
  CheckCircle,
  Clock,
  Lock,
  Unlock
} from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { exportOrdersToCSV, formatDateForFilename } from '../../utils/csvExport';

interface CorporateDashboardProps {
  corporateId: string;
  userProfile: any;
  onUpdate: () => void;
}

interface Employee {
  id: string;
  email: string;
  name: string;
  points: number;
  status: 'active' | 'inactive';
  createdAt: string;
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

interface CorporateProductSetting {
  id: string;
  corporateId: string;
  productId: string;
  customPrice: number | null;
  isLocked: boolean;
  selectedByCorporate?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  employeeId: string;
  products: any[];
  totalPoints: number;
  status: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  subject: string;
  message: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
}

export function CorporateDashboard() {
  const { userProfile, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [supportTickets, setSupportTickets] = useState<Ticket[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [employeeProfiles, setEmployeeProfiles] = useState<{[key: string]: any}>({});
  const [loading, setLoading] = useState(true);
  const [corporatePoints, setCorporatePoints] = useState({
    total: 0,
    used: 0,
    available: 0
  });
  const [bulkPointsForAll, setBulkPointsForAll] = useState('');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  const [selectedProductForView, setSelectedProductForView] = useState<Product | null>(null);
  const [showProductViewModal, setShowProductViewModal] = useState(false);

  // New state for product customization
  const [corporateProductSettings, setCorporateProductSettings] = useState<{[key: string]: CorporateProductSetting}>({});
  const [customPrices, setCustomPrices] = useState<{[key: string]: string}>({});
  const [productSelectionLocked, setProductSelectionLocked] = useState(false);

  // Stats calculations
  const shippedCount = orders.filter(order => order.status === 'shipped').length;
  const deliveredCount = orders.filter(order => order.status === 'delivered').length;
  const inProgressCount = orders.filter(order => 
    order.status === 'pending' || 
    order.status === 'processing' || 
    order.status === 'confirmed'
  ).length;

  // Employee form state
  const [employeeForm, setEmployeeForm] = useState({
    email: '',
    name: '',
    points: 100,
  });

  // Bulk employee upload
  const [bulkEmployees, setBulkEmployees] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const handleViewProduct = (product: Product) => {
    setSelectedProductForView(product);
    setShowProductViewModal(true);
  };

  const handleSelectFromView = () => {
    if (selectedProductForView && !selectedProducts.find(p => p === selectedProductForView.id)) {
      setSelectedProducts(prev => [...prev, selectedProductForView.id]);
    }
    setShowProductViewModal(false);
    setSelectedProductForView(null);
  };

  const loadData = async () => {
    try {
      // Load employees for this corporate
      const employeesQuery = query(
        collection(db, 'employees'),
        where('corporateId', '==', currentUser?.uid)
      );
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeesData = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
      setEmployees(employeesData);

      // Load all available products
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setAvailableProducts(productsData);

      // Load employee profiles
      await fetchEmployeeProfiles();

      // Load orders for this corporate
      const ordersQuery = query(
        collection(db, 'orders'),
        where('corporateId', '==', currentUser?.uid)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      setOrders(ordersData);
      setFilteredOrders(ordersData);

      // Load tickets for this corporate
      const ticketsQuery = query(
        collection(db, 'tickets'),
        where('corporateId', '==', currentUser?.uid)
      );
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const ticketsData = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Ticket));
      setTickets(ticketsData);
      setSupportTickets(ticketsData);

      // Load selected products for this corporate
      const corporateDoc = await getDocs(query(
        collection(db, 'corporateSettings'),
        where('corporateId', '==', currentUser?.uid)
      ));
      if (!corporateDoc.empty) {
        const settings = corporateDoc.docs[0].data();
        setSelectedProducts(settings.selectedProducts || []);
        setProductSelectionLocked(settings.productSelectionLocked || false);
      }

      // Load corporate product settings
      await loadCorporateProductSettings();

      // Load corporate points
      if (currentUser?.uid) {
        const corporateUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (corporateUserDoc.exists()) {
          const userData = corporateUserDoc.data();
          const totalPoints = userData.totalPoints || 0;
          const usedPoints = userData.usedPoints || 0;
          setCorporatePoints({
            total: totalPoints,
            used: usedPoints,
            available: totalPoints - usedPoints
          });
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadCorporateProductSettings = async () => {
    try {
      if (!currentUser?.uid) return;

      const settingsQuery = query(
        collection(db, 'corporateProductSettings'),
        where('corporateId', '==', currentUser.uid)
      );
      const settingsSnapshot = await getDocs(settingsQuery);

      const settingsMap: {[key: string]: CorporateProductSetting} = {};
      settingsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        settingsMap[data.productId] = {
          id: doc.id,
          ...data
        } as CorporateProductSetting;
      });

      setCorporateProductSettings(settingsMap);
    } catch (error) {
      console.error('Error loading corporate product settings:', error);
    }
  };

  const fetchEmployeeProfiles = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'employee'), where('corporateId', '==', currentUser?.uid));
      const snapshot = await getDocs(q);
      const profiles: {[key: string]: any} = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        profiles[data.email] = {
          id: doc.id,
          name: data.name || data.displayName || 'Unknown',
          email: data.email,
          phone: data.phone || 'N/A',
          ...data
        };
      });
      setEmployeeProfiles(profiles);
    } catch (error) {
      console.error('Error fetching employee profiles:', error);
    }
  };

  // Filter orders based on search term and status
  React.useEffect(() => {
    let filtered = orders;
    
    // Filter by search term
    if (orderSearchTerm) {
      filtered = filtered.filter(order => {
        const employee = employees.find(emp => emp.id === order.employeeId);
        const employeeName = employee?.name?.toLowerCase() || '';
        const employeeEmail = employee?.email?.toLowerCase() || '';
        const orderId = order.id.toLowerCase();
        const searchLower = orderSearchTerm.toLowerCase();
        
        return employeeName.includes(searchLower) || 
               employeeEmail.includes(searchLower) || 
               orderId.includes(searchLower);
      });
    }
    
    // Filter by status
    if (orderStatusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === orderStatusFilter);
    }
    
    setFilteredOrders(filtered);
  }, [orders, employees, orderSearchTerm, orderStatusFilter]);

  // Helper function to check if product is locked
  const isProductLocked = (productId: string): boolean => {
    const setting = corporateProductSettings[productId];
    return setting !== undefined && setting.isLocked === true;
  };

  // Filter products based on search term and exclude locked products
  const filteredProducts = useMemo(() => {
    return availableProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(productSearchTerm.toLowerCase());
      const isLocked = isProductLocked(product.id);
      return matchesSearch && !isLocked;
    });
  }, [availableProducts, productSearchTerm, corporateProductSettings]);

  const downloadOrdersCSV = async () => {
    try {
      const dataToExport = (orderSearchTerm || (orderStatusFilter && orderStatusFilter !== 'all')) ? filteredOrders : orders;

      if (!dataToExport || dataToExport.length === 0) {
        alert('No orders to export');
        return;
      }

      // Fetch all products to get SKU and other details
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const productsMap = new Map();
      productsSnapshot.forEach(doc => {
        productsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      const csvData = dataToExport.map(order => {
        const employeeProfile = employeeProfiles[order.employeeEmail] || {};

        // Get product details from the order
        const orderProduct = order.products && order.products.length > 0 ? order.products[0] : null;

        // Fetch full product details from products collection
        const fullProduct = orderProduct ? productsMap.get(orderProduct.id) : null;

        return {
          id: order.id || 'N/A',
          employeeName: employeeProfile.name || order.employeeName || 'Unknown',
          employeeEmail: order.employeeEmail || 'N/A',
          employeePhone: employeeProfile.phone || order.employeePhone || order.shippingAddress?.phone || 'N/A',
          corporateName: userProfile?.companyName || 'N/A',
          productName: orderProduct?.name || 'N/A',
          productSKU: fullProduct?.sku || orderProduct?.id || 'N/A',
          productWeight: fullProduct?.weight || 'N/A',
          productSize: orderProduct?.selectedSize || 'N/A',
          productColor: orderProduct?.selectedColor || 'N/A',
          pointsUsed: order.totalPoints || order.pointsUsed || 0,
          status: order.status || 'N/A',
          orderDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
          shippingAddress: order.shippingAddress ?
            `${order.shippingAddress.addressLine1 || ''} ${order.shippingAddress.addressLine2 || ''} ${order.shippingAddress.city || ''} ${order.shippingAddress.state || ''} ${order.shippingAddress.zipCode || ''}`.trim() : 'N/A',
          trackingNumber: order.trackingNumber || ''
        };
      });

      exportOrdersToCSV(csvData, `corporate-orders-${userProfile?.companyName || 'company'}-${formatDateForFilename(new Date())}.csv`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV. Please try again.');
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if corporate has enough points for initial allocation
    if (employeeForm.points > corporatePoints.available) {
      alert(`Insufficient points available. You have ${corporatePoints.available} points available, but trying to allocate ${employeeForm.points} points.`);
      return;
    }
    
    try {
      await addDoc(collection(db, 'employees'), {
        ...employeeForm,
        corporateId: currentUser?.uid,
        corporateCompany: userProfile?.companyName,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
      
      // Update corporate used points
      if (employeeForm.points > 0) {
        const corporateRef = doc(db, 'users', currentUser?.uid || '');
        const corporateDoc = await getDoc(corporateRef);
        
        if (corporateDoc.exists()) {
          const currentData = corporateDoc.data();
          const currentUsedPoints = currentData.usedPoints || 0;
          
          await updateDoc(corporateRef, {
            usedPoints: currentUsedPoints + employeeForm.points,
            updatedAt: new Date().toISOString()
          });
          
          // Log the point transaction
          await addDoc(collection(db, 'pointTransactions'), {
            type: 'corporate_to_employee',
            fromId: currentUser?.uid,
            toId: 'new_employee',
            points: employeeForm.points,
            reason: `Initial point allocation to new employee: ${employeeForm.name}`,
            createdAt: new Date().toISOString()
          });
        }
      }
      
      setEmployeeForm({
        email: '',
        name: '',
        points: 100,
      });
      
      loadData();
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkEmployees.trim()) return;

    // Parse and validate total points needed
    const lines = bulkEmployees.trim().split('\n');
    let totalPointsNeeded = 0;
    const employeeData = [];

    for (const line of lines) {
      const [email, name, points = '100'] = line.split(',').map(s => s.trim());
      if (email && name) {
        const pointsNum = parseInt(points);
        totalPointsNeeded += pointsNum;
        employeeData.push({
          email,
          name,
          points: pointsNum,
          corporateId: currentUser?.uid,
          corporateCompany: userProfile?.companyName,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Check if corporate has enough points
    if (totalPointsNeeded > corporatePoints.available) {
      alert(`Insufficient points available. You need ${totalPointsNeeded} points but only have ${corporatePoints.available} available.`);
      return;
    }

    try {
      for (const employee of employeeData) {
        await addDoc(collection(db, 'employees'), employee);
      }
      
      // Update corporate used points
      if (totalPointsNeeded > 0) {
        const corporateRef = doc(db, 'users', currentUser?.uid || '');
        const corporateDoc = await getDoc(corporateRef);
        
        if (corporateDoc.exists()) {
          const currentData = corporateDoc.data();
          const currentUsedPoints = currentData.usedPoints || 0;
          
          await updateDoc(corporateRef, {
            usedPoints: currentUsedPoints + totalPointsNeeded,
            updatedAt: new Date().toISOString()
          });
          
          // Log the point transaction
          await addDoc(collection(db, 'pointTransactions'), {
            type: 'corporate_to_employee',
            fromId: currentUser?.uid,
            toId: 'bulk_upload',
            points: totalPointsNeeded,
            reason: `Bulk upload of ${employeeData.length} employees`,
            createdAt: new Date().toISOString()
          });
        }
      }

      setBulkEmployees('');
      loadData();
    } catch (error) {
      console.error('Error bulk uploading employees:', error);
    }
  };

  const handleBulkAddPointsToAll = async () => {
    if (!bulkPointsForAll || isNaN(Number(bulkPointsForAll)) || Number(bulkPointsForAll) <= 0) {
      alert('Please enter a valid number of points');
      return;
    }

    const pointsToAdd = Number(bulkPointsForAll);
    const totalPointsNeeded = pointsToAdd * employees.length;

    if (totalPointsNeeded > corporatePoints.available) {
      alert(`Insufficient points. You need ${totalPointsNeeded} points but only have ${corporatePoints.available} available.`);
      return;
    }

    if (!confirm(`Add ${pointsToAdd} points to all ${employees.length} employees? This will use ${totalPointsNeeded} points from your allocation.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Update all employees' points
      const updatePromises = employees.map(async (employee) => {
        const employeeRef = doc(db, 'employees', employee.id);
        const newPoints = (employee.points || 0) + pointsToAdd;
        
        await updateDoc(employeeRef, {
          points: newPoints,
          updatedAt: new Date().toISOString()
        });

        // Create transaction record
        await addDoc(collection(db, 'pointTransactions'), {
          type: 'corporate_to_employee',
          fromId: currentUser?.uid,
          toId: employee.id,
          points: pointsToAdd,
          reason: `Bulk points addition to all employees`,
          createdAt: new Date().toISOString()
        });
      });

      await Promise.all(updatePromises);

      // Update corporate used points
      const corporateRef = doc(db, 'users', currentUser!.uid);
      const corporateDoc = await getDoc(corporateRef);
      
      if (corporateDoc.exists()) {
        const currentData = corporateDoc.data();
        const currentUsedPoints = currentData.usedPoints || 0;
        
        await updateDoc(corporateRef, {
          usedPoints: currentUsedPoints + totalPointsNeeded,
          updatedAt: new Date().toISOString()
        });
      }

      alert(`Successfully added ${pointsToAdd} points to all ${employees.length} employees!`);
      setBulkPointsForAll('');
      
      // Refresh data
      loadData();
    } catch (error) {
      console.error('Error adding bulk points to all employees:', error);
      alert('Failed to add points to all employees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelection = async (productId: string, selected: boolean) => {
    const newSelection = selected
      ? [...selectedProducts, productId]
      : selectedProducts.filter(id => id !== productId);

    setSelectedProducts(newSelection);

    try {
      // Update or create corporate settings
      const corporateSettingsQuery = query(
        collection(db, 'corporateSettings'),
        where('corporateId', '==', currentUser?.uid)
      );
      const existingSettings = await getDocs(corporateSettingsQuery);

      if (existingSettings.empty) {
        await addDoc(collection(db, 'corporateSettings'), {
          corporateId: currentUser?.uid,
          selectedProducts: newSelection,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await updateDoc(existingSettings.docs[0].ref, {
          selectedProducts: newSelection,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error updating product selection:', error);
    }
  };

  const handleSaveProductCustomization = async (productId: string) => {
    try {
      if (!currentUser?.uid) return;

      const docId = `${currentUser.uid}_${productId}`;

      // Get existing settings to preserve admin-set values
      const docRef = doc(db, 'corporateProductSettings', docId);
      const docSnap = await getDoc(docRef);

      const existingData = docSnap.exists() ? docSnap.data() : {};

      const productSettingData = {
        ...existingData,
        corporateId: currentUser.uid,
        productId: productId,
        selectedByCorporate: true,
        updatedAt: new Date().toISOString(),
        ...(docSnap.exists() ? {} : { createdAt: new Date().toISOString() })
      };

      await setDoc(docRef, productSettingData, { merge: true });

      // Reload the settings
      await loadCorporateProductSettings();

      alert('Product selected successfully!');
    } catch (error) {
      console.error('Error selecting product:', error);
      alert('Error selecting product. Please try again.');
    }
  };

  const getDisplayPrice = (product: Product): number => {
    const setting = corporateProductSettings[product.id];
    if (setting && setting.customPrice !== null) {
      return setting.customPrice;
    }
    return product.pointCost;
  };

  const isProductCustomized = (productId: string): boolean => {
    const setting = corporateProductSettings[productId];
    return setting !== undefined && (setting.selectedByCorporate === true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm('Are you sure you want to remove this employee?')) {
      try {
        await deleteDoc(doc(db, 'employees', employeeId));
        loadData();
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  const handleUpdateEmployeePoints = async (employeeId: string, newPoints: number) => {
    const currentEmployee = employees.find(emp => emp.id === employeeId);
    if (!currentEmployee) return;
    
    const pointDifference = newPoints - currentEmployee.points;
    
    // Check if corporate has enough points
    if (pointDifference > 0 && pointDifference > corporatePoints.available) {
      alert('Insufficient points available. Please contact admin for more points.');
      return;
    }
    
    // Prevent negative points
    if (newPoints < 0) {
      alert('Employee points cannot be negative.');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'employees', employeeId), {
        points: newPoints,
        updatedAt: new Date().toISOString()
      });
      
      // Update corporate used points
      if (pointDifference !== 0) {
        const corporateRef = doc(db, 'users', currentUser?.uid || '');
        const corporateDoc = await getDoc(corporateRef);
        
        if (corporateDoc.exists()) {
          const currentData = corporateDoc.data();
          const currentUsedPoints = currentData.usedPoints || 0;
          
          await updateDoc(corporateRef, {
            usedPoints: currentUsedPoints + pointDifference,
            updatedAt: new Date().toISOString()
          });
          
          // Log the point transaction
          await addDoc(collection(db, 'pointTransactions'), {
            type: 'corporate_to_employee',
            fromId: currentUser?.uid,
            toId: employeeId,
            points: Math.abs(pointDifference),
            reason: pointDifference > 0 ? 'Points added to employee' : 'Points removed from employee',
            createdAt: new Date().toISOString()
          });
        }
      }
      
      loadData();
    } catch (error) {
      console.error('Error updating employee points:', error);
    }
  };

  // Calculate stats
  const stats = {
    totalEmployees: employees.length,
    selectedProductsCount: selectedProducts.length,
    totalOrders: orders.length,
    totalTickets: tickets.length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Corporate Dashboard</h1>
          <p className="text-gray-600">Welcome back, {userProfile?.companyName}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Points</p>
                <p className="text-2xl font-semibold text-gray-900">{corporatePoints.available}</p>
                <p className="text-xs text-gray-500">Total: {corporatePoints.total} | Used: {corporatePoints.used}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Selected Products</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.selectedProductsCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-full">
                <Truck className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Orders Shipped</p>
                <p className="text-2xl font-bold text-gray-900">{shippedCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Orders Delivered</p>
                <p className="text-2xl font-bold text-gray-900">{deliveredCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{inProgressCount}</p>
              </div>
            </div>
          </div>
        </div>

        {userProfile?.status === 'approved' ? (
          <>
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex flex-wrap">
                  {['overview', 'employees', 'products', 'orders', 'points', 'analytics', 'tickets', 'settings']
                    .filter(tab => !(tab === 'products' && productSelectionLocked))
                    .map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-2 px-4 border-b-2 font-medium text-sm capitalize ${
                        activeTab === tab
                          ? 'border-red-500 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Dashboard Overview</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium mb-2">Recent Employee Activity</h3>
                        <div className="space-y-2">
                          {employees.slice(0, 5).map(employee => (
                            <div key={employee.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{employee.name}</p>
                                <p className="text-sm text-gray-600">{employee.email}</p>
                              </div>
                              <span className="text-red-600 font-medium">{employee.points} points</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-2">Recent Orders</h3>
                        <div className="space-y-2">
                          {orders.slice(0, 5).map(order => (
                            <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">Order #{order.id.slice(-8)}</p>
                                <p className="text-sm text-gray-600">{order.totalPoints} points</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                order.status === 'shipped' ? 'bg-red-100 text-red-800' :
                                order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                          onClick={() => setActiveTab('employees')}
                          className="flex items-center justify-center p-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Add Employee
                        </button>
                        <button
                          onClick={() => setActiveTab('products')}
                          className="flex items-center justify-center p-4 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <Package className="h-5 w-5 mr-2" />
                          Manage Products
                        </button>
                        <div className="flex items-center justify-center p-4 bg-purple-50 text-purple-600 rounded-lg">
                          <Eye className="h-5 w-5 mr-2" />
                          <span>Sub-page: /company/{userProfile?.slug || 'company'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'employees' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold">Employee Management</h2>
                    </div>

                    {/* Add Employee Forms */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Single Employee Form */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium mb-4">Add Single Employee</h3>
                        <form onSubmit={handleAddEmployee} className="space-y-4">
                          <input
                            type="email"
                            placeholder="Employee Email"
                            value={employeeForm.email}
                            onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Employee Name"
                            value={employeeForm.name}
                            onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            required
                          />
                          <input
                            type="number"
                            placeholder="Initial Points"
                            value={employeeForm.points}
                            onChange={(e) => setEmployeeForm({...employeeForm, points: parseInt(e.target.value)})}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            required
                          />
                          <button
                            type="submit"
                            className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700"
                          >
                            Add Employee
                          </button>
                        </form>
                      </div>

                      {/* Bulk Upload Form */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium mb-4">Bulk Upload Employees</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Import CSV File
                            </label>
                            <input
                              type="file"
                              accept=".csv"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const csv = event.target?.result as string;
                                    const lines = csv.split('\n');
                                    const employees = lines.slice(1).map(line => {
                                      const [name, email, points] = line.split(',');
                                      return `${name?.trim()},${email?.trim()},${points?.trim() || '0'}`;
                                    }).filter(line => line.split(',')[0] && line.split(',')[1]);
                                    setBulkEmployees(employees.join('\n'));
                                  };
                                  reader.readAsText(file);
                                }
                              }}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Upload a CSV file with columns: Name, Email, Points
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              CSV Format: email,name,points (one per line)
                            </label>
                            <textarea
                              value={bulkEmployees}
                              onChange={(e) => setBulkEmployees(e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 h-32"
                              placeholder="john@company.com,John Doe,100&#10;jane@company.com,Jane Smith,150"
                            />
                          </div>
                          <button
                            onClick={handleBulkUpload}
                            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
                          >
                            Upload Employees
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Employees List */}
                    <div className="bg-white rounded-lg border">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium">Current Employees ({employees.length})</h3>
                      </div>
                      
                      {/* Bulk Add Points to All Employees */}
                      <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                        <h4 className="text-md font-semibold text-red-900 mb-3">Add Points to All Employees</h4>
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <input
                              type="number"
                              value={bulkPointsForAll}
                              onChange={(e) => setBulkPointsForAll(e.target.value)}
                              placeholder="Enter points to add to all employees"
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              min="1"
                            />
                          </div>
                          <button
                            onClick={handleBulkAddPointsToAll}
                            disabled={loading || !bulkPointsForAll || employees.length === 0}
                            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          >
                            <Gift className="h-4 w-4" />
                            <span>Add to All ({employees.length})</span>
                          </button>
                        </div>
                        <p className="text-sm text-red-700 mt-2">
                          Total points needed: {bulkPointsForAll ? Number(bulkPointsForAll) * employees.length : 0} | 
                          Available: {corporatePoints.available}
                        </p>
                      </div>

                      <div className="divide-y divide-gray-200">
                        {employees.map(employee => (
                          <div key={employee.id} className="px-6 py-4 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{employee.name}</p>
                              <p className="text-sm text-gray-500">{employee.email}</p>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">Points:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max={employee.points + corporatePoints.available}
                                  value={employee.points}
                                  onChange={(e) => handleUpdateEmployeePoints(employee.id, parseInt(e.target.value))}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <button
                                onClick={() => handleDeleteEmployee(employee.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'products' && !productSelectionLocked && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold">Product Selection</h2>
                      <p className="text-gray-600">Select products available to your employees</p>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-6">
                      <div className="relative">
                        <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="Search products by name, description, or category..."
                          value={productSearchTerm}
                          onChange={(e) => setProductSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      {productSearchTerm && (
                        <p className="text-sm text-gray-600 mt-2">
                          Showing {filteredProducts.length} of {availableProducts.length} products
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredProducts.map(product => {
                        const isCustomized = isProductCustomized(product.id);
                        const displayPrice = getDisplayPrice(product);
                        return (
                          <div key={product.id} className="border rounded-lg overflow-hidden">
                            <div className="relative">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-48 object-cover"
                              />
                              {isCustomized && (
                                <div className="absolute top-2 right-2">
                                  <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Customized
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-lg">{product.name}</h3>
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedProducts.includes(product.id)}
                                    onChange={(e) => handleProductSelection(product.id, e.target.checked)}
                                    className="mr-2"
                                  />
                                  <span className="text-sm">Select</span>
                                </label>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                              <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                  <span className="text-red-600 font-medium">{displayPrice} points</span>
                                  {isCustomized && displayPrice !== product.pointCost && (
                                    <span className="text-xs text-gray-500 line-through">
                                      Original: {product.pointCost} points
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleViewProduct(product)}
                                  className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 text-sm"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredProducts.length === 0 && productSearchTerm && (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No products found matching "{productSearchTerm}"</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold">Order History</h2>
                      <button
                        onClick={downloadOrdersCSV}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download CSV</span>
                      </button>
                    </div>
                    
                    {/* Search and Filter Controls */}
                    <div className="mb-6 flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Search by employee name, email, or order ID..."
                          value={orderSearchTerm}
                          onChange={(e) => setOrderSearchTerm(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <select
                          value={orderStatusFilter}
                          onChange={(e) => setOrderStatusFilter(e.target.value)}
                          className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="all">All Status</option>
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-4 text-sm text-gray-600">
                      Showing {filteredOrders.length} of {orders.length} orders
                    </div>
                    
                    <div className="bg-white rounded-lg border">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Order ID
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Employee
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Points
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredOrders.map(order => {
                              const employee = employees.find(emp => emp.id === order.employeeId);
                              return (
                                <tr key={order.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    #{order.id.slice(-8)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div>
                                      <div className="font-medium">{employeeProfiles[order.employeeEmail]?.name || order.employeeName || 'Unknown'}</div>
                                      <div className="text-xs text-gray-400">{employee?.email || ''}</div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {order.totalPoints}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                      order.status === 'shipped' ? 'bg-red-100 text-red-800' :
                                      order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {order.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                  </td>
                                </tr>
                              );
                            })}
                            {filteredOrders.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                  {orderSearchTerm || orderStatusFilter !== 'all' ? 'No orders match your search criteria' : 'No orders found'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-6">Employee Analytics</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Points Distribution Chart */}
                      <div className="bg-white p-6 rounded-lg border">
                        <h3 className="text-lg font-medium mb-4">Points Distribution</h3>
                        <div className="space-y-4">
                          {employees.map(employee => {
                            const usedPoints = orders
                              .filter(order => order.employeeId === employee.id)
                              .reduce((sum, order) => sum + order.totalPoints, 0);
                            const remainingPoints = employee.points - usedPoints;
                            const usagePercentage = employee.points > 0 ? (usedPoints / employee.points) * 100 : 0;
                            
                            return (
                              <div key={employee.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                                <div className="flex justify-between items-center mb-2">
                                  <div>
                                    <p className="font-medium text-gray-900">{employee.name}</p>
                                    <p className="text-sm text-gray-500">{employee.email}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                      {remainingPoints} / {employee.points} points
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {usagePercentage.toFixed(1)}% used
                                    </p>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Summary Statistics */}
                      <div className="bg-white p-6 rounded-lg border">
                        <h3 className="text-lg font-medium mb-4">Usage Summary</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                            <span className="font-medium text-red-900">Total Points Allocated</span>
                            <span className="text-red-600 font-bold">
                              {employees.reduce((sum, emp) => sum + emp.points, 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="font-medium text-green-900">Points Used</span>
                            <span className="text-green-600 font-bold">
                              {orders.reduce((sum, order) => sum + order.totalPoints, 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                            <span className="font-medium text-yellow-900">Points Remaining</span>
                            <span className="text-yellow-600 font-bold">
                              {employees.reduce((sum, emp) => {
                                const usedPoints = orders
                                  .filter(order => order.employeeId === emp.id)
                                  .reduce((orderSum, order) => orderSum + order.totalPoints, 0);
                                return sum + (emp.points - usedPoints);
                              }, 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                            <span className="font-medium text-purple-900">Average Usage</span>
                            <span className="text-purple-600 font-bold">
                              {employees.length > 0 ? 
                                ((orders.reduce((sum, order) => sum + order.totalPoints, 0) / 
                                  employees.reduce((sum, emp) => sum + emp.points, 0)) * 100).toFixed(1) 
                                : 0}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Top Users */}
                        <div className="mt-6">
                          <h4 className="font-medium text-gray-900 mb-3">Top Point Users</h4>
                          <div className="space-y-2">
                            {employees
                              .map(employee => {
                                const usedPoints = orders
                                  .filter(order => order.employeeId === employee.id)
                                  .reduce((sum, order) => sum + order.totalPoints, 0);
                                return { ...employee, usedPoints };
                              })
                              .sort((a, b) => b.usedPoints - a.usedPoints)
                              .slice(0, 5)
                              .map((employee, index) => (
                                <div key={employee.id} className="flex justify-between items-center py-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                                    <span className="text-sm font-medium text-gray-900">{employee.name}</span>
                                  </div>
                                  <span className="text-sm text-red-600 font-medium">
                                    {employee.usedPoints} points
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'tickets' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-6">Support Tickets</h2>
                    {supportTickets.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Subject
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Employee
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Priority
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {supportTickets.map((ticket) => (
                              <tr key={ticket.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {ticket.subject}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div>
                                    <div className="font-medium">{ticket.employeeName}</div>
                                    <div className="text-xs text-gray-400">{ticket.employeeEmail}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                  <div className="break-words">
                                    {ticket.description && ticket.description.length > 100 ? (
                                      <>
                                        {ticket.description.substring(0, 100)}...
                                        <button
                                          onClick={() => setSelectedTicket(ticket)}
                                          className="ml-2 text-red-600 hover:text-red-800 text-xs"
                                        >
                                          View Full
                                        </button>
                                      </>
                                    ) : (
                                      ticket.description
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                                    ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {ticket.priority}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    ticket.status === 'open' ? 'bg-red-100 text-red-800' :
                                    ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {ticket.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(ticket.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => setSelectedTicket(ticket)}
                                    className="text-red-600 hover:text-red-900 mr-3"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No support tickets found</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'points' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-6">Point Management</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-lg border">
                        <h3 className="text-lg font-medium mb-4">Point Summary</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                            <span className="font-medium text-red-900">Total Points Allocated</span>
                            <span className="text-red-600 font-bold">{corporatePoints.total}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                            <span className="font-medium text-red-900">Points Used</span>
                            <span className="text-red-600 font-bold">{corporatePoints.used}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="font-medium text-green-900">Points Available</span>
                            <span className="text-green-600 font-bold">{corporatePoints.available}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <PointTransactionHistory corporateId={currentUser?.uid || ''} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-6">Company Settings</h2>
                    <div className="space-y-6">
                      {/* Branding Settings */}
                      <div className="bg-white p-6 rounded-lg border">
                        <h3 className="text-lg font-medium mb-4">Branding & Customization</h3>
                        <BrandingSettings corporateId={currentUser?.uid || ''} onUpdate={loadData} />
                      </div>

                      <div className="bg-white p-6 rounded-lg border">
                        <h3 className="text-lg font-medium mb-4">Company Information</h3>
                        <CompanyInfoSettings corporateId={currentUser?.uid || ''} userProfile={userProfile} onUpdate={loadData} />
                      </div>

                      <div className="bg-white p-6 rounded-lg border">
                        <h3 className="text-lg font-medium mb-4">Employee Access Link</h3>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <p className="text-sm text-red-800 mb-2">
                            Share this link with your employees to access their gifting portal:
                          </p>
                          <div className="flex items-center space-x-2">
                            <code className="bg-white px-3 py-2 rounded text-sm flex-1">
                              {window.location.origin}/company/{userProfile?.slug || 'your-company'}
                            </code>
                            <button
                              onClick={() => {
                                const link = `${window.location.origin}/company/${userProfile?.slug || 'your-company'}`;
                                navigator.clipboard.writeText(link);
                                alert('Link copied to clipboard!');
                              }}
                              className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="mb-4">
              <Mail className="h-16 w-16 text-yellow-500 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
            <p className="text-gray-600 mb-4">
              Thank you for registering with Suraj International. Your corporate account is currently under review 
              by our admin team. You will receive an email notification once your account has been approved.
            </p>
            <p className="text-sm text-gray-500">
              This process typically takes 1-2 business days.
            </p>
          </div>
        )}
      </div>

      {/* Product View Modal */}
      {showProductViewModal && selectedProductForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedProductForView.name}</h3>
                <button
                  onClick={() => {
                    setShowProductViewModal(false);
                    setSelectedProductForView(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Product Image */}
              <div className="mb-6">
                <img 
                  src={selectedProductForView.imageUrl} 
                  alt={selectedProductForView.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>

              {/* Product Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {selectedProductForView.description || 'No description available.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Points Required</h4>
                    <p className="text-2xl font-bold text-red-600">{selectedProductForView.pointCost}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Category</h4>
                    <p className="text-gray-600 capitalize">{selectedProductForView.category}</p>
                  </div>
                </div>

                {/* Available Sizes */}
                {selectedProductForView.sizes && selectedProductForView.sizes.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Available Sizes:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProductForView.sizes.map((size, index) => (
                        <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Colors */}
                {selectedProductForView.colors && selectedProductForView.colors.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Available Colors:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProductForView.colors.map((color, index) => (
                        <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowProductViewModal(false);
                      setSelectedProductForView(null);
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSelectFromView}
                    disabled={selectedProducts.includes(selectedProductForView.id)}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {selectedProducts.includes(selectedProductForView.id) ? 'Already Selected' : 'Select Product'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Ticket Details</h3>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <p className="text-sm text-gray-900">{selectedTicket.subject}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                    <p className="text-sm text-gray-900">{selectedTicket.employeeName}</p>
                    <p className="text-xs text-gray-500">{selectedTicket.employeeEmail}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedTicket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedTicket.priority === 'high' ? 'bg-red-100 text-red-800' :
                      selectedTicket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedTicket.status === 'open' ? 'bg-red-100 text-red-800' :
                      selectedTicket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Company Information Settings Component
function CompanyInfoSettings({ 
  corporateId, 
  userProfile, 
  onUpdate 
}: CorporateDashboardProps) {
  const [companyInfo, setCompanyInfo] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setCompanyInfo({
        companyName: userProfile.companyName || '',
        contactName: userProfile.contactName || '',
        email: userProfile.email || '',
        phone: userProfile.phone || ''
      });
    }
  }, [userProfile]);

  const handleSaveCompanyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newSlug = companyInfo.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      
      await updateDoc(doc(db, 'users', corporateId), {
        companyName: companyInfo.companyName,
        contactName: companyInfo.contactName,
        email: companyInfo.email,
        phone: companyInfo.phone,
        slug: newSlug,
        updatedAt: new Date().toISOString()
      });
      
      setEditing(false);
      alert('Company information updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating company information:', error);
      alert('Error updating company information: ' + (error as Error).message);
    }
    
    setLoading(false);
  };

  const handleCancel = () => {
    setCompanyInfo({
      companyName: userProfile?.companyName || '',
      contactName: userProfile?.contactName || '',
      email: userProfile?.email || '',
      phone: userProfile?.phone || ''
    });
    setEditing(false);
  };

  return (
    <div>
      {editing ? (
        <form onSubmit={handleSaveCompanyInfo}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyInfo.companyName}
                onChange={(e) => setCompanyInfo({...companyInfo, companyName: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={companyInfo.contactName}
                onChange={(e) => setCompanyInfo({...companyInfo, contactName: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-700">
                {companyInfo.companyName || 'Not set'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-700">
                {companyInfo.contactName || 'Not set'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-700">
                {companyInfo.email || 'Not set'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-700">
                {companyInfo.phone || 'Not set'}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Information</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Branding Settings Component
function BrandingSettings({ corporateId, onUpdate }: { corporateId: string, onUpdate: () => void }) {
  const [branding, setBranding] = useState({
    logo: '',
    banner: '',
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    greeting: '',
    festivalGreeting: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBranding();
  }, [corporateId]);

  const loadBranding = async () => {
    try {
      const settingsQuery = query(
        collection(db, 'corporateSettings'),
        where('corporateId', '==', corporateId)
      );
      const settingsSnapshot = await getDocs(settingsQuery);
      
      if (!settingsSnapshot.empty) {
        const settings = settingsSnapshot.docs[0].data();
        if (settings.branding) {
          setBranding({
            logo: settings.branding.logo || '',
            banner: settings.branding.banner || '',
            primaryColor: settings.branding.primaryColor || '#2563eb',
            secondaryColor: settings.branding.secondaryColor || '#1d4ed8',
            greeting: settings.branding.greeting || '',
            festivalGreeting: settings.branding.festivalGreeting || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const settingsQuery = query(
        collection(db, 'corporateSettings'),
        where('corporateId', '==', corporateId)
      );
      const settingsSnapshot = await getDocs(settingsQuery);
      
      if (settingsSnapshot.empty) {
        await addDoc(collection(db, 'corporateSettings'), {
          corporateId,
          branding,
          updatedAt: new Date().toISOString()
        });
      } else {
        await updateDoc(settingsSnapshot.docs[0].ref, {
          branding,
          updatedAt: new Date().toISOString()
        });
      }
      
      alert('Branding settings saved successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error saving branding:', error);
      alert('Error saving branding settings.');
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSaveBranding} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company Logo URL
        </label>
        <input
          type="url"
          value={branding.logo}
          onChange={(e) => setBranding({...branding, logo: e.target.value})}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder="https://example.com/logo.png"
        />
        {branding.logo && (
          <div className="mt-2">
            <img src={branding.logo} alt="Logo preview" className="h-12 w-12 object-contain" />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company Banner URL
        </label>
        <input
          type="url"
          value={branding.banner}
          onChange={(e) => setBranding({...branding, banner: e.target.value})}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder="https://example.com/banner.jpg"
        />
        {branding.banner && (
          <div className="mt-2">
            <img src={branding.banner} alt="Banner preview" className="w-full h-32 object-cover rounded" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Primary Color
          </label>
          <input
            type="color"
            value={branding.primaryColor}
            onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
            className="w-full h-10 border border-gray-300 rounded-md"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Custom Greeting
        </label>
        <input
          type="text"
          value={branding.greeting}
          onChange={(e) => setBranding({...branding, greeting: e.target.value})}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder="Welcome to our Employee Portal"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Festival Greeting
        </label>
        <input
          type="text"
          value={branding.festivalGreeting}
          onChange={(e) => setBranding({...branding, festivalGreeting: e.target.value})}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder="Happy Holidays from our team!"
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Save Branding Settings'}
      </button>
    </form>
  );
}

// Point Transaction History Component
function PointTransactionHistory({ corporateId }: { corporateId: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [corporateId]);

  const loadTransactions = async () => {
    try {
      const transactionsQuery = query(
        collection(db, 'pointTransactions'),
        where('toId', '==', corporateId)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Also get transactions from corporate to employees
      const corporateTransactionsQuery = query(
        collection(db, 'pointTransactions'),
        where('fromId', '==', corporateId)
      );
      const corporateTransactionsSnapshot = await getDocs(corporateTransactionsQuery);
      const corporateTransactionsData = corporateTransactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const allTransactions = [...transactionsData, ...corporateTransactionsData]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setTransactions(allTransactions);
      setLoading(false);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading transactions...</div>;
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium">Point Transaction History</h3>
      </div>
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {transactions.length > 0 ? (
          transactions.map(transaction => (
            <div key={transaction.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {transaction.type === 'admin_allocation' ? 'Points Received from Admin' : 
                   transaction.type === 'corporate_to_employee' ? 'Points Distributed to Employee' :
                   'Point Transaction'}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(transaction.createdAt).toLocaleDateString()} at {new Date(transaction.createdAt).toLocaleTimeString()}
                </p>
                {transaction.reason && (
                  <p className="text-sm text-gray-600 mt-1">{transaction.reason}</p>
                )}
              </div>
              <div className="text-right">
                <span className={`font-medium ${
                  transaction.type === 'admin_allocation' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'admin_allocation' ? '+' : '-'}{Math.abs(transaction.points)} points
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No point transactions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}