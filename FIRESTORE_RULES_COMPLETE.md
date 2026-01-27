# Complete Firestore Security Rules Documentation

## Overview

This document provides a comprehensive explanation of all Firestore security rules and the operations they support across the entire application.

---

## Collections and Security Rules

### 1. Users Collection (`/users/{userId}`)

**Purpose**: Stores admin and corporate user profiles

**Read Access**:
- ✅ Anyone can read corporate users (needed for public company pages)
- ✅ Authenticated users can read their own profile
- ✅ Admins can read any profile

**Create Access**:
- ✅ Admins can create any user profile
- ✅ Authenticated users can create their own profile during registration (role must be 'corporate')

**Update Access**:
- ✅ Admins can update any field for any user
- ✅ Users can update their own profile (except `role` and `status` fields)
- ✅ Authenticated users can update corporate statistics (`totalOrders`, `totalOrderValue`, `lastOrderDate`, `updatedAt`)
  - Only for users with `role == 'corporate'`
  - Statistics can only increase (never decrease)
  - Used during employee order placement

**Delete Access**:
- ✅ Only admins can delete users

**Used By**:
- `AuthContext.tsx`: Creating user profiles during registration (line 63)
- `AdminDashboard.tsx`: Updating corporate status, deleting corporates
- `CorporateDashboard.tsx`: Updating own profile (line 1979)
- `CompanySubPage.tsx`: Reading corporate data, updating order statistics (line 947-961)
- `CorporateProductCustomization.tsx`: Reading corporate users

**Security Notes**:
- Corporate users are publicly readable for company subpages
- Statistics updates have validation to prevent manipulation
- Role and status changes are admin-only

---

### 2. Products Collection (`/products/{productId}`)

**Purpose**: Stores product catalog

**Read Access**:
- ✅ Anyone can read products (public catalog)

**Create Access**:
- ✅ Only admins can create products

**Update Access**:
- ✅ Admins can update all fields
- ✅ Authenticated users can ONLY decrease stock (during order placement)
  - Only the `stock` field can be changed
  - Stock must decrease or stay the same (never increase)
  - Stock cannot be negative

**Delete Access**:
- ✅ Only admins can delete products

**Used By**:
- `AdminDashboard.tsx`: CRUD operations (lines 339, 370, 397)
- `CorporateDashboard.tsx`: Reading products (line 193)
- `CompanySubPage.tsx`: Reading products, decreasing stock during orders (line 935)
- `CorporateProductCustomization.tsx`: Reading products

**Security Notes**:
- Stock updates by employees are restricted to decrease-only
- Prevents employees from increasing stock or changing other product fields
- Validation ensures stock cannot go negative

---

### 3. Employees Collection (`/employees/{employeeId}`)

**Purpose**: Stores employee records for company subpages

**Read Access**:
- ✅ Anyone can read employees (needed for authentication on company subpages)
- ⚠️ **Security Warning**: Only non-sensitive data should be stored

**Create Access**:
- ✅ Admins can create employees
- ✅ Corporates can create employees under their account (`corporateId == request.auth.uid`)
- ✅ Self-registration with validation:
  - Must have `corporateId`, `email`, `name`
  - Points must be >= 0
  - Status must be 'active' or 'inactive'
  - Must have `createdAt` timestamp

**Update Access**:
- ✅ Admins can update any field
- ✅ Corporates can update their own employees
- ✅ Employees can update limited fields (`name`, `hasPassword`, `updatedAt`)
  - Matched by email (not document ID)
  - Cannot change `corporateId`, `points`, `status`, `email`
- ✅ Employees can set `hasPassword` from false to true (first-time setup)
- ✅ Employees can decrease their points (order placement)
  - Points must decrease (not increase)
  - Points must remain >= 0
  - Only `points` and `updatedAt` can change

**Delete Access**:
- ✅ Admins can delete employees
- ✅ Corporates can delete their own employees

