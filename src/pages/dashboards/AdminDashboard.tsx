import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Package, TrendingUp, DollarSign, Building2, UserCheck, AlertTriangle, Eye, Edit, Trash2, MessageSquare,
  BarChart,
  Truck,
  Plus,
  Check,
  X,
  Minus,
  Download,
  RefreshCw,
  Upload
 } from 'lucide-react';
import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDoc,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { exportOrdersToCSV, formatDateForFilename } from '../../utils/csvExport';
import { CorporateProductCustomization } from '../../components/CorporateProductCustomization';

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  pointCost: number;
  stock: number;
  category: string;
  imageUrl: string;
  status: 'active' | 'inactive';
}

interface Order {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  corporateId: string;
  corporateName: string;
  shippingAddress: any;
  products: any[];
  totalPoints: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  createdAt: string;
  trackingNumber?: string;
  statusCheckCount?: number;
  trackingCompleted?: boolean;
}

interface Corporate {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  totalPoints?: number;
  usedPoints?: number;
  createdAt: string;
}

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
  submittedAt: string;
  status: 'new' | 'read' | 'responded';
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  corporateId: string;
  corporateName: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  responses: Array<{
    message: string;
    author: string;
    authorType: 'employee' | 'corporate' | 'admin';
    timestamp: string;
  }>;
}

