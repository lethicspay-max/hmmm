import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, DollarSign, Lock, Unlock, Save, RefreshCw, AlertCircle } from 'lucide-react';

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

interface CustomPricing {
  productId: string;
  customPointCost: number | null;
}

interface ProductLock {
  productId: string;
  isLocked: boolean;
}

export function CorporateProductCustomization() {
  const [corporates, setCorporates] = useState<Corporate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCorporate, setSelectedCorporate] = useState<string>('');
  const [customPricing, setCustomPricing] = useState<Map<string, number | null>>(new Map());
  const [productLocks, setProductLocks] = useState<Map<string, boolean>>(new Map());
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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'corporate')
        .eq('status', 'approved')
        .order('company_name');

      if (error) throw error;

      const mapped = (data || []).map((corp: any) => ({
        id: corp.id,
        companyName: corp.company_name,
        contactName: corp.contact_name,
        email: corp.email,
        status: corp.status,
      }));

      setCorporates(mapped);
    } catch (error) {
      console.error('Error loading corporates:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('category', { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map((prod: any) => ({
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        pointCost: prod.point_cost,
        category: prod.category,
        imageUrl: prod.image_url,
        status: prod.status,
      }));

      setProducts(mapped);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCorporateCustomization = async () => {
    if (!selectedCorporate) return;

    setLoading(true);
    try {
      // Load custom pricing
      const { data: pricingData, error: pricingError } = await supabase
        .from('corporate_product_pricing')
        .select('*')
        .eq('corporate_id', selectedCorporate);

      if (pricingError) throw pricingError;

      const pricingMap = new Map<string, number>();
      (pricingData || []).forEach((item: any) => {
        pricingMap.set(item.product_id, item.custom_point_cost);
      });
      setCustomPricing(pricingMap);

      // Load product locks
      const { data: locksData, error: locksError } = await supabase
        .from('corporate_product_locks')
        .select('*')
        .eq('corporate_id', selectedCorporate);

      if (locksError) throw locksError;

      const locksMap = new Map<string, boolean>();
      (locksData || []).forEach((item: any) => {
        locksMap.set(item.product_id, item.is_locked);
      });
      setProductLocks(locksMap);
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
      // Save custom pricing
      const pricingUpdates: any[] = [];
      const pricingDeletes: string[] = [];

      customPricing.forEach((cost, productId) => {
        if (cost !== null && cost !== undefined) {
          pricingUpdates.push({
            corporate_id: selectedCorporate,
            product_id: productId,
            custom_point_cost: cost,
            updated_at: new Date().toISOString(),
          });
        } else {
          pricingDeletes.push(productId);
        }
      });

      // Delete removed custom pricing
      if (pricingDeletes.length > 0) {
        const { error: deleteError } = await supabase
          .from('corporate_product_pricing')
          .delete()
          .eq('corporate_id', selectedCorporate)
          .in('product_id', pricingDeletes);

        if (deleteError) throw deleteError;
      }

      // Upsert custom pricing
      if (pricingUpdates.length > 0) {
        const { error: pricingError } = await supabase
          .from('corporate_product_pricing')
          .upsert(pricingUpdates, {
            onConflict: 'corporate_id,product_id',
          });

        if (pricingError) throw pricingError;
      }

      // Save product locks
      const lockUpdates: any[] = [];
      productLocks.forEach((isLocked, productId) => {
        lockUpdates.push({
          corporate_id: selectedCorporate,
          product_id: productId,
          is_locked: isLocked,
          updated_at: new Date().toISOString(),
        });
      });

      if (lockUpdates.length > 0) {
        const { error: lockError } = await supabase
          .from('corporate_product_locks')
          .upsert(lockUpdates, {
            onConflict: 'corporate_id,product_id',
          });

        if (lockError) throw lockError;
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
          <select
            value={selectedCorporate}
            onChange={(e) => setSelectedCorporate(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">-- Select a Corporate --</option>
            {corporates.map((corp) => (
              <option key={corp.id} value={corp.id}>
                {corp.companyName} ({corp.contactName})
              </option>
            ))}
          </select>
        </div>

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
                Customize pricing and product access for this corporate. Leave price empty to use default pricing.
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
                            locked ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200 hover:border-red-300'
                          }`}
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded"
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
                                disabled={locked}
                                className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
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
                              title={locked ? 'Product is locked (hidden from corporate)' : 'Product is unlocked (visible to corporate)'}
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