**Used By**:
- `CorporateDashboard.tsx`: CRUD operations, bulk import, point management (lines 454, 559, 626, 752, 779)
- `CompanySubPage.tsx`: Reading employees for auth, creating employees (self-registration), updating hasPassword, decreasing points (lines 563, 577, 591, 940)
- `AdminDashboard.tsx`: Reading employees

**Security Notes**:
- Public read access for authentication purposes
- Email-based matching for employee operations (doc ID ≠ Auth UID)
- Point updates are strictly controlled (decrease-only)
- First-time password setup has special validation

---

### 4. Orders Collection (`/orders/{orderId}`)

**Purpose**: Stores product orders placed by employees

**Read Access**:
- ✅ Admins can read all orders
- ✅ Corporates can read orders from their employees (`corporateId` match)
- ✅ Employees can read their own orders (email match via `isEmployeeOwner`)

**Create Access**:
- ✅ Admins can create orders
- ✅ Employees can create orders for themselves (email match via `isEmployeeOwner`)

**Update Access**:
- ✅ Only admins can update orders (status changes, tracking numbers, etc.)

**Delete Access**:
- ✅ Only admins can delete orders

**Used By**:
- `AdminDashboard.tsx`: Reading all orders, updating status, updating tracking (lines 195, 435, 557, 579)
- `CorporateDashboard.tsx`: Reading corporate's employee orders (line 205)
- `CompanySubPage.tsx`: Reading employee orders, creating new orders (lines 339, 351, 364, 898)

**Required Fields**:
- `employeeId`: Firestore document ID
- `employeeEmail`: **Required** for authentication (email matching)
- `corporateId`, `corporateName`, `employeeName`
- `products`, `totalPoints`, `status`, `createdAt`

**Security Notes**:
- Email-based matching for employee access
- Only admins can change order status
- Employees can only view/create, not modify

---

### 5. Tickets Collection (`/tickets/{ticketId}`)

**Purpose**: Stores support tickets raised by employees

**Read Access**:
- ✅ Admins can read all tickets
- ✅ Corporates can read tickets from their employees (`corporateId` match)
- ✅ Employees can read their own tickets (email match via `isEmployeeOwner`)

**Create Access**:
- ✅ Anyone authenticated can create tickets

**Update Access**:
- ✅ Admins can update any field
- ✅ Employees can update their own tickets (email match)
  - Cannot change `status` or `createdAt`
  - Can update description, priority, subject, etc.

**Delete Access**:
- ✅ Only admins can delete tickets

**Used By**:
- `AdminDashboard.tsx`: Reading all tickets, updating status, adding responses (lines 227, 499, 538)
- `CorporateDashboard.tsx`: Reading corporate's employee tickets (line 218)
- `CompanySubPage.tsx`: Creating tickets (line 1018)

**Required Fields**:
- `employeeId`: Firestore document ID
- `employeeEmail`: **Required** for authentication (email matching)
- `corporateId`, `corporateName`, `employeeName`
- `subject`, `category`, `priority`, `description`
- `status`, `createdAt`, `updatedAt`

**Security Notes**:
- Email-based matching for employee access
- Only admins can change ticket status
- Employees can update descriptions but not status

---

### 6. Point Transactions Collection (`/pointTransactions/{transactionId}`)

**Purpose**: Stores history of point allocations and adjustments

**Read Access**:
- ✅ Admins can read all transactions
- ✅ Corporates can read transactions for their employees (`corporateId` match)
- ✅ Employees can read their own transaction history (email match via `isEmployeeOwner`)

**Create Access**:
- ✅ Admins can create transactions
- ✅ Corporates can create transactions for their employees (`corporateId == request.auth.uid`)

**Update Access**:
- ✅ Only admins can update transactions

**Delete Access**:
- ✅ Only admins can delete transactions

**Used By**:
- `AdminDashboard.tsx`: Creating point transactions (line 468)
- `CorporateDashboard.tsx`: Creating point transactions, reading transaction history (lines 475, 577, 632, 799, 2312, 2323)

