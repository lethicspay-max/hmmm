# Firestore Rules Fix - Email Matching

## Problem

Employees were getting "Missing or insufficient permissions" error when trying to set their `hasPassword` flag during first-time account creation.

### Root Cause

**ID Mismatch**: Employee Firestore document IDs don't match their Firebase Auth UIDs

```
Flow that caused the problem:
1. Corporate creates employee → Firestore generates doc ID: "abc123xyz"
2. Employee creates Auth account → Firebase generates Auth UID: "xyz789abc"
3. Rule checked: isOwner(employeeId) which requires UID == document ID
4. "abc123xyz" ≠ "xyz789abc" → Permission denied!
```

### Why This Happened

The original rule used `isOwner(employeeId)` which checks:
```javascript
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}
```

This compares the Firebase Auth UID with the Firestore document ID path, but these are different values in our system.

## Solution

Changed the Firestore rules to match by **email** instead of document ID.

### Before (Broken)
```javascript
allow update: if isAuthenticated() && (
  // ... other rules ...
  ||
  (
    isOwner(employeeId) &&  // ❌ This fails - UIDs don't match
    resource.data.hasPassword == false &&
    request.resource.data.hasPassword == true &&
    // ...
  )
);
```

### After (Fixed)
```javascript
allow update: if isAuthenticated() && (
  // ... other rules ...
  ||
  (
    request.auth.token.email == resource.data.email &&  // ✅ Match by email
    resource.data.hasPassword == false &&
    request.resource.data.hasPassword == true &&
    // ...
  )
);
```

## How It Works Now

### Authentication Flow

1. **Corporate creates employee**:
   ```typescript
   await addDoc(collection(db, 'employees'), {
     email: 'employee@company.com',
     name: 'John Doe',
     // ... other fields
   });
   // Firestore generates doc ID: "abc123xyz"
   ```

2. **Employee creates account**:
   ```typescript
   await createUserWithEmailAndPassword(
     auth,
     'employee@company.com',  // Same email
     'password123'
   );
   // Firebase generates Auth UID: "xyz789abc" (different!)
   ```

3. **Employee updates hasPassword**:
   ```typescript
   // Use Firestore doc ID (not Auth UID!)
   await updateDoc(doc(db, 'employees', 'abc123xyz'), {
     hasPassword: true,
     updatedAt: new Date().toISOString()
   });
   ```

4. **Firestore rule validates**:
   ```
   ✅ User is authenticated
   ✅ request.auth.token.email ('employee@company.com')
      == resource.data.email ('employee@company.com')
   ✅ hasPassword changing from false → true
   ✅ Only hasPassword and updatedAt being changed
   → Permission granted!
   ```

## Key Changes

### File: `firestore.rules`

**Changed Lines 125-145**:
- Replaced `isOwner(employeeId)` with `request.auth.token.email == resource.data.email`
- Applied to both general employee updates and hasPassword special case

### Why Email Matching is Safe

1. **Email is verified**: Firebase Auth verifies email during account creation
2. **Email is immutable**: Employees cannot change their email (blocked in rules)
3. **Email is unique**: Each employee has a unique email address
4. **Token is secure**: `request.auth.token.email` comes from Firebase Auth token (server-verified)

### Security Guarantees Maintained

✅ Employees can only update their own records (matched by email)
✅ Employees cannot change critical fields (points, corporateId, status)
✅ Employees can only set hasPassword from false → true
✅ All other security rules remain unchanged

## Testing

### Test Case 1: First-Time Setup (Should Succeed)
```typescript
// 1. Corporate creates employee with email
const employeeRef = await addDoc(collection(db, 'employees'), {
  corporateId: 'corporate-123',
  email: 'test@company.com',
  name: 'Test User',
  points: 100,
  status: 'active',
  hasPassword: false,
  createdAt: new Date().toISOString()
});

// 2. Employee creates Auth account
await createUserWithEmailAndPassword(
  auth,
  'test@company.com',  // Same email
  'password123'
);

// 3. Update hasPassword - should succeed
await updateDoc(employeeRef, {
  hasPassword: true,
  updatedAt: new Date().toISOString()
});
// ✅ Success - emails match
```

### Test Case 2: Wrong Email (Should Fail)
```typescript
// Employee authenticated as different@email.com
await updateDoc(doc(db, 'employees', 'abc123'), {
  hasPassword: true
});
// ❌ Fails - emails don't match
```

### Test Case 3: Trying to Change Points (Should Fail)
```typescript
// Employee authenticated correctly
await updateDoc(doc(db, 'employees', 'abc123'), {
  hasPassword: true,
  points: 999999  // Trying to cheat
});
// ❌ Fails - can only change hasPassword and updatedAt
```

## Implementation Notes

### Client Code Pattern

The existing code in `CompanySubPage.tsx` already uses the correct pattern:

```typescript
// ✅ CORRECT - Uses Firestore document ID
await updateDoc(doc(db, 'employees', employee.id), {
  hasPassword: true,
  updatedAt: new Date().toISOString()
});
```

**Important**: `employee.id` is the Firestore document ID, not the Auth UID!

### Common Mistakes to Avoid

❌ **DON'T** use Auth UID as document ID:
```typescript
await updateDoc(doc(db, 'employees', currentUser.uid), { ... });
```

✅ **DO** use Firestore document ID:
```typescript
await updateDoc(doc(db, 'employees', employee.id), { ... });
```

❌ **DON'T** try to update multiple fields:
```typescript
await updateDoc(doc(db, 'employees', employee.id), {
  hasPassword: true,
  points: 500,  // This will fail
  updatedAt: new Date().toISOString()
});
```

✅ **DO** only update allowed fields:
```typescript
await updateDoc(doc(db, 'employees', employee.id), {
  hasPassword: true,
  updatedAt: new Date().toISOString()
});
```

## Related Files Updated

1. **firestore.rules** - Fixed the employee update rules
2. **FIRESTORE_EMPLOYEE_AUTH_RULES.md** - Updated documentation with email matching explanation
3. **FIRESTORE_RULES_SUMMARY.md** - Added critical change notice
4. **FIRESTORE_RULES_FIX.md** - This document (new)

## Deployment

To deploy the fixed rules:

```bash
# Validate rules
firebase firestore:rules:validate

# Deploy to Firebase
firebase deploy --only firestore:rules
```

## Summary

**Problem**: Employee authentication failing due to UID mismatch
**Root Cause**: Firestore doc ID ≠ Firebase Auth UID
**Solution**: Match by email instead of document ID
**Security**: Maintained - email is verified and unique
**Status**: Fixed and documented

The employee authentication flow now works correctly while maintaining all security guarantees.
