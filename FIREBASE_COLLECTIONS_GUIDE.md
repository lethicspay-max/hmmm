# Firebase Collections Quick Reference Guide

## Collection Structure Overview

```
firestore-database/
├── users/                           (Corporate & Admin accounts)
├── products/                        (Product catalog)
├── corporateSettings/               (General corporate settings)
│   └── {doc-id}/
│       ├── corporateId
│       ├── productSelectionLocked   ← LOCKS ENTIRE PRODUCTS TAB
│       ├── createdAt
│       └── updatedAt
│
└── corporateProductSettings/        (Individual product settings)
    └── {corporateId}_{productId}/   ← Compound key format
        ├── corporateId
        ├── productId
        ├── customPrice              ← Custom pricing per corporate
        ├── isLocked                 ← HIDES INDIVIDUAL PRODUCT
        ├── selectedByCorporate
        ├── createdAt
        └── updatedAt
```

---

## Product Lock Feature: How It Works

### Scenario 1: No Restrictions (Default)
```
Admin Dashboard:
  Corporate: "Acme Corp"
  - Product Selection Lock: OFF
  - Product Locks: None

Corporate Dashboard (Acme Corp sees):
  ✅ Products Tab: VISIBLE
  ✅ All Products: VISIBLE
  ✅ Can select products for their catalog
```

### Scenario 2: Tab-Level Lock
```
Admin Dashboard:
  Corporate: "Acme Corp"
  - Product Selection Lock: ON ◄─── Entire tab locked
  - Product Locks: (doesn't matter)

Corporate Dashboard (Acme Corp sees):
  ❌ Products Tab: HIDDEN
  (No products visible, feature completely disabled)
```

### Scenario 3: Individual Product Locks
```
Admin Dashboard:
  Corporate: "Acme Corp"
  - Product Selection Lock: OFF
  - Product Locks:
    • Laptop: UNLOCKED ✓
    • Phone: LOCKED ✗
    • Tablet: UNLOCKED ✓
    • Monitor: LOCKED ✗

Corporate Dashboard (Acme Corp sees):
  ✅ Products Tab: VISIBLE
  ✅ Laptop: VISIBLE (can select)
  ❌ Phone: HIDDEN
  ✅ Tablet: VISIBLE (can select)
  ❌ Monitor: HIDDEN
```

### Scenario 4: Custom Pricing + Locks
```
Admin Dashboard:
  Corporate: "Acme Corp"
  - Product Selection Lock: OFF
  - Products:
    • Laptop: UNLOCKED ✓, Custom Price: 200 pts (default: 300)
    • Phone: LOCKED ✗, No Custom Price
    • Tablet: UNLOCKED ✓, No Custom Price (uses default)

Corporate Dashboard (Acme Corp sees):
  ✅ Products Tab: VISIBLE
  ✅ Laptop: VISIBLE - Shows 200 pts (discounted)
  ❌ Phone: HIDDEN (locked)
  ✅ Tablet: VISIBLE - Shows default price
```

---

## Data Examples

### Example 1: corporateSettings Document
```json
{
  "corporateId": "corp_abc123",
  "productSelectionLocked": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-20T14:45:00.000Z"
}
```
**Result**: Products tab is visible for this corporate

---

### Example 2: corporateProductSettings Document (Locked Product)
```json
// Document ID: corp_abc123_prod_laptop99
{
  "corporateId": "corp_abc123",
  "productId": "prod_laptop99",
  "customPrice": null,
  "isLocked": true,
  "selectedByCorporate": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:45:00Z"
}
```
**Result**: This laptop product will NOT appear in Acme Corp's product list

---

### Example 3: corporateProductSettings Document (Custom Price)
```json
// Document ID: corp_abc123_prod_laptop99
{
  "corporateId": "corp_abc123",
  "productId": "prod_laptop99",
  "customPrice": 150,
  "isLocked": false,
  "selectedByCorporate": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:45:00Z"
}
```
**Result**: This laptop shows at 150 points instead of default price

---

## Query Examples

### Admin: Load Settings for Specific Corporate
```javascript
// Get general settings
const settingsQuery = query(
  collection(db, 'corporateSettings'),
  where('corporateId', '==', 'corp_abc123')
);
const settingsSnapshot = await getDocs(settingsQuery);

// Get product-specific settings
const productSettingsQuery = query(
  collection(db, 'corporateProductSettings'),
  where('corporateId', '==', 'corp_abc123')
);
const productSettingsSnapshot = await getDocs(productSettingsQuery);
```