**Required Fields**:
- `employeeEmail`: **Required** for employee transactions (email matching)
- `corporateId`: Required
- `amount`, `type` (credit/debit), `reason`
- `createdAt`

**Security Notes**:
- Email-based matching for employee access
- Only admins and corporates can create transactions
- Employees can only view their history (read-only)

---

### 7. Corporate Settings Collection (`/corporateSettings/{settingId}`)

**Purpose**: Stores company branding, product selection, and configuration

**Read Access**:
- ✅ Anyone can read settings (needed for public company pages and employee branding)

**Create Access**:
- ✅ Admins can create settings for any corporate
- ✅ Corporates can create their own settings (`corporateId == request.auth.uid`)

**Update Access**:
- ✅ Admins can update any settings
- ✅ Corporates can update their own settings
  - Must match both resource and request `corporateId`

**Delete Access**:
- ✅ Only admins can delete settings

**Used By**:
- `CorporateDashboard.tsx`: Creating/updating branding, product selection (lines 681-693, 2183-2198)
- `CompanySubPage.tsx`: Reading corporate branding (lines 426, 467)
- `CorporateProductCustomization.tsx`: Admin managing product selection lock (lines 220, 226)

**Fields**:
- `corporateId`: Required
- `branding`: Logo, colors, banner, description
- `selectedProducts`: Array of selected product IDs
- `productSelectionLocked`: Boolean
- `updatedAt`, `createdAt`

**Security Notes**:
- Public read for employee branding visibility
- Corporates can only modify their own settings
- Admins have full control

---

### 8. Corporate Product Settings Collection (`/corporateProductSettings/{settingId}`)

**Purpose**: Stores custom pricing and product configurations per corporate

**Read Access**:
- ✅ Anyone can read product settings (needed for custom pricing on company pages)

**Create Access**:
- ✅ Only admins can create product settings

**Update Access**:
- ✅ Only admins can update product settings

**Delete Access**:
- ✅ Only admins can delete product settings

**Used By**:
- `CorporateDashboard.tsx`: Reading and updating custom prices (line 270, 724)
- `CompanySubPage.tsx`: Reading custom product pricing (line 513)
- `CorporateProductCustomization.tsx`: Admin managing custom pricing (line 125)

**Fields**:
- `corporateId`: Required
- `productId`: Required
- `customPrice`: Number or null
- `isLocked`: Boolean
- `selectedByCorporate`: Boolean
- `createdAt`, `updatedAt`

**Security Notes**:
- Public read for custom pricing visibility
- Only admins can modify pricing (prevents corporate manipulation)

---

### 9. Contact Submissions Collection (`/contactSubmissions/{submissionId}`)

**Purpose**: Stores contact form submissions from website visitors

**Read Access**:
- ✅ Only admins can read contact submissions

**Create Access**:
- ✅ Anyone can create contact submissions (public contact form)

**Update Access**:
- ✅ Only admins can update submissions (status changes)

**Delete Access**:
- ✅ Only admins can delete submissions

**Used By**:
- `ContactPage.tsx`: Creating contact submissions (line 29)
- `AdminDashboard.tsx`: Reading and updating contact submissions (lines 218, 490)

**Fields**:
- `name`, `email`, `phone`, `message`
- `status`: 'new', 'read', 'responded', 'resolved'
- `createdAt`

**Security Notes**:
- Public create for contact form functionality
- Only admins can view and manage submissions
- Prevents privacy breaches

---

## Helper Functions

### `isAuthenticated()`
Returns true if `request.auth != null`

### `isAdmin()`
Returns true if user is authenticated AND has `role == 'admin'` in `/users/{uid}`

### `isCorporate()`
Returns true if user is authenticated AND has `role == 'corporate'` in `/users/{uid}`

### `isOwner(userId)`
Returns true if user is authenticated AND their UID matches the provided `userId`

### `isEmployeeOwner(resourceEmployeeEmail)`
**Critical for employee authentication!**

Returns true if:
- User is authenticated
- User's email from Auth token is not null
- User's email matches the resource's `employeeEmail` field