export function AdminDashboard() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [corporates, setCorporates] = useState<Corporate[]>([]);
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCorporateOrders, setSelectedCorporateOrders] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketResponse, setTicketResponse] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [respondingToTicket, setRespondingToTicket] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [showBulkTrackingModal, setShowBulkTrackingModal] = useState(false);
  const [bulkTrackingFile, setBulkTrackingFile] = useState<File | null>(null);
  const [bulkTrackingResults, setBulkTrackingResults] = useState<any>(null);
  const [processingBulkTracking, setProcessingBulkTracking] = useState(false);

  // Search and filter states
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [corporateSearch, setCorporateSearch] = useState('');
  const [corporateStatusFilter, setCorporateStatusFilter] = useState('all');
  const [contactStatusFilter, setContactStatusFilter] = useState('all');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState('all');
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [employeeProfiles, setEmployeeProfiles] = useState<any[]>([]);

  // Point allocation state
  const [pointAllocationForm, setPointAllocationForm] = useState({
    corporateId: '',
    points: 0,
    reason: '',
    operation: 'add' as 'add' | 'subtract'
  });
  const [showPointModal, setShowPointModal] = useState(false);

  // Product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    description: '',
    pointCost: 0,
    stock: 0,
    category: '',
    imageUrl: '',
    weight: '',
    sizes: [] as string[],
    colors: [] as string[]
  });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [customSize, setCustomSize] = useState('');
  const [customColor, setCustomColor] = useState('');

  // Standard sizes and colors
  const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
  const standardColors = ['Red', 'Blue', 'Green', 'Black', 'White', 'Gray', 'Navy', 'Brown', 'Pink', 'Purple', 'Orange', 'Yellow'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setTicketsLoading(true);
      setTicketsError(null);
      
      // Load products
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(productsData);

      // Load orders
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      setOrders(ordersData);

      // Load corporates
      const corporatesSnapshot = await getDocs(collection(db, 'users'));
      const corporatesData = corporatesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => user.role === 'corporate')
        .map(corporate => ({
          ...corporate,
          totalPoints: corporate.totalPoints || 0,
          usedPoints: corporate.usedPoints || 0
        })) as Corporate[];
      setCorporates(corporatesData);

      // Load contact submissions
      const contactSnapshot = await getDocs(collection(db, 'contactSubmissions'));
      const contactData = contactSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ContactSubmission));
      setContactSubmissions(contactData);

      // Load tickets
      console.log('Loading tickets from Firebase...');
      const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
      console.log('Tickets snapshot size:', ticketsSnapshot.size);
      const ticketsData = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Ticket));
      console.log('Loaded tickets:', ticketsData);
      setTickets(ticketsData);

      // Load employee profiles
      fetchEmployeeProfiles();

      setLoading(false);
      setTicketsLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setTicketsError('Failed to load tickets');
      setLoading(false);
      setTicketsLoading(false);
    }
  };

  const fetchEmployeeProfiles = async () => {
    try {
      const employeesQuery = query(
        collection(db, 'users'),
        where('role', '==', 'employee')
      );
      const employeesSnapshot = await getDocs(employeesQuery);
      const profiles = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmployeeProfiles(profiles);
    } catch (error) {
      console.error('Error fetching employee profiles:', error);
    }
  };

  const toggleSize = (size: string) => {
    setNewProduct(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  const addCustomSize = () => {
    if (customSize.trim() && !newProduct.sizes.includes(customSize.trim())) {
      setNewProduct(prev => ({
        ...prev,
        sizes: [...prev.sizes, customSize.trim()]
      }));
      setCustomSize('');
    }
  };

  const removeSize = (size: string) => {
    setNewProduct(prev => ({
      ...prev,
      sizes: prev.sizes.filter(s => s !== size)
    }));
  };

  const toggleColor = (color: string) => {
    setNewProduct(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  const addCustomColor = () => {
    if (customColor.trim() && !newProduct.colors.includes(customColor.trim())) {
      setNewProduct(prev => ({
        ...prev,
        colors: [...prev.colors, customColor.trim()]
      }));
      setCustomColor('');
    }
  };

  const removeColor = (color: string) => {
    setNewProduct(prev => ({
      ...prev,
      colors: prev.colors.filter(c => c !== color)
    }));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProduct.name || !newProduct.sku || newProduct.pointCost <= 0) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      // Check if SKU already exists
      const skuQuery = query(
        collection(db, 'products'),
        where('sku', '==', newProduct.sku)
      );
      const skuSnapshot = await getDocs(skuQuery);
      
      if (!skuSnapshot.empty) {
        alert('SKU already exists. Please use a unique SKU.');
        return;
      }
      
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
      
      setNewProduct({
        name: '',
        sku: '',
        description: '',
        pointCost: 0,
        stock: 0,
        category: '',
        imageUrl: '',
        weight: '',
        sizes: [],
        colors: []
      });
      setCustomSize('');
      setCustomColor('');
      
      loadData();
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleUpdateProduct = async (productId: string) => {
    try {
      await updateDoc(doc(db, 'products', productId), newProduct);
      setEditingProduct(null);
      setNewProduct({
        name: '',
        sku: '',
        description: '',
        pointCost: 0,
        stock: 0,
        category: '',
        imageUrl: '',
        weight: '',
        sizes: [],
        colors: []
      });
      setCustomSize('');
      setCustomColor('');
      loadData();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        loadData();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleApproveCorporate = async (corporateId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'users', corporateId), { status });
      loadData();
    } catch (error) {
      console.error('Error updating corporate status:', error);
    }
  };

  const handleDeleteCorporate = async (corporateId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this corporate account? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete the corporate document
      await deleteDoc(doc(db, 'users', corporateId));
      
      // Refresh the corporates list
      loadData();
      
      alert('Corporate account deleted successfully');
    } catch (error) {
      console.error('Error deleting corporate:', error);
      alert('Failed to delete corporate account');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      loadData();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleAllocatePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const corporateRef = doc(db, 'users', pointAllocationForm.corporateId);
      const corporateDoc = await getDoc(corporateRef);
      
      if (corporateDoc.exists()) {
        const currentData = corporateDoc.data();
        const currentPoints = currentData.totalPoints || 0;
        const pointsChange = pointAllocationForm.operation === 'add' 
          ? pointAllocationForm.points 
          : -pointAllocationForm.points;
        const newTotal = currentPoints + pointsChange;
        
        // Prevent negative points
        if (newTotal < 0) {
          alert('Cannot subtract more points than available. Current balance: ' + currentPoints);
          return;
        }
        
        await updateDoc(corporateRef, {
          totalPoints: newTotal,
          updatedAt: new Date().toISOString()
        });
        
        // Log the point allocation
        await addDoc(collection(db, 'pointTransactions'), {
          type: pointAllocationForm.operation === 'add' ? 'admin_allocation' : 'admin_deduction',
          fromId: 'admin',
          toId: pointAllocationForm.corporateId,
          points: pointsChange,
          reason: pointAllocationForm.reason,
          createdAt: new Date().toISOString()
        });
        
        setPointAllocationForm({ corporateId: '', points: 0, reason: '', operation: 'add' });
        setShowPointModal(false);
        loadData();
        alert(`Points ${pointAllocationForm.operation === 'add' ? 'allocated' : 'deducted'} successfully!`);
      }
    } catch (error) {
      console.error('Error allocating points:', error);
      alert('Error allocating points');
    }
  };

  const handleUpdateContactStatus = async (submissionId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'contactSubmissions', submissionId), { status });
      loadData();
    } catch (error) {
      console.error('Error updating contact status:', error);
    }
  };

  const handleTicketStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      loadData();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert('Failed to update ticket status');
    }
  };

  const handleTicketResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTicket || !ticketResponse.trim()) return;
    
    try {
      setRespondingToTicket(true);
      
      const updatedResponses = [
        ...selectedTicket.responses,
        {
          message: ticketResponse,
          author: userProfile?.contactName || 'Admin',
          authorType: 'admin' as const,
          timestamp: new Date().toISOString()
        }
      ];
      
      const updateData: any = {
        responses: updatedResponses,
        updatedAt: new Date().toISOString()
      };
      
      if (ticketStatus) {
        updateData.status = ticketStatus;
      }
      
      await updateDoc(doc(db, 'tickets', selectedTicket.id), updateData);
      
      setTicketResponse('');
      setTicketStatus('');
      setSelectedTicket(null);
      loadData();
      
    } catch (error) {
      console.error('Error responding to ticket:', error);
      alert('Failed to send response');
    } finally {
      setRespondingToTicket(false);
    }
  };

  const handleAddTracking = async () => {
    if (!selectedOrderDetails || !trackingNumber.trim()) return;
    
    try {
      await updateDoc(doc(db, 'orders', selectedOrderDetails.id), {
        trackingNumber: trackingNumber.trim(),
        status: 'shipped',
        updatedAt: new Date().toISOString()
      });
      
      // Start tracking this order
      await startTrackingOrder(selectedOrderDetails.id, trackingNumber.trim());
      
      setShowTrackingModal(false);
      setTrackingNumber('');
      loadData();
      alert('Tracking number added successfully!');
    } catch (error) {
      console.error('Error adding tracking number:', error);
      alert('Failed to add tracking number');
    }
  };

  const startTrackingOrder = async (orderId: string, trackingNum: string) => {
    try {
      // Create a tracking record
      await updateDoc(doc(db, 'orders', orderId), {
        trackingStarted: true,
        lastStatusCheck: new Date().toISOString(),
        statusCheckCount: 0
      });
      
      // Start the tracking process
      await scrapeDeliveryStatus(orderId, trackingNum);
    } catch (error) {
      console.error('Error starting tracking:', error);
    }
  };

  const scrapeDeliveryStatus = async (orderId: string, trackingNum: string) => {
    try {
      const response = await fetch(`https://shiprocket.co/tracking/${trackingNum}`);
      const html = await response.text();
      
      // Simple status extraction (you might need to adjust based on actual HTML structure)
      let status = 'shipped';
      if (html.includes('delivered') || html.includes('Delivered')) {
        status = 'delivered';
      } else if (html.includes('out for delivery') || html.includes('Out for Delivery')) {
        status = 'out_for_delivery';
      } else if (html.includes('in transit') || html.includes('In Transit')) {
        status = 'in_transit';
      }
      
      // Update order status
      const orderRef = doc(db, 'orders', orderId);
      const updateData: any = {
        status,
        lastStatusCheck: new Date().toISOString(),
        statusCheckCount: (orders.find(o => o.id === orderId)?.statusCheckCount || 0) + 1
      };
      
      if (status === 'delivered') {
        updateData.deliveredAt = new Date().toISOString();
        updateData.trackingCompleted = true;
      }
      
      await updateDoc(orderRef, updateData);
      
      // If not delivered and less than 3 checks, schedule next check
      if (status !== 'delivered' && updateData.statusCheckCount < 3) {
        setTimeout(() => {
          scrapeDeliveryStatus(orderId, trackingNum);
        }, 4 * 60 * 60 * 1000); // 4 hours
      }
      
    } catch (error) {
      console.error('Error scraping delivery status:', error);
    }
  };

  const refreshAllOrderStatuses = async () => {
    setIsRefreshingStatus(true);
    try {
      const undeliveredOrders = orders.filter(order => 
        order.trackingNumber && 
        order.status !== 'delivered' && 
        !order.trackingCompleted
      );
      
      for (const order of undeliveredOrders) {
        await scrapeDeliveryStatus(order.id, order.trackingNumber);
        // Add small delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Refresh the orders list
      await loadData();
      alert(`Refreshed status for ${undeliveredOrders.length} orders`);
    } catch (error) {
      console.error('Error refreshing statuses:', error);
      alert('Failed to refresh order statuses');
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const downloadOrdersCSV = async () => {
    // Determine which data to export based on active filters
    const hasActiveFilters = orderSearch || (orderStatusFilter && orderStatusFilter !== 'all');
    const dataToExport = hasActiveFilters ? filteredOrders : orders;
    
    if (!dataToExport || dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      // Transform the data to match CSV format with employee profile data
      const csvData = dataToExport.map(order => {
        // Find employee profile by email
        const employeeProfile = employeeProfiles.find(emp => emp.email === order.employeeEmail);
        
        return {
          id: order.id,
          employeeName: employeeProfile?.name || order.employeeName || 'N/A',
          employeeEmail: order.employeeEmail || 'N/A',
          employeePhone: employeeProfile?.phone || order.shippingAddress?.phone || 'N/A',
          corporateName: order.corporateName || 'N/A',
          productName: order.products && order.products.length > 0 ? order.products[0].name : 'N/A',
          productSKU: order.products && order.products.length > 0 ? order.products[0].sku || 'N/A' : 'N/A',
          productWeight: order.products && order.products.length > 0 ? order.products[0].weight || 'N/A' : 'N/A',
          productSize: order.products && order.products.length > 0 ? order.products[0].size || 'N/A' : 'N/A',
          productColor: order.products && order.products.length > 0 ? order.products[0].color || 'N/A' : 'N/A',
          pointsUsed: order.totalPoints || 0,
          status: order.status,
          orderDate: order.createdAt ? order.createdAt.split('T')[0] : 'N/A',
          shippingAddress: order.shippingAddress ? 
            `${order.shippingAddress.addressLine1 || ''} ${order.shippingAddress.addressLine2 || ''} ${order.shippingAddress.city || ''} ${order.shippingAddress.state || ''} ${order.shippingAddress.zipCode || ''}`.trim() : 'N/A',
          trackingNumber: order.trackingNumber || ''
        };
      });

      const filename = hasActiveFilters 
        ? `admin-orders-filtered-${formatDateForFilename(new Date())}.csv`
        : `admin-orders-${formatDateForFilename(new Date())}.csv`;
      
      exportOrdersToCSV(csvData, filename);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const handleBulkTrackingImport = async () => {
    if (!bulkTrackingFile) return;

    setProcessingBulkTracking(true);
    const results = {
      total: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      const csvText = await bulkTrackingFile.text();
      const lines = csvText.split('\n').filter(line => line.trim());
      const hasHeader = lines[0].toLowerCase().includes('order') || lines[0].toLowerCase().includes('tracking');
      const dataLines = hasHeader ? lines.slice(1) : lines;
      
      let totalProcessed = 0;
      let successCount = 0;
      let failedUpdates: string[] = [];
      
      // First, get all existing orders to validate IDs
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const existingOrderIds = new Set();
      ordersSnapshot.forEach(doc => {
        existingOrderIds.add(doc.id);
      });

      // Process in batches of 500 (Firestore limit)
      const batchSize = 500;
      for (let i = 0; i < dataLines.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchLines = dataLines.slice(i, i + batchSize);
        
        for (const line of batchLines) {
          const [orderId, trackingNumber] = line.split(',').map(item => item.trim());
          
          if (orderId && trackingNumber) {
            // Check if order exists before trying to update
            if (!existingOrderIds.has(orderId)) {
              failedUpdates.push(`Order ID ${orderId} not found in database`);
              totalProcessed++;
              continue;
            }

            const orderRef = doc(db, 'orders', orderId);
            batch.update(orderRef, {
              trackingNumber: trackingNumber,
              status: 'shipped',
              updatedAt: new Date().toISOString()
            });
            totalProcessed++;
          }
        }
        
        try {
          await batch.commit();
          successCount += batchLines.filter(line => {
            const [orderId, trackingNumber] = line.split(',').map(item => item.trim());
            return orderId && trackingNumber && existingOrderIds.has(orderId);
          }).length;
        } catch (error: any) {
          console.error('Batch commit error:', error);
          batchLines.forEach(line => {
            const [orderId] = line.split(',').map(item => item.trim());
            if (orderId) {
              failedUpdates.push(`${orderId}: ${error.message}`);
            }
          });
        }
      }

      setBulkTrackingResults({
        total: totalProcessed,
        updated: successCount,
        failed: totalProcessed - successCount,
        errors: failedUpdates
      });
      
      // Refresh orders if any were updated
      if (successCount > 0) {
        loadData();
      }
    } catch (error) {
      console.error('Error processing bulk tracking:', error);
      results.errors.push(`File processing error: ${error}`);
      setBulkTrackingResults(results);
    }

    setProcessingBulkTracking(false);
  };

  const resetBulkTrackingModal = () => {
    setShowBulkTrackingModal(false);
    setBulkTrackingFile(null);
    setBulkTrackingResults(null);
    setProcessingBulkTracking(false);
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-red-600 bg-red-100';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Filter functions
  const filteredOrders = orders.filter(order => {
    const matchesSearch = orderSearch === '' || 
      order.employeeName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.employeeEmail.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.corporateName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.id.toLowerCase().includes(orderSearch.toLowerCase());
    
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredCorporates = corporates.filter(corporate => {
    const matchesStatus = corporateStatusFilter === 'all' || corporate.status === corporateStatusFilter;
    const matchesSearch = corporateSearch === '' ||
      corporate.companyName.toLowerCase().includes(corporateSearch.toLowerCase()) ||
      corporate.contactName.toLowerCase().includes(corporateSearch.toLowerCase()) ||
      corporate.email.toLowerCase().includes(corporateSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredContactSubmissions = contactSubmissions.filter(submission => {
    return contactStatusFilter === 'all' || submission.status === contactStatusFilter;
  });

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = ticketStatusFilter === 'all' || ticket.status === ticketStatusFilter;
    const matchesPriority = ticketPriorityFilter === 'all' || ticket.priority === ticketPriorityFilter;
    return matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const stats = {
    totalOrders: orders.length,
    totalCorporates: corporates.filter(c => c.status === 'approved').length,
    totalProducts: products.length,
    pendingApprovals: corporates.filter(c => c.status === 'pending').length,
    newContactSubmissions: contactSubmissions.filter(c => c.status === 'new').length,
    openTickets: tickets.filter(t => t.status === 'open').length,
    urgentTickets: tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back, {userProfile?.contactName || 'Admin'}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Corporates</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalCorporates}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalProducts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.openTickets}</p>
                {stats.urgentTickets > 0 && (
                  <p className="text-xs text-red-600 font-medium">{stats.urgentTickets} urgent</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Urgent Tickets Alert */}
        {stats.urgentTickets > 0 && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-8">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="text-red-800 font-medium">
                {stats.urgentTickets} urgent ticket{stats.urgentTickets > 1 ? 's' : ''} require{stats.urgentTickets === 1 ? 's' : ''} immediate attention
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('tickets')}
              className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
            >
              View urgent tickets →
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex flex-wrap">
              {['overview', 'products', 'orders', 'corporates', 'points', 'customization', 'messages', 'tickets'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-4 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'tickets' && (
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Support Tickets ({tickets.length})</span>
                      {stats.openTickets > 0 && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          {stats.openTickets}
                        </span>
                      )}
                      {stats.urgentTickets > 0 && (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  )}
                  {tab !== 'tickets' && tab}
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
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Recent Messages</h3>
                    <div className="space-y-2">
                      {contactSubmissions
                        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                        .slice(0, 5)
                        .map(submission => (
                        <div key={submission.id} className={`flex justify-between items-center p-3 rounded-lg ${
                          submission.status === 'new' ? 'bg-red-50' : 'bg-gray-50'
                        }`}>
                          <div>
                            <p className="font-medium">{submission.name}</p>
                            <p className="text-sm text-gray-600">{submission.subject}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            submission.status === 'new' ? 'bg-red-100 text-red-800' :
                            submission.status === 'read' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {submission.status}
                          </span>
                        </div>
                      ))}
                      {contactSubmissions.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          <p className="text-sm">No messages yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Product Management</h2>
                </div>

                {/* Add Product Form */}
                <div className="bg-gray-50 p-6 rounded-lg mb-8">
                  <h3 className="text-lg font-medium mb-4">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  <form onSubmit={editingProduct ? (e) => {
                    e.preventDefault();
                    handleUpdateProduct(editingProduct);
                  } : handleAddProduct}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter product name"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SKU *
                        </label>
                        <input
                          type="text"
                          value={newProduct.sku}
                          onChange={(e) => setNewProduct({...newProduct, sku: e.target.value.toUpperCase()})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter unique SKU (e.g., MUG-001)"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Point Cost *
                        </label>
                        <input
                          type="number"
                          value={newProduct.pointCost}
                          onChange={(e) => setNewProduct({...newProduct, pointCost: parseInt(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter point cost"
                          min="1"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stock Quantity
                        </label>
                        <input
                          type="number"
                          value={newProduct.stock}
                          onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter stock quantity"
                          min="0"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <input
                          type="text"
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter category"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Image URL
                        </label>
                        <input
                          type="url"
                          value={newProduct.imageUrl}
                          onChange={(e) => setNewProduct({...newProduct, imageUrl: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter image URL"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Weight (optional)
                        </label>
                        <input
                          type="text"
                          value={newProduct.weight}
                          onChange={(e) => setNewProduct({...newProduct, weight: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="e.g., 250g, 1.5kg, 2 lbs"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Sizes (for clothing)
                        </label>
                        
                        {/* Standard Sizes */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-2">Standard sizes:</p>
                          <div className="flex flex-wrap gap-2">
                            {standardSizes.map(size => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => toggleSize(size)}
                                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                                  newProduct.sizes.includes(size)
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Size Input */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-2">Add custom size:</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customSize}
                              onChange={(e) => setCustomSize(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSize())}
                              className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              placeholder="e.g., 32, 34, One Size"
                            />
                            <button
                              type="button"
                              onClick={addCustomSize}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Selected Sizes */}
                        {newProduct.sizes.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Selected sizes:</p>
                            <div className="flex flex-wrap gap-2">
                              {newProduct.sizes.map(size => (
                                <span
                                  key={size}
                                  className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-sm rounded-md"
                                >
                                  {size}
                                  <button
                                    type="button"
                                    onClick={() => removeSize(size)}
                                    className="ml-1 text-red-600 hover:text-red-800"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Colors
                        </label>
                        
                        {/* Standard Colors */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-2">Standard colors:</p>
                          <div className="flex flex-wrap gap-2">
                            {standardColors.map(color => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => toggleColor(color)}
                                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                                  newProduct.colors.includes(color)
                                    ? 'bg-green-600 text-white border-green-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {color}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Color Input */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-2">Add custom color:</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customColor}
                              onChange={(e) => setCustomColor(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomColor())}
                              className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              placeholder="e.g., Maroon, Teal, Gold"
                            />
                            <button
                              type="button"
                              onClick={addCustomColor}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Selected Colors */}
                        {newProduct.colors.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Selected colors:</p>
                            <div className="flex flex-wrap gap-2">
                              {newProduct.colors.map(color => (
                                <span
                                  key={color}
                                  className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-sm rounded-md"
                                >
                                  {color}
                                  <button
                                    type="button"
                                    onClick={() => removeColor(color)}
                                    className="ml-1 text-green-600 hover:text-green-800"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={newProduct.description}
                          onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          rows={3}
                          placeholder="Enter product description"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6 flex space-x-4">
                      <button
                        type="submit"
                        className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
                      >
                        {editingProduct ? 'Update Product' : 'Add Product'}
                      </button>
                      {editingProduct && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(null);
                            setNewProduct({
                              name: '',
                              sku: '',
                              description: '',
                              pointCost: 0,
                              stock: 0,
                              category: '',
                              imageUrl: '',
                              weight: '',
                              sizes: [],
                              colors: []
                            });
                            setCustomSize('');
                            setCustomColor('');
                          }}
                          className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            SKU
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Weight
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sizes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Colors
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Points
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {products.map(product => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name}
                                  className="h-10 w-10 rounded-lg object-cover mr-4"
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-500">{product.category}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.sku}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.weight || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.sizes && product.sizes.length > 0 ? (
                                <div>
                                  {product.sizes.slice(0, 3).join(', ')}
                                  {product.sizes.length > 3 && (
                                    <span className="text-gray-500"> +{product.sizes.length - 3} more</span>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.colors && product.colors.length > 0 ? (
                                <div>
                                  {product.colors.slice(0, 3).join(', ')}
                                  {product.colors.length > 3 && (
                                    <span className="text-gray-500"> +{product.colors.length - 3} more</span>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.pointCost}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${product.stock < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                                {product.stock}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {product.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button
                                onClick={() => {
                                  setEditingProduct(product.id);
                                  setNewProduct({
                                    name: product.name,
                                    sku: product.sku,
                                    description: product.description,
                                    pointCost: product.pointCost,
                                    stock: product.stock,
                                    category: product.category,
                                    imageUrl: product.imageUrl,
                                    weight: product.weight || '',
                                    sizes: product.sizes || [],
                                    colors: product.colors || []
                                  });
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold mb-6">Order Management</h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={downloadOrdersCSV}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download CSV</span>
                    </button>
                    <button
                      onClick={() => setShowBulkTrackingModal(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import Tracking
                    </button>
                    <button
                      onClick={refreshAllOrderStatuses}
                      disabled={isRefreshingStatus}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingStatus ? 'animate-spin' : ''}`} />
                      {isRefreshingStatus ? 'Refreshing...' : 'Refresh Status'}
                    </button>
                  </div>
                </div>
                
                {/* Search and Filter Controls */}
                {!selectedOrderDetails && !selectedCorporateOrders && (
                  <div className="bg-white p-4 rounded-lg border mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Search Orders
                        </label>
                        <input
                          type="text"
                          placeholder="Search by employee, company, or order ID..."
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Filter by Status
                        </label>
                        <select
                          value={orderStatusFilter}
                          onChange={(e) => setOrderStatusFilter(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <div className="text-sm text-gray-600">
                          Showing {filteredOrders.length} of {orders.length} orders
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedOrderDetails ? (
                  <OrderDetailsView 
                    order={selectedOrderDetails} 
                    onBack={() => setSelectedOrderDetails(null)}
                    onUpdateStatus={handleUpdateOrderStatus}
                  />
                ) : selectedCorporateOrders ? (
                  <CorporateOrdersView 
                    corporateId={selectedCorporateOrders}
                    orders={filteredOrders.filter(order => order.corporateId === selectedCorporateOrders)}
                    onBack={() => setSelectedCorporateOrders(null)}
                    onViewOrder={setSelectedOrderDetails}
                    onUpdateStatus={handleUpdateOrderStatus}
                  />
                ) : (
                  <div className="bg-white rounded-lg border overflow-hidden">
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
                              Company
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              SKU
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Points
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tracking
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
                          {filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                #{order.id.slice(-8)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{order.employeeName}</div>
                                <div className="text-sm text-gray-500">{order.employeeEmail}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {order.corporateName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {order.products && order.products.length > 0 ? (
                                    <div>
                                      <div>{order.products[0].name}</div>
                                      <div className="text-xs text-gray-500">SKU: {order.products[0].sku || 'N/A'}</div>
                                    </div>
                                  ) : 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {order.products && order.products.length > 0 ? order.products[0].sku || 'N/A' : 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{order.totalPoints || 0}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {order.trackingNumber || 'Not assigned'}
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button
                                  onClick={() => setSelectedOrderDetails(order)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedOrderDetails(order);
                                    setShowTrackingModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <Truck className="h-4 w-4" />
                                </button>
                                <select
                                  value={order.status}
                                  onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="processing">Processing</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'corporates' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Corporate Management</h2>
                
                {/* Filter Controls */}
                <div className="bg-white p-4 rounded-lg border mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Corporates
                      </label>
                      <input
                        type="text"
                        placeholder="Search by company, contact, or email..."
                        value={corporateSearch}
                        onChange={(e) => setCorporateSearch(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filter by Status
                      </label>
                      <select
                        value={corporateStatusFilter}
                        onChange={(e) => setCorporateStatusFilter(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600">
                        Showing {filteredCorporates.length} of {corporates.length} corporates
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCorporates.map(corporate => (
                        <tr key={corporate.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {corporate.companyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {corporate.contactName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {corporate.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              corporate.status === 'approved' ? 'bg-green-100 text-green-800' :
                              corporate.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {corporate.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              <div>Total: {corporate.totalPoints || 0}</div>
                              <div className="text-xs text-gray-400">
                                Used: {corporate.usedPoints || 0}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {corporate.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveCorporate(corporate.id, 'approved')}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleApproveCorporate(corporate.id, 'rejected')}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCorporate(corporate.id)}
                                  className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors text-sm"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                            {corporate.status === 'approved' && (
                              <>
                                <button
                                  onClick={() => handleApproveCorporate(corporate.id, 'rejected')}
                                  className="text-red-600 hover:text-red-900"
                                  title="Disapprove"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCorporate(corporate.id)}
                                  className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors text-sm"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                            {corporate.status === 'rejected' && (
                              <button
                                onClick={() => handleApproveCorporate(corporate.id, 'approved')}
                                className="text-green-600 hover:text-green-900"
                                title="Re-approve"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                            {corporate.status === 'approved' && (
                              <>
                              <button
                                onClick={() => {
                                  setPointAllocationForm({
                                    corporateId: corporate.id,
                                    points: 0,
                                    reason: '',
                                    operation: 'add'
                                  });
                                  setShowPointModal(true);
                                }}
                                className="text-red-600 hover:text-red-900 ml-2"
                                title="Allocate Points"
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setPointAllocationForm({
                                    corporateId: corporate.id,
                                    points: 0,
                                    reason: '',
                                    operation: 'subtract'
                                  });
                                  setShowPointModal(true);
                                }}
                                className="text-red-600 hover:text-red-900 ml-2"
                                title="Deduct Points"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'points' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Point Management</h2>
                  <button
                    onClick={() => setShowPointModal(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Allocate Points</span>
                  </button>
                </div>

                {/* Points Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg border">
                    <h3 className="text-lg font-medium mb-2">Total Points Allocated</h3>
                    <p className="text-3xl font-bold text-red-600">
                      {corporates.reduce((sum, corp) => sum + (corp.totalPoints || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg border">
                    <h3 className="text-lg font-medium mb-2">Points Used</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {corporates.reduce((sum, corp) => sum + (corp.usedPoints || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg border">
                    <h3 className="text-lg font-medium mb-2">Points Available</h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {corporates.reduce((sum, corp) => sum + ((corp.totalPoints || 0) - (corp.usedPoints || 0)), 0)}
                    </p>
                  </div>
                </div>

                {/* Corporate Points Table */}
                <div className="bg-white rounded-lg border">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium">Corporate Point Balances</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Company
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Points
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Used Points
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Available Points
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {corporates.filter(corp => corp.status === 'approved').map(corporate => (
                          <tr key={corporate.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{corporate.companyName}</div>
                                <div className="text-sm text-gray-500">{corporate.contactName}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {corporate.totalPoints || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {corporate.usedPoints || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`font-medium ${
                                ((corporate.totalPoints || 0) - (corporate.usedPoints || 0)) > 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {(corporate.totalPoints || 0) - (corporate.usedPoints || 0)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setPointAllocationForm({
                                      corporateId: corporate.id,
                                      points: 0,
                                      reason: '',
                                      operation: 'add'
                                    });
                                    setShowPointModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Allocate Points
                                </button>
                                <button
                                  onClick={() => {
                                    setPointAllocationForm({
                                      corporateId: corporate.id,
                                      points: 0,
                                      reason: '',
                                      operation: 'subtract'
                                    });
                                    setShowPointModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-900 ml-4"
                                >
                                  Deduct Points
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Contact Messages</h2>
                
                {/* Filter Controls */}
                <div className="bg-white p-4 rounded-lg border mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filter by Status
                      </label>
                      <select
                        value={contactStatusFilter}
                        onChange={(e) => setContactStatusFilter(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="new">New</option>
                        <option value="read">Read</option>
                        <option value="responded">Responded</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600">
                        Showing {filteredContactSubmissions.length} of {contactSubmissions.length} messages
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredContactSubmissions
                        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                        .map(submission => (
                        <tr key={submission.id} className={submission.status === 'new' ? 'bg-red-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {submission.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {submission.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {submission.company || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              <div className="font-medium">{submission.subject}</div>
                              <div className="text-xs text-gray-400 truncate max-w-xs">
                                {submission.message}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(submission.submittedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              submission.status === 'new' ? 'bg-red-100 text-red-800' :
                              submission.status === 'read' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {submission.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <select
                              value={submission.status}
                              onChange={(e) => handleUpdateContactStatus(submission.id, e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                              <option value="new">New</option>
                              <option value="read">Read</option>
                              <option value="responded">Responded</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filteredContactSubmissions.length === 0 && contactSubmissions.length > 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No messages match your filter</h3>
                    <p className="text-gray-600">Try adjusting your filter settings.</p>
                    <button
                      onClick={() => setContactStatusFilter('all')}
                      className="mt-4 text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
                
                {contactSubmissions.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                    <p className="text-gray-600">Contact form submissions will appear here.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'customization' && (
              <CorporateProductCustomization />
            )}

            {activeTab === 'tickets' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Support Tickets</h2>
                
                {/* Filter Controls */}
                {tickets.length > 0 && (
                  <div className="bg-white p-4 rounded-lg border mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Filter by Status
                        </label>
                        <select
                          value={ticketStatusFilter}
                          onChange={(e) => setTicketStatusFilter(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="all">All Statuses</option>
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Filter by Priority
                        </label>
                        <select
                          value={ticketPriorityFilter}
                          onChange={(e) => setTicketPriorityFilter(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="all">All Priorities</option>
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <div className="text-sm text-gray-600">
                          Showing {filteredTickets.length} of {tickets.length} tickets
                        </div>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            setTicketStatusFilter('all');
                            setTicketPriorityFilter('all');
                          }}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Clear filters
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                
                {ticketsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading support tickets...</p>
                  </div>
                ) : ticketsError ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Tickets</h3>
                    <p className="text-gray-600 mb-4">{ticketsError}</p>
                    <button
                      onClick={loadData}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                      Retry
                    </button>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Support Tickets</h3>
                    <p className="text-gray-600">Support tickets will appear here when employees raise issues.</p>
                    <button
                      onClick={loadData}
                      className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                      Refresh
                    </button>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets match your filters</h3>
                    <p className="text-gray-600">Try adjusting your filter settings.</p>
                    <button
                      onClick={() => {
                        setTicketStatusFilter('all');
                        setTicketPriorityFilter('all');
                      }}
                      className="mt-4 text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-gray-600">
                        Showing {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
                      </p>
                      <button
                        onClick={loadData}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 text-sm"
                      >
                        Refresh
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {filteredTickets
                        .sort((a, b) => {
                          // Sort by priority first (urgent first), then by creation date (newest first)
                          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
                          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
                          
                          if (aPriority !== bPriority) {
                            return aPriority - bPriority;
                          }
                          
                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        })
                        .map((ticket) => (
                        <div key={ticket.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-red-500">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-500 font-mono">#{ticket.id.slice(-6)}</span>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTicketStatusColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ')}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                              {ticket.priority === 'urgent' && (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-500">
                                {new Date(ticket.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex space-x-2">
                                <select
                                  value={ticket.status}
                                  onChange={(e) => handleTicketStatusUpdate(ticket.id, e.target.value)}
                                  className="text-sm border border-gray-300 rounded px-2 py-1"
                                >
                                  <option value="open">Open</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="resolved">Resolved</option>
                                  <option value="closed">Closed</option>
                                </select>
                                <button
                                  onClick={() => setSelectedTicket(ticket)}
                                  className="bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 transition-colors text-sm"
                                >
                                  Respond
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-1">{ticket.subject}</h4>
                              <p className="text-sm text-gray-600">Category: {ticket.category?.replace('_', ' ') || 'General'}</p>
                              <p className="text-sm text-gray-600">Company: {ticket.corporateName || 'Unknown'}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Employee:</p>
                              <p className="text-sm text-gray-900">{ticket.employeeName || 'Unknown'}</p>
                              <p className="text-sm text-gray-500">{ticket.employeeEmail || 'No email'}</p>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded-lg mb-4">
                            <p className="text-sm text-gray-700">{ticket.description || 'No description provided'}</p>
                          </div>
                          
                          {ticket.responses && ticket.responses.length > 0 && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Recent Responses ({ticket.responses.length})</h5>
                              <div className="space-y-2">
                                {ticket.responses.slice(-2).map((response, index) => (
                                  <div key={index} className={`p-3 rounded-lg ${
                                    response.authorType === 'admin' ? 'bg-green-50' :
                                    response.authorType === 'corporate' ? 'bg-red-50' : 'bg-gray-50'
                                  }`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium">
                                        {response.author} ({response.authorType})
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(response.timestamp).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{response.message}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Point Allocation Modal */}
        {showPointModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">
                {pointAllocationForm.operation === 'add' ? 'Allocate Points' : 'Deduct Points'}
              </h3>
              <form onSubmit={handleAllocatePoints} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operation
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="operation"
                        value="add"
                        checked={pointAllocationForm.operation === 'add'}
                        onChange={(e) => setPointAllocationForm({
                          ...pointAllocationForm,
                          operation: e.target.value as 'add' | 'subtract'
                        })}
                        className="mr-2"
                      />
                      <span className="text-green-600">Add Points</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="operation"
                        value="subtract"
                        checked={pointAllocationForm.operation === 'subtract'}
                        onChange={(e) => setPointAllocationForm({
                          ...pointAllocationForm,
                          operation: e.target.value as 'add' | 'subtract'
                        })}
                        className="mr-2"
                      />
                      <span className="text-red-600">Deduct Points</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Corporate Company
                  </label>
                  <select
                    value={pointAllocationForm.corporateId}
                    onChange={(e) => setPointAllocationForm({
                      ...pointAllocationForm,
                      corporateId: e.target.value
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select a company</option>
                    {corporates.filter(corp => corp.status === 'approved').map(corporate => (
                      <option key={corporate.id} value={corporate.id}>
                        {corporate.companyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points to {pointAllocationForm.operation === 'add' ? 'Allocate' : 'Deduct'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pointAllocationForm.points}
                    onChange={(e) => setPointAllocationForm({
                      ...pointAllocationForm,
                      points: parseInt(e.target.value)
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={pointAllocationForm.reason}
                    onChange={(e) => setPointAllocationForm({
                      ...pointAllocationForm,
                      reason: e.target.value
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    placeholder={pointAllocationForm.operation === 'add' 
                      ? "e.g., Monthly allocation, Bonus points, etc." 
                      : "e.g., Point correction, Penalty, etc."}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className={`flex-1 text-white py-2 rounded-md ${
                      pointAllocationForm.operation === 'add' 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {pointAllocationForm.operation === 'add' ? 'Allocate Points' : 'Deduct Points'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPointModal(false);
                      setPointAllocationForm({ corporateId: '', points: 0, reason: '', operation: 'add' });
                    }}
                    className="flex-1 bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Tracking Modal */}
        {showTrackingModal && selectedOrderDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {selectedOrderDetails.trackingNumber ? 'Update Tracking Number' : 'Add Tracking Number'}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder={selectedOrderDetails.trackingNumber || 'Enter tracking number'}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div className="bg-red-50 p-3 rounded-md mb-4">
                <p className="text-sm text-red-800">
                  <strong>Note:</strong> Adding a tracking number will automatically set the order status to "Shipped" and start monitoring delivery status from Shiprocket.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleAddTracking}
                  disabled={!trackingNumber.trim()}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {selectedOrderDetails.trackingNumber ? 'Update' : 'Add'} Tracking
                </button>
                <button
                  onClick={() => {
                    setShowTrackingModal(false);
                    setTrackingNumber('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Tracking Import Modal */}
        {showBulkTrackingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Bulk Import Tracking Numbers</h3>
              
              {!bulkTrackingResults ? (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Upload a CSV file with Order ID and Tracking Number:
                    </p>
                    <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                      Order ID,Tracking Number<br/>
                      ORDER123,1Z999AA1234567890<br/>
                      ORDER124,1Z999AA1234567891
                    </div>
                  </div>
                  
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBulkTrackingFile(e.target.files?.[0] || null)}
                    className="w-full mb-4 p-2 border border-gray-300 rounded"
                  />
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleBulkTrackingImport}
                      disabled={!bulkTrackingFile || processingBulkTracking}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingBulkTracking ? 'Processing...' : 'Import'}
                    </button>
                    <button
                      onClick={resetBulkTrackingModal}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Import Results:</h4>
                    <div className="space-y-2">
                      <p>Total: {bulkTrackingResults.total}</p>
                      <p className="text-green-600">Updated: {bulkTrackingResults.updated}</p>
                      <p className="text-red-600">Failed: {bulkTrackingResults.failed}</p>
                    </div>
                    
                    {bulkTrackingResults.errors.length > 0 && (
                      <div className="mt-3">
                        <h5 className="font-medium text-red-600 mb-1">Errors:</h5>
                        <div className="bg-red-50 p-2 rounded max-h-32 overflow-y-auto">
                          {bulkTrackingResults.errors.map((error: string, index: number) => (
                            <p key={index} className="text-xs text-red-600">{error}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={resetBulkTrackingModal}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Admin Ticket Response Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Admin Response</h2>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{selectedTicket.subject}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTicketStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    From: {selectedTicket.employeeName} ({selectedTicket.employeeEmail})
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Company: {selectedTicket.corporateName}
                  </p>
                  <p className="text-sm text-gray-700">{selectedTicket.description}</p>
                </div>

                {selectedTicket.responses.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Previous Responses</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedTicket.responses.map((response, index) => (
                        <div key={index} className={`p-3 rounded-lg ${
                          response.authorType === 'admin' ? 'bg-green-50' :
                          response.authorType === 'corporate' ? 'bg-red-50' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {response.author} ({response.authorType})
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(response.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{response.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleTicketResponse} className="space-y-4">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Update Status (Optional)
                    </label>
                    <select
                      id="status"
                      value={ticketStatus}
                      onChange={(e) => setTicketStatus(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Keep current status</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Response
                    </label>
                    <textarea
                      id="response"
                      required
                      rows={4}
                      value={ticketResponse}
                      onChange={(e) => setTicketResponse(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Type your admin response here..."
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(null)}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={respondingToTicket}
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {respondingToTicket ? 'Sending...' : 'Send Response'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrderDetails && !showTrackingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Order Details</h3>
                <button
                  onClick={() => setSelectedOrderDetails(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Order ID:</span> #{selectedOrderDetails.id.slice(-8)}</p>
                    <p><span className="font-medium">Employee:</span> {selectedOrderDetails.employeeName}</p>
                    <p><span className="font-medium">Email:</span> {selectedOrderDetails.employeeEmail}</p>
                    <p><span className="font-medium">Company:</span> {selectedOrderDetails.corporateName}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        selectedOrderDetails.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        selectedOrderDetails.status === 'shipped' ? 'bg-red-100 text-red-800' :
                        selectedOrderDetails.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedOrderDetails.status}
                      </span>
                    </p>
                    <p><span className="font-medium">Date:</span> {new Date(selectedOrderDetails.createdAt).toLocaleDateString()}</p>
                    <p><span className="font-medium">Total Points:</span> {selectedOrderDetails.totalPoints || 0}</p>
                    
                    {selectedOrderDetails.trackingNumber && (
                      <div className="bg-red-50 p-3 rounded-md">
                        <p className="text-sm">
                          <span className="font-medium">Tracking Number:</span> {selectedOrderDetails.trackingNumber}
                        </p>
                        <a
                          href={`https://shiprocket.co/tracking/${selectedOrderDetails.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:text-red-800 text-sm underline"
                        >
                          Track on Shiprocket →
                        </a>
                      </div>
                    )}
                    
                    {selectedOrderDetails.shippingAddress && (
                      <div>
                        <h4 className="font-medium mb-2">Shipping Address:</h4>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          <p>{selectedOrderDetails.shippingAddress.fullName}</p>
                          <p>{selectedOrderDetails.shippingAddress.addressLine1}</p>
                          {selectedOrderDetails.shippingAddress.addressLine2 && (
                            <p>{selectedOrderDetails.shippingAddress.addressLine2}</p>
                          )}
                          <p>{selectedOrderDetails.shippingAddress.city}, {selectedOrderDetails.shippingAddress.state} {selectedOrderDetails.shippingAddress.zipCode}</p>
                          <p>{selectedOrderDetails.shippingAddress.country}</p>
                          <p>Phone: {selectedOrderDetails.shippingAddress.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Products Ordered</h4>
                  <div className="space-y-3">
                    {selectedOrderDetails.products?.map((product: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          {product.imageUrl && (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h5 className="font-medium">{product.name}</h5>
                            <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                            <p className="text-sm text-gray-600">Quantity: {product.quantity}</p>
                            <p className="text-sm text-gray-600">Points: {product.pointCost} each</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowTrackingModal(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2"
                >
                  <Truck className="h-4 w-4" />
                  <span>{selectedOrderDetails.trackingNumber ? 'Update Tracking' : 'Add Tracking'}</span>
                </button>
                <button
                  onClick={() => setSelectedOrderDetails(null)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Corporate Orders Overview Component
function CorporateOrdersOverview({
  orders,
  corporates,
  onSelectCorporate
}: {
  orders: Order[],
  corporates: Corporate[],
  onSelectCorporate: (corporateId: string) => void
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const corporateOrderStats = corporates.map(corporate => {
    const corporateOrders = orders.filter(order => order.corporateId === corporate.id);
    return {
      ...corporate,
      orderCount: corporateOrders.length,
      totalPoints: corporateOrders.reduce((sum, order) => sum + order.totalPoints, 0),
      recentOrder: corporateOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    };
  }).filter(corporate => corporate.orderCount > 0);

  const filteredCorporates = corporateOrderStats.filter(corporate =>
    corporate.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Orders by Corporate ({filteredCorporates.length} companies)</h3>
        <input
          type="text"
          placeholder="Search companies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCorporates.map(corporate => (
          <div 
            key={corporate.id}
            onClick={() => onSelectCorporate(corporate.id)}
            className="bg-white p-6 rounded-lg border hover:shadow-md cursor-pointer transition-shadow"
          >
            <h4 className="font-semibold text-lg mb-2">{corporate.companyName}</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Total Orders:</span>
                <span className="font-medium">{corporate.orderCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Points:</span>
                <span className="font-medium">{corporate.totalPoints}</span>
              </div>
              {corporate.recentOrder && (
                <div className="flex justify-between">
                  <span>Last Order:</span>
                  <span className="font-medium">
                    {new Date(corporate.recentOrder.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 text-red-600 text-sm font-medium">
              Click to view orders →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Corporate Orders View Component
function CorporateOrdersView({ 
  corporateId, 
  orders, 
  onBack, 
  onViewOrder,
  onUpdateStatus 
}: { 
  corporateId: string, 
  orders: Order[], 
  onBack: () => void,
  onViewOrder: (order: Order) => void,
  onUpdateStatus: (orderId: string, status: string) => void
}) {
  const corporateName = orders[0]?.corporateName || 'Unknown Company';

  return (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="mr-4 text-red-600 hover:text-red-700"
        >
          ← Back to Overview
        </button>
        <h3 className="text-lg font-medium">Orders from {corporateName} ({orders.length})</h3>
      </div>
      
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{order.id.slice(-8)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>
                    <div className="font-medium">{order.employeeName}</div>
                    <div className="text-xs text-gray-400">{order.employeeEmail}</div>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => onViewOrder(order)}
                    className="text-red-600 hover:text-red-700"
                  >
                    View Details
                  </button>
                  <select
                    value={order.status}
                    onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Order Details View Component
function OrderDetailsView({ 
  order, 
  onBack, 
  onUpdateStatus 
}: { 
  order: Order, 
  onBack: () => void,
  onUpdateStatus: (orderId: string, status: string) => void
}) {
  return (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="mr-4 text-red-600 hover:text-red-700"
        >
          ← Back to Orders
        </button>
        <h3 className="text-lg font-medium">Order Details #{order.id.slice(-8)}</h3>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Information */}
        <div className="bg-white p-6 rounded-lg border">
          <h4 className="text-lg font-medium mb-4">Order Information</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-medium">#{order.id.slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Company:</span>
              <span className="font-medium">{order.corporateName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Employee:</span>
              <div className="text-right">
                <div className="font-medium">{order.employeeName}</div>
                <div className="text-sm text-gray-500">{order.employeeEmail}</div>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Points:</span>
              <span className="font-medium">{order.totalPoints}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order Date:</span>
              <span className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status:</span>
              <select
                value={order.status}
                onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                className="border border-gray-300 rounded px-3 py-1"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Shipping Address */}
        {order.shippingAddress && (
          <div className="bg-white p-6 rounded-lg border">
            <h4 className="text-lg font-medium mb-4">Shipping Address</h4>
            <div className="space-y-2">
              <div className="font-medium">{order.shippingAddress.fullName}</div>
              <div className="text-gray-600">{order.shippingAddress.phone}</div>
              <div className="text-gray-600">
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.addressLine2 && (
                  <><br />{order.shippingAddress.addressLine2}</>
                )}
              </div>
              <div className="text-gray-600">
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
              </div>
              <div className="text-gray-600">{order.shippingAddress.country}</div>
            </div>
          </div>
        )}
        
        {/* Products */}
        <div className="bg-white p-6 rounded-lg border lg:col-span-2">
          <h4 className="text-lg font-medium mb-4">Ordered Products</h4>
          <div className="space-y-3">
            {order.products?.map((product: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-600">Quantity: {product.quantity}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{product.pointCost} points each</div>
                  <div className="text-sm text-gray-600">
                    Total: {product.pointCost * product.quantity} points
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}