### Admin: Save Product Lock
```javascript
const docId = `${corporateId}_${productId}`;
await setDoc(
  doc(db, 'corporateProductSettings', docId),
  {
    corporateId: 'corp_abc123',
    productId: 'prod_laptop99',
    customPrice: null,
    isLocked: true,  // ← This locks the product
    updatedAt: Timestamp.now(),
    createdAt: Timestamp.now()
  },
  { merge: true }
);
```

### Corporate: Check if Tab is Locked
```javascript
const settingsQuery = query(
  collection(db, 'corporateSettings'),
  where('corporateId', '==', currentUser.uid)
);
const snapshot = await getDocs(settingsQuery);
const isLocked = snapshot.empty
  ? false
  : snapshot.docs[0].data().productSelectionLocked;

// Hide Products tab if isLocked === true
```

### Corporate: Filter Out Locked Products
```javascript
// Load settings for current corporate
const settingsQuery = query(
  collection(db, 'corporateProductSettings'),
  where('corporateId', '==', currentUser.uid)
);
const settingsSnapshot = await getDocs(settingsQuery);

// Build map of locked products
const lockedProducts = new Set();
settingsSnapshot.docs.forEach(doc => {
  const data = doc.data();
  if (data.isLocked) {
    lockedProducts.add(data.productId);
  }
});

// Filter products
const visibleProducts = allProducts.filter(p => !lockedProducts.has(p.id));
```

---

## Access Control Decision Tree

```
Corporate User Opens Dashboard
        |
        v
   Check corporateSettings
   (productSelectionLocked?)
        |
        ├── YES → Hide Products Tab ❌ [END]
        |
        └── NO → Show Products Tab ✓
                |
                v
           Load Products
                |
                v
       Check corporateProductSettings
       for each product (isLocked?)
                |
                ├── YES → Hide Product ❌
                |
                └── NO → Show Product ✓
                        |
                        v
                  Check customPrice
                        |
                        ├── Set → Use custom price
                        |
                        └── Not Set → Use default price
```

---

## Benefits of This Structure

1. **Granular Control**: Admin can control access at tab level OR product level
2. **Flexible Pricing**: Each corporate can have custom prices per product
3. **Scalable**: Uses targeted queries, only loads data for specific corporate
4. **Efficient**: Compound key (`corporateId_productId`) ensures fast lookups
5. **Maintainable**: Clear separation between general settings and product settings

---

## Common Operations

### Operation: Lock Product Selection Tab for a Corporate
```javascript
// Query for existing settings
const q = query(
  collection(db, 'corporateSettings'),
  where('corporateId', '==', corporateId)
);
const snapshot = await getDocs(q);

if (snapshot.empty) {
  // Create new settings
  await addDoc(collection(db, 'corporateSettings'), {
    corporateId: corporateId,
    productSelectionLocked: true,  // ← Lock it
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
} else {
  // Update existing settings
  await updateDoc(snapshot.docs[0].ref, {
    productSelectionLocked: true,  // ← Lock it
    updatedAt: new Date().toISOString()
  });
}
```

### Operation: Lock Individual Product
```javascript
const docId = `${corporateId}_${productId}`;
await setDoc(
  doc(db, 'corporateProductSettings', docId),
  {
    corporateId: corporateId,
    productId: productId,
    customPrice: null,  // or set a custom price
    isLocked: true,     // ← Lock the product
    updatedAt: Timestamp.now(),
    createdAt: Timestamp.now()
  },
  { merge: true }
);
```

### Operation: Set Custom Price (Without Locking)
```javascript
const docId = `${corporateId}_${productId}`;
await setDoc(
  doc(db, 'corporateProductSettings', docId),
  {
    corporateId: corporateId,
    productId: productId,
    customPrice: 150,    // ← Custom price
    isLocked: false,     // ← Not locked
    updatedAt: Timestamp.now(),
    createdAt: Timestamp.now()
  },
  { merge: true }
);
```

---

## Testing Checklist

- [ ] Admin can lock/unlock Products tab for a corporate
- [ ] When tab is locked, corporate cannot see Products tab
- [ ] Admin can lock individual products
- [ ] Locked products don't appear in corporate's product list
- [ ] Admin can set custom prices
- [ ] Custom prices display correctly in corporate dashboard
- [ ] Lock + custom price work together correctly
- [ ] Settings persist after page refresh
- [ ] Multiple corporates have independent settings

---

## Performance Notes

**Optimized Queries**: All queries filter by `corporateId` to only load relevant data
```javascript
where('corporateId', '==', currentUser.uid)
```

**Indexes Needed** (Create in Firebase Console):
- Collection: `corporateProductSettings`
  - Index: `corporateId` (Ascending) + `isLocked` (Ascending)
- Collection: `corporateSettings`
  - Index: `corporateId` (Ascending)

**Why It Matters**: Without indexes, queries with multiple conditions are slow. Firestore will prompt you to create them automatically when needed.
