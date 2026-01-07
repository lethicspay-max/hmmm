export interface OrderCSVData {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeePhone: string;
  corporateName: string;
  productName: string;
  productSKU: string;
  productWeight: string;
  productSize: string;
  productColor: string;
  pointsUsed: number;
  status: string;
  orderDate: string;
  shippingAddress: string;
  trackingNumber?: string;
}

export function exportOrdersToCSV(orders: any[], filename: string) {
  const headers = [
    'Order ID',
    'Employee Name',
    'Employee Email',
    'Employee Phone',
    'Corporate Name',
    'Product Name',
    'Product SKU',
    'Product Weight',
    'Product Size',
    'Product Color',
    'Points Used',
    'Status',
    'Order Date',
    'Shipping Address',
    'Tracking Number'
  ];

  const formatFullShippingAddress = (shippingAddress: any) => {
    if (!shippingAddress) return 'N/A';
    
    // Handle both object and string formats
    if (typeof shippingAddress === 'string') {
      return shippingAddress;
    }
    
    // Extract from Firebase shippingAddress object
    const parts = [];
    
    // Handle different possible field names from Firebase
    const address1 = shippingAddress.addressLine1 || shippingAddress.address1 || shippingAddress.street || shippingAddress.line1;
    const address2 = shippingAddress.addressLine2 || shippingAddress.address2 || shippingAddress.line2;
    const city = shippingAddress.city;
    const state = shippingAddress.state || shippingAddress.province || shippingAddress.region;
    const zipCode = shippingAddress.zipCode || shippingAddress.postalCode || shippingAddress.zip;
    const country = shippingAddress.country;
    
    if (address1) parts.push(address1);
    if (address2) parts.push(address2);
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (zipCode) parts.push(zipCode);
    if (country) parts.push(country);
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const csvContent = [
    headers.join(','),
    ...orders.map(order => [
      `"${order.id}"`,
      `"${order.employeeName || 'N/A'}"`,
      `"${order.employeeEmail || 'N/A'}"`,
      `"${order.employeePhone || order.shippingAddress?.phone || 'N/A'}"`,
      `"${order.corporateName || 'N/A'}"`,
      `"${order.products && order.products.length > 0 ? order.products[0].name : 'N/A'}"`,
      `"${order.products && order.products.length > 0 ? order.products[0].id || 'N/A' : 'N/A'}"`,
      `"${order.products && order.products.length > 0 ? order.products[0].weight || 'N/A' : 'N/A'}"`,
      `"${order.products && order.products.length > 0 ? order.products[0].selectedSize || 'N/A' : 'N/A'}"`,
      `"${order.products && order.products.length > 0 ? order.products[0].selectedColor || 'N/A' : 'N/A'}"`,
      order.totalPoints || 0,
      `"${order.status}"`,
      `"${formatOrderDate(order)}"`,
      `"${formatFullShippingAddress(order.shippingAddress)}"`,
      `"${order.trackingNumber || ''}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatOrderDate(order: any): string {
  // Try different possible date fields and formats
  const dateValue = order.createdAt || order.orderDate || order.timestamp || order.date;
  
  if (!dateValue) {
    return 'N/A';
  }
  
  try {
    // Handle Firebase Timestamp objects
    if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
      return dateValue.toDate().toISOString().split('T')[0];
    }
    
    // Handle Firebase Timestamp objects with seconds/nanoseconds
    if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
      return new Date(dateValue.seconds * 1000).toISOString().split('T')[0];
    }
    
    // Handle regular Date objects and ISO strings
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return 'N/A';
  } catch (error) {
    console.error('Error formatting order date:', error, 'Date value:', dateValue);
    return 'N/A';
  }
}

export function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0];
}