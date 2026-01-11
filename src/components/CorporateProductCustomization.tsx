import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { Building2, DollarSign, Lock, Unlock, Save, RefreshCw, AlertCircle, Search } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  pointCost: number;
  category: string;
  imageUrl: string;
  status: string;
}

interface Corporate {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  status: string;
}

interface CorporateProductSetting {
  corporateId: string;
  productId: string;
  customPrice: number | null;
  isLocked: boolean;
  selectedByCorporate?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function CorporateProductCustomization() {
  const [corporates, setCorporates] = useState<Corporate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCorporate, setSelectedCorporate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [customPricing, setCustomPricing] = useState<Map<string, number | null>>(new Map());
  const [productLocks, setProductLocks] = useState<Map<string, boolean>>(new Map());
  const [productSelectionLocked, setProductSelectionLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadCorporates();
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedCorporate) {
      loadCorporateCustomization();
    }
  }, [selectedCorporate]);

  const loadCorporates = async () => {
    try {
      const corporatesQuery = query(
        collection(db, 'users'),
        where('role', '==', 'corporate'),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(corporatesQuery);

      const mapped = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        companyName: docSnap.data().companyName || docSnap.data().company_name || '',
        contactName: docSnap.data().contactName || docSnap.data().contact_name || '',
        email: docSnap.data().email || '',
        status: docSnap.data().status || '',
      }));

      setCorporates(mapped);
    } catch (error) {
      console.error('Error loading corporates:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const productsQuery = query(
        collection(db, 'products'),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(productsQuery);

      const mapped = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name || '',
        sku: docSnap.data().sku || '',
        pointCost: docSnap.data().pointCost || 0,
        category: docSnap.data().category || '',
        imageUrl: docSnap.data().imageUrl || '',
        status: docSnap.data().status || '',
      }));

      // Sort by category
      mapped.sort((a, b) => a.category.localeCompare(b.category));

      setProducts(mapped);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCorporateCustomization = async () => {
    if (!selectedCorporate) return;

    setLoading(true);
    try {
      // Query only settings for the selected corporate (optimized)
      const settingsQuery = query(
        collection(db, 'corporateProductSettings'),
        where('corporateId', '==', selectedCorporate)
      );
      const settingsSnapshot = await getDocs(settingsQuery);

      const pricingMap = new Map<string, number | null>();
      const locksMap = new Map<string, boolean>();

      settingsSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        pricingMap.set(data.productId, data.customPrice ?? null);
        locksMap.set(data.productId, data.isLocked || false);
      });

      setCustomPricing(pricingMap);
      setProductLocks(locksMap);

      const corporateSettingsQuery = query(
        collection(db, 'corporateSettings'),
        where('corporateId', '==', selectedCorporate)
      );
      const corporateSettingsSnapshot = await getDocs(corporateSettingsQuery);

      if (!corporateSettingsSnapshot.empty) {
        const settings = corporateSettingsSnapshot.docs[0].data();
        setProductSelectionLocked(settings.productSelectionLocked || false);
      } else {
        setProductSelectionLocked(false);
      }
    } catch (error) {
      console.error('Error loading customization:', error);
      setMessage({ type: 'error', text: 'Failed to load customization data' });
    } finally {
      setLoading(false);
    }
  };

  const handlePricingChange = (productId: string, value: string) => {
    const newPricing = new Map(customPricing);
    if (value === '') {
      newPricing.set(productId, null);
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 0) {
        newPricing.set(productId, numValue);
      }
    }
    setCustomPricing(newPricing);
  };

  const handleLockToggle = (productId: string) => {
    const newLocks = new Map(productLocks);
    const currentValue = newLocks.get(productId) || false;
    newLocks.set(productId, !currentValue);
    setProductLocks(newLocks);
  };

  const saveCustomization = async () => {
    if (!selectedCorporate) {
      setMessage({ type: 'error', text: 'Please select a corporate' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Get all products that have either custom pricing or lock status set
      const productsToSave = products.filter(product => {
        const hasCustomPrice = customPricing.has(product.id) && customPricing.get(product.id) !== null;
        const hasLockStatus = productLocks.has(product.id);
        return hasCustomPrice || hasLockStatus;
      });

      // Save each product setting using setDoc with merge
      for (const product of productsToSave) {
        const docId = `${selectedCorporate}_${product.id}`;
        const customPrice = customPricing.get(product.id) ?? null;
        const isLocked = productLocks.get(product.id) || false;

        await setDoc(
          doc(db, 'corporateProductSettings', docId),
          {
            corporateId: selectedCorporate,
            productId: product.id,
            customPrice: customPrice,
            isLocked: isLocked,
            updatedAt: Timestamp.now(),
            createdAt: Timestamp.now()
          },
          { merge: true }
        );
      }

      const corporateSettingsQuery = query(
        collection(db, 'corporateSettings'),
        where('corporateId', '==', selectedCorporate)
      );
      const corporateSettingsSnapshot = await getDocs(corporateSettingsQuery);

      if (corporateSettingsSnapshot.empty) {
        await addDoc(collection(db, 'corporateSettings'), {
          corporateId: selectedCorporate,
          productSelectionLocked,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      } else {
        await updateDoc(corporateSettingsSnapshot.docs[0].ref, {
          productSelectionLocked,
          updatedAt: new Date().toISOString()
        });
      }

      setMessage({ type: 'success', text: 'Customization saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving customization:', error);
      setMessage({ type: 'error', text: 'Failed to save customization' });
    } finally {
      setSaving(false);
    }
  };

  const resetCustomization = () => {
    loadCorporateCustomization();
    setMessage(null);
  };

  const getEffectivePrice = (productId: string, defaultPrice: number): number => {
    const customPrice = customPricing.get(productId);
    return customPrice !== null && customPrice !== undefined ? customPrice : defaultPrice;
  };

  const isProductLocked = (productId: string): boolean => {
    return productLocks.get(productId) || false;
  };

  // Filter corporates based on search term
  const filteredCorporates = corporates.filter((corp) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      corp.companyName.toLowerCase().includes(searchLower) ||
      corp.contactName.toLowerCase().includes(searchLower) ||
      corp.email.toLowerCase().includes(searchLower)
    );
  });

  // Group products by category
  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-red-600 mr-2" />
            <h2 className="text-2xl font-bold text-gray-900">Corporate Product Customization</h2>
          </div>
        </div>

        {/* Corporate Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Corporate Company
          </label>

          {/* Search Input */}
          <div className="relative mb-3 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by company name, contact, or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Dropdown */}
          <select
            value={selectedCorporate}
            onChange={(e) => setSelectedCorporate(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">-- Select a Corporate --</option>
            {filteredCorporates.map((corp) => (
              <option key={corp.id} value={corp.id}>
                {corp.companyName} ({corp.contactName})
              </option>
            ))}
          </select>

          {/* Show count when searching */}
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600">
              Found {filteredCorporates.length} corporate{filteredCorporates.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Product Selection Lock Toggle */}
        {selectedCorporate && !loading && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Lock className="h-5 w-5 text-yellow-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Lock Product Selection Feature</h3>
                  <p className="text-sm text-gray-600">
                    When enabled, this corporate will not be able to access the product selection feature in their dashboard.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProductSelectionLocked(!productSelectionLocked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  productSelectionLocked ? 'bg-red-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    productSelectionLocked ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {productSelectionLocked && (
              <div className="mt-2 text-sm text-yellow-700 font-medium">
                Product selection is LOCKED for this corporate
              </div>
            )}
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-md flex items-center ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Products List */}
        {selectedCorporate && !loading && (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Set custom pricing and control product visibility for this corporate. Leave price empty to use default pricing.
                Locked products are hidden from the corporate and cannot be selected.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={resetCustomization}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={saveCustomization}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryProducts.map((product) => {
                      const locked = isProductLocked(product.id);
                      const effectivePrice = getEffectivePrice(product.id, product.pointCost);
                      const hasCustomPrice = customPricing.get(product.id) !== null &&
                                            customPricing.get(product.id) !== undefined;

                      return (
                        <div
                          key={product.id}
                          className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                            locked ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 hover:border-red-300'
                          }`}
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-16 h-16 object-contain rounded bg-gray-50"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{product.name}</h4>
                              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                              <p className="text-sm text-gray-600">
                                Default: {product.pointCost} points
                                {hasCustomPrice && (
                                  <span className="ml-2 text-red-600 font-medium">
                                    → Custom: {effectivePrice} points
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <input
                                type="number"
                                min="0"
                                placeholder={product.pointCost.toString()}
                                value={customPricing.get(product.id) ?? ''}
                                onChange={(e) => handlePricingChange(product.id, e.target.value)}
                                className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              />
                              <span className="text-sm text-gray-500">pts</span>
                            </div>

                            <button
                              onClick={() => handleLockToggle(product.id)}
                              className={`p-2 rounded-md transition-colors ${
                                locked
                                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                  : 'bg-green-100 text-green-600 hover:bg-green-200'
                              }`}
                              title={locked ? 'Product is locked (hidden from corporate, cannot be selected)' : 'Product is unlocked (visible to corporate, can be selected)'}
                            >
                              {locked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-red-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Loading customization data...</p>
          </div>
        )}

        {!selectedCorporate && !loading && (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>Select a corporate company to customize their product catalog</p>
          </div>
        )}
      </div>
    </div>
  );
}