**Why this exists**: Employee Firestore document IDs don't match their Firebase Auth UIDs. When a corporate creates an employee, Firestore generates a document ID. Later when that employee authenticates, Firebase generates a different Auth UID. This helper matches by email instead of document ID.

---

## Security Best Practices Implemented

### 1. Principle of Least Privilege
- Users can only access data they own or are authorized to view
- Role-based access control (admin, corporate, employee)
- Field-level restrictions on updates

### 2. Data Validation
- Point updates must decrease (employees spending)
- Stock updates must decrease (order placement)
- Statistics updates must increase (order tracking)
- Required fields validation

### 3. Public Read Access (Intentional)
Collections with public read access:
- `products`: Product catalog visibility
- `corporateSettings`: Company branding visibility
- `corporateProductSettings`: Custom pricing visibility
- `employees`: Email verification during authentication
- `users` (corporate only): Company page visibility

**Security Note**: No sensitive data should be stored in publicly readable collections.

### 4. Email-Based Authentication
For employee operations (orders, tickets, transactions), authentication uses email matching instead of document ID matching. This is necessary because:
- Firestore document ID (assigned by corporate) ≠ Firebase Auth UID (assigned during registration)
- Email is verified during Firebase Auth account creation
- Email comes from server-verified Auth token (cannot be spoofed)

### 5. Audit Trail
All write operations require:
- `createdAt` timestamp on creation
- `updatedAt` timestamp on updates
- User authentication for traceability

### 6. Immutable Fields
Certain fields cannot be changed by non-admin users:
- `role` (users collection)
- `status` (users, employees, orders, tickets)
- `corporateId` (employees)
- `email` (employees)
- `createdAt` (all collections)

---

## Operation Matrix

| Collection | Read | Create | Update | Delete |
|-----------|------|--------|--------|--------|
| **users** | Public (corporate)<br>Self<br>Admin (all) | Self (corporate)<br>Admin (all) | Self (limited)<br>Admin (all)<br>Auth (stats only) | Admin |
| **products** | Public | Admin | Admin<br>Auth (stock only) | Admin |
| **employees** | Public | Admin<br>Corporate (own)<br>Self-registration | Admin<br>Corporate (own)<br>Self (limited)<br>Self (points decrease) | Admin<br>Corporate (own) |
| **orders** | Admin (all)<br>Corporate (own employees)<br>Employee (self) | Admin<br>Employee (self) | Admin | Admin |
| **tickets** | Admin (all)<br>Corporate (own employees)<br>Employee (self) | Auth | Admin<br>Employee (self, limited) | Admin |
| **pointTransactions** | Admin (all)<br>Corporate (own employees)<br>Employee (self) | Admin<br>Corporate | Admin | Admin |
| **corporateSettings** | Public | Admin<br>Corporate (own) | Admin<br>Corporate (own) | Admin |
| **corporateProductSettings** | Public | Admin | Admin | Admin |
| **contactSubmissions** | Admin | Public | Admin | Admin |

---

## Testing Checklist

### Admin Operations
- [ ] Can create/read/update/delete all collections
- [ ] Can manage products (CRUD)
- [ ] Can update order status
- [ ] Can update ticket status
- [ ] Can create point transactions
- [ ] Can manage corporate accounts
- [ ] Can view contact submissions

### Corporate Operations
- [ ] Can create employees under their account
- [ ] Can update their own employees
- [ ] Can delete their own employees
- [ ] Can create point transactions for employees
- [ ] Can view orders from their employees
- [ ] Can view tickets from their employees
- [ ] Can create/update their own settings
- [ ] Cannot access other corporates' data

### Employee Operations
- [ ] Can view products
- [ ] Can create orders
- [ ] Can view their own orders
- [ ] Can decrease their points during order
- [ ] Can update product stock (decrease only) during order
- [ ] Can create tickets
- [ ] Can view their own tickets
- [ ] Can update ticket descriptions
- [ ] Can view point transaction history
- [ ] Cannot view other employees' data
- [ ] Cannot increase their own points
- [ ] Cannot change order/ticket status

