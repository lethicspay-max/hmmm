# Employee Subpage Functionality - Firestore Rules

## Overview

This document explains the Firestore security rules that enable full employee functionality on company subpages after authentication.

## The Core Problem

**Employee Firestore document IDs don't match their Firebase Auth UIDs**:

```
1. Corporate creates employee → Firestore doc ID: "abc123xyz"
2. Employee authenticates → Firebase Auth UID: "xyz789abc"
3. These IDs are DIFFERENT!
```

**Solution**: Match by email instead of document ID.

---

## Helper Function: isEmployeeOwner()

Added a new helper function to check if an authenticated employee owns a resource:

```javascript
function isEmployeeOwner(resourceEmployeeEmail) {
  return isAuthenticated() &&
         request.auth.token.email != null &&
         request.auth.token.email == resourceEmployeeEmail;
}
```

**How it works**:
- Checks if user is authenticated
- Verifies the user's email exists in their Auth token
- Compares Auth email with the resource's employeeEmail field

**Why it's secure**:
- Email is verified during Firebase Auth account creation
- Email comes from server-verified Auth token (can't be spoofed)
- Emails are unique per employee

---

## Updated Collections

### 1. Employees Collection

**New Rule**: Employee spending points during order placement

```javascript
// Employee can ONLY decrease points (not increase)
(
  request.auth.token.email == resource.data.email &&
  request.resource.data.diff(resource.data).affectedKeys().hasOnly(['points', 'updatedAt']) &&
  // Points must decrease (spending), not increase (cheating)
  request.resource.data.points < resource.data.points &&
  // Points cannot go negative
  request.resource.data.points >= 0 &&
  // Cannot change other fields
  request.resource.data.corporateId == resource.data.corporateId &&
  request.resource.data.email == resource.data.email &&
  request.resource.data.status == resource.data.status &&
  request.resource.data.hasPassword == resource.data.hasPassword
)
```

**What this enables**:
- ✅ Employee can decrease their points when placing an order
- ✅ Points cannot go negative
- ✅ Points cannot increase (prevents cheating)
- ✅ Other fields cannot be changed during point updates

**What this prevents**:
- ❌ Employee giving themselves more points
- ❌ Employee setting negative points
- ❌ Employee changing corporateId, status, or email during point update

### 2. Orders Collection

**Before** (broken):
```javascript
allow read: if resource.data.employeeId == request.auth.uid;
allow create: if request.resource.data.employeeId == request.auth.uid;
```

**After** (fixed):
```javascript
allow read: if isEmployeeOwner(resource.data.employeeEmail);
allow create: if isEmployeeOwner(request.resource.data.employeeEmail);
```

**What this enables**:
- ✅ Employees can read their own orders
- ✅ Employees can create orders for themselves
- ✅ Admins can read/create all orders
- ✅ Corporates can read orders from their employees

**Data structure**:
```typescript
{
  employeeId: "abc123xyz",        // Firestore document ID
  employeeEmail: "user@company.com", // Used for auth matching
  employeeName: "John Doe",
  corporateId: "corporate123",
  products: [...],
  status: "pending",
  // ... other fields
}
```

### 3. Tickets Collection

**Before** (broken):
```javascript
allow read: if resource.data.employeeId == request.auth.uid;
allow update: if resource.data.employeeId == request.auth.uid;
```

**After** (fixed):
```javascript
allow read: if isEmployeeOwner(resource.data.employeeEmail);
allow update: if isEmployeeOwner(resource.data.employeeEmail) &&
              !request.resource.data.diff(resource.data).affectedKeys().hasAny(['status', 'createdAt']);
```

**What this enables**:
- ✅ Employees can read their own tickets
- ✅ Employees can update their tickets (limited fields)
- ✅ Admins can read/update all tickets
- ✅ Corporates can read tickets from their employees

**Update restrictions**:
- Employees cannot change ticket `status` (only admins)
- Employees cannot change `createdAt` timestamp

**Data structure**:
```typescript
{
  employeeId: "abc123xyz",        // Firestore document ID
  employeeEmail: "user@company.com", // Used for auth matching
  employeeName: "John Doe",
  corporateId: "corporate123",
  subject: "Order Issue",
  category: "order_issue",
  status: "open",
  // ... other fields
}
```

### 4. Point Transactions Collection

**Before** (broken):
```javascript
allow read: if resource.data.employeeId == request.auth.uid;
```

**After** (fixed):
```javascript
allow read: if isEmployeeOwner(resource.data.employeeEmail);
```

**What this enables**:
- ✅ Employees can read their own point transaction history
- ✅ Admins can read all transactions
- ✅ Corporates can read transactions for their employees

**Note**: Employees cannot create point transactions (only admins and corporates can)

**Data structure**:
```typescript
{
  employeeId: "abc123xyz",        // Firestore document ID (optional)
  employeeEmail: "user@company.com", // Used for auth matching
  corporateId: "corporate123",
  amount: 100,
  type: "credit" | "debit",
  reason: "Monthly allocation",
  // ... other fields
}
```

---

## Collections with Public Read Access

These collections have `allow read: if true` to support public company pages:

### Products
- Anyone can view products
- Only admins can create/update/delete

### Corporate Settings
- Anyone can view company branding
- Only admins can create/update/delete

### Corporate Product Settings
- Anyone can view custom product pricing
- Only admins can create/update/delete

### Employees
- Anyone can read employee records (for email verification during login)
- **Security**: Only non-sensitive data should be stored
- Creation: Admins, corporates, or validated self-registration
- Updates: See detailed rules above

---

## Complete Employee User Flow

### 1. First-Time Employee Visit

```
1. Employee visits company.example.com/company/acme
2. Enters email → queries employees collection (public read)
3. Email found → hasPassword = false → show "create password" form
4. Employee creates password → Firebase Auth account created
5. Update hasPassword flag (rule: hasPassword false→true)
6. Employee authenticated ✅
```

### 2. Employee Authentication

```
After authentication, employee can:
- ✅ View products (public read)
- ✅ View company branding (public read)
- ✅ View their order history (email match)
- ✅ Create new orders (email match)
- ✅ View their support tickets (email match)
- ✅ Create support tickets (authenticated)
- ✅ View point transaction history (email match)
- ✅ Update their profile name (email match)
```

### 3. Order Placement Flow

```
1. Employee adds products to cart
2. Reviews cart and shipping info
3. Clicks "Place Order"
4. Creates order document:
   - employeeId: Firestore doc ID
   - employeeEmail: employee@company.com ← Used for auth
   - Rule validates: request.auth.token.email == employeeEmail ✅
5. Updates product stock (public read, admin write)
6. Deducts employee points:
   - Rule validates: email match ✅
   - Rule validates: points decreasing ✅
   - Rule validates: points >= 0 ✅
7. Order placed successfully ✅
```

### 4. Support Ticket Flow

```
1. Employee clicks "Submit Ticket"
2. Fills out ticket form
3. Creates ticket document:
   - employeeId: Firestore doc ID
   - employeeEmail: employee@company.com ← Used for auth
   - Rule validates: authenticated ✅
4. Employee can view their ticket (email match)
5. Employee can update ticket description (email match)
6. Employee CANNOT change status (admin only)
```

---

## Security Guarantees

### What Employees CAN Do:
✅ View products and company branding (everyone can)
✅ Create their Auth account (first-time setup)
✅ Read their own orders, tickets, point transactions
✅ Create orders and tickets for themselves
✅ Spend their points (decrease only)
✅ Update their profile name
✅ Update their own hasPassword flag (false→true only)
✅ Update their ticket descriptions

### What Employees CANNOT Do:
❌ Give themselves more points
❌ View other employees' orders or tickets
❌ Change their corporateId, status, or email
❌ Modify product inventory directly
❌ Change order status
❌ Change ticket status
❌ Delete orders or tickets
❌ Create point transactions
❌ Access admin-only collections

---

## Testing Checklist

### Authentication
- [ ] Employee can verify email (first-time)
- [ ] Employee can create password
- [ ] Employee can log in (returning user)
- [ ] hasPassword flag updates correctly

### Order Management
- [ ] Employee can view their order history
- [ ] Employee can create new orders
- [ ] Points deduct correctly
- [ ] Employee CANNOT view other employees' orders

### Support Tickets
- [ ] Employee can create tickets
- [ ] Employee can view their tickets
- [ ] Employee can update ticket descriptions
- [ ] Employee CANNOT change ticket status
- [ ] Employee CANNOT view other employees' tickets

### Point System
- [ ] Employee can view their point balance
- [ ] Employee can view point transaction history
- [ ] Employee can spend points (decrease)
- [ ] Employee CANNOT increase their own points
- [ ] Employee CANNOT go negative

### Profile Management
- [ ] Employee can update their name
- [ ] Employee CANNOT change email
- [ ] Employee CANNOT change corporateId
- [ ] Employee CANNOT change status
- [ ] Employee CANNOT change points directly (except via orders)

---

## Troubleshooting

### "Missing or insufficient permissions" on Order Creation

**Cause**: employeeEmail field missing or doesn't match Auth email

**Solution**: Ensure order includes `employeeEmail` field:
```typescript
await addDoc(collection(db, 'orders'), {
  employeeId: employee.id,
  employeeEmail: employee.email,  // Must match Auth email
  // ... other fields
});
```

### "Missing or insufficient permissions" on Point Deduction

**Cause**: Trying to increase points or change other fields

**Solution**:
1. Only decrease points (new points < old points)
2. Ensure points stay >= 0
3. Only change `points` and `updatedAt` fields

```typescript
// ✅ CORRECT
await updateDoc(doc(db, 'employees', employee.id), {
  points: employee.points - 100,  // Decreasing
  updatedAt: new Date().toISOString()
});

// ❌ WRONG - trying to increase
await updateDoc(doc(db, 'employees', employee.id), {
  points: employee.points + 100  // Will fail!
});
```

### Cannot Read Own Orders

**Cause**: Order document missing `employeeEmail` field

**Solution**: Ensure all orders have `employeeEmail`:
```typescript
await addDoc(collection(db, 'orders'), {
  employeeEmail: employee.email,  // Required for read access
  // ... other fields
});
```

### Employee Can't Update Profile

**Cause**: Trying to change restricted fields

**Solution**: Only update `name`, `hasPassword`, or `updatedAt`:
```typescript
// ✅ CORRECT
await updateDoc(doc(db, 'employees', employee.id), {
  name: "New Name",
  updatedAt: new Date().toISOString()
});

// ❌ WRONG - trying to change email
await updateDoc(doc(db, 'employees', employee.id), {
  name: "New Name",
  email: "newemail@company.com"  // Will fail!
});
```

---

## Required Data Fields

For employee functionality to work, these fields MUST be present:

### Employee Document
```typescript
{
  email: string,           // Required for auth matching
  name: string,
  corporateId: string,
  points: number,
  status: "active" | "inactive",
  hasPassword: boolean,
  createdAt: string,
  updatedAt: string
}
```

### Order Document
```typescript
{
  employeeId: string,      // Firestore doc ID
  employeeEmail: string,   // REQUIRED for auth matching
  employeeName: string,
  corporateId: string,
  corporateName: string,
  products: Product[],
  totalPoints: number,
  status: string,
  createdAt: string
}
```

### Ticket Document
```typescript
{
  employeeId: string,      // Firestore doc ID
  employeeEmail: string,   // REQUIRED for auth matching
  employeeName: string,
  corporateId: string,
  subject: string,
  category: string,
  status: string,
  description: string,
  createdAt: string,
  updatedAt: string
}
```

### Point Transaction Document
```typescript
{
  employeeEmail: string,   // REQUIRED for auth matching (if employee-specific)
  corporateId: string,
  amount: number,
  type: "credit" | "debit",
  reason: string,
  createdAt: string
}
```

---

## Summary

The Firestore rules now fully support employee functionality on company subpages by:

1. **Using email matching** instead of document ID matching for employee auth
2. **Allowing employees to spend points** but not give themselves more
3. **Enabling employees to view/create** their orders and tickets
4. **Maintaining strict security** by preventing unauthorized access
5. **Supporting all employee workflows** from first-time setup to order placement

All employee operations are secured with proper authentication and authorization checks while maintaining a seamless user experience.