### Public Access
- [ ] Can view products
- [ ] Can view corporate users
- [ ] Can view corporate settings
- [ ] Can view corporate product settings
- [ ] Can view employee records (for auth)
- [ ] Can submit contact form
- [ ] Cannot read orders, tickets, or transactions

---

## Common Errors and Solutions

### Error: "Missing or insufficient permissions" on Order Creation
**Cause**: Order document missing `employeeEmail` field

**Solution**: Ensure order includes:
```typescript
await addDoc(collection(db, 'orders'), {
  employeeEmail: employee.email,  // Required!
  // ... other fields
});
```

### Error: "Missing or insufficient permissions" on Point Deduction
**Cause**: Trying to increase points or change other fields

**Solution**: Only update points (decrease) and updatedAt:
```typescript
await updateDoc(doc(db, 'employees', employee.id), {
  points: employee.points - amount,  // Must decrease
  updatedAt: new Date().toISOString()
});
```

### Error: "Missing or insufficient permissions" on Product Stock Update
**Cause**: Trying to increase stock or change other fields

**Solution**: Only update stock (decrease):
```typescript
await updateDoc(productRef, {
  stock: currentStock - quantity  // Must decrease
});
```

### Error: "Missing or insufficient permissions" on Corporate Settings
**Cause**: Corporate trying to update settings with wrong corporateId

**Solution**: Ensure corporateId matches auth UID:
```typescript
await addDoc(collection(db, 'corporateSettings'), {
  corporateId: currentUser.uid,  // Must match auth UID
  // ... other fields
});
```

### Error: Employee Can't View Orders
**Cause**: Order missing `employeeEmail` field

**Solution**: All orders must include:
```typescript
{
  employeeEmail: employee.email,  // Required for access control
  // ... other fields
}
```

---

## Architecture Notes

### Client-Side Updates vs. Server-Side
Several operations are performed client-side that would ideally be server-side:

1. **Product stock updates**: Currently done client-side during order placement
   - **Risk**: Race conditions with concurrent orders
   - **Mitigation**: Rules enforce decrease-only, validation prevents negative stock
   - **Ideal**: Cloud Function triggered on order creation

2. **Corporate statistics updates**: Currently done client-side during order placement
   - **Risk**: Potential manipulation if auth token compromised
   - **Mitigation**: Rules enforce increase-only, specific field restrictions
   - **Ideal**: Cloud Function triggered on order creation

3. **Point transactions**: Currently created manually by admin/corporate
   - **Risk**: Manual process, no automatic tracking
   - **Ideal**: Automatically created when points change

### Email-Based Authentication
Employee authentication uses email matching instead of UID matching:

**Why**: Firestore doc ID (created by corporate) ≠ Firebase Auth UID (created during registration)

**Flow**:
1. Corporate creates employee → Firestore generates doc ID "abc123"
2. Employee registers → Firebase generates Auth UID "xyz789"
3. IDs don't match, so we match by email instead

**Security**: Email is verified during Firebase Auth creation and comes from server-verified token (cannot be spoofed)

---

## Deployment

To deploy these rules to Firebase:

```bash
# Test rules locally (recommended)
firebase emulators:start --only firestore

# Validate rules syntax
firebase firestore:rules:validate

# Deploy rules only
firebase deploy --only firestore:rules

# Deploy everything
firebase deploy
```

---

## Version History

**v3.0 (2026-01-27)**: Complete rules coverage
- Added support for product stock updates by employees
- Added support for corporate statistics updates
- Added corporate settings write access for corporates
- Comprehensive documentation of all operations

**v2.0 (2026-01-27)**: Employee functionality
- Added email-based authentication
- Added employee point spending rules
- Added order/ticket/transaction access for employees

**v1.0**: Initial rules
- Basic admin and corporate access control
- Public read access for company pages

---

**Last Updated**: 2026-01-27
**Status**: Production Ready
**Coverage**: All application operations supported
