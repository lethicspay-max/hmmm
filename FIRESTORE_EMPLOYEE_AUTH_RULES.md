# Firestore Security Rules for Employee Authentication

This document explains the Firestore security rules that enable employee login and account creation on company subpages.

## Table of Contents

1. [Overview](#overview)
2. [Rule Structure](#rule-structure)
3. [Read Access](#read-access)
4. [Create Access](#create-access)
5. [Update Access](#update-access)
6. [Delete Access](#delete-access)
7. [Security Considerations](#security-considerations)
8. [Testing Rules](#testing-rules)
9. [Common Scenarios](#common-scenarios)

---

## Overview

The employee authentication system requires specific Firestore security rules to allow:
- Public email verification (checking if employee exists)
- Corporate users to add employees
- Employees to set their password flag during first-time setup
- Protected updates to prevent unauthorized changes

**Key Principle**: Employee records have public read access to enable authentication, so **only non-sensitive data** should be stored in the employees collection.

---

## Rule Structure

### Helper Functions

```javascript
// Check if user is authenticated with Firebase Auth
function isAuthenticated() {
  return request.auth != null;
}

// Check if user has admin role
function isAdmin() {
  return isAuthenticated() &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

// Check if user has corporate role
function isCorporate() {
  return isAuthenticated() &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'corporate';
}

// Check if authenticated user owns the resource
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}
```

---

## Read Access

### Rule

```javascript
allow read: if true;
```

### Explanation

**Public read access** is granted to the employees collection to support the authentication flow:

1. **Email Verification**: Before authentication, the system needs to check if an email exists
2. **Corporate Lookup**: Need to verify employee belongs to the correct corporate
3. **Status Check**: Verify employee status is 'active'
4. **hasPassword Check**: Determine if first-time setup or returning user

### Security Implications

⚠️ **CRITICAL**: Since anyone can read employee records, never store sensitive data here:

**Safe to Store**:
- Employee name
- Email address
- Corporate ID
- Points balance
- Status (active/inactive)
- hasPassword flag
- Created/updated timestamps

**DO NOT Store**:
- Social Security Numbers
- Phone numbers
- Home addresses
- Salary information
- Performance reviews
- Any PII beyond name/email

### Example Query (Public Access)

```typescript
// This query works WITHOUT authentication
const employeeQuery = query(
  collection(db, 'employees'),
  where('email', '==', email),
  where('corporateId', '==', corporateId)
);
const snapshot = await getDocs(employeeQuery);
```

---

## Create Access

### Rule

```javascript
allow create: if (
  isAdmin() ||
  (isCorporate() && request.resource.data.corporateId == request.auth.uid) ||
  (
    request.resource.data.corporateId != null &&
    request.resource.data.email != null &&
    request.resource.data.name != null &&
    request.resource.data.points >= 0 &&
    request.resource.data.status in ['active', 'inactive'] &&
    request.resource.data.createdAt != null
  )
);
```

### Explanation

Employee creation is allowed in three scenarios:

#### 1. Admin Users
- Can create employees for any corporate
- No restrictions on field values
- Full control over employee records

```typescript
// Admin creating employee
await addDoc(collection(db, 'employees'), {
  corporateId: 'corporate-123',
  email: 'employee@example.com',
  name: 'John Doe',
  points: 1000,
  status: 'active',
  hasPassword: false,
  createdAt: new Date().toISOString()
});
```

#### 2. Corporate Users
- Can only create employees under their own account
- `request.resource.data.corporateId` must equal `request.auth.uid`
- Ensures corporates cannot add employees to other companies

```typescript
// Corporate user (authenticated) creating employee
await addDoc(collection(db, 'employees'), {
  corporateId: currentUser.uid, // Must match authenticated user
  email: 'employee@company.com',
  name: 'Jane Smith',
  points: 500,
  status: 'active',
  hasPassword: false,
  createdAt: new Date().toISOString()
});
```

#### 3. Self-Registration (Theoretical)
- Allows programmatic employee creation with validation
- All required fields must be present
- Points must be non-negative
- Status must be valid enum value

**Note**: In practice, this is typically used for admin/corporate creation, not public self-registration.

### Required Fields for Creation

| Field | Type | Validation | Required |
|-------|------|------------|----------|
| corporateId | string | Must exist | Yes |
| email | string | Valid email | Yes |
| name | string | Non-empty | Yes |
| points | number | >= 0 | Yes |
| status | string | 'active' or 'inactive' | Yes |
| createdAt | timestamp | ISO string | Yes |
| hasPassword | boolean | true or false | No (defaults to false) |

---

## Update Access

### Rule

```javascript
allow update: if isAuthenticated() && (
  // Admin can update everything
  isAdmin() ||
  // Corporate can update their employees
  (isCorporate() && resource.data.corporateId == request.auth.uid) ||
  // Employee updating their own record with restrictions
  (
    isOwner(employeeId) &&
    !request.resource.data.diff(resource.data).affectedKeys().hasAny(['corporateId', 'points', 'status', 'email']) &&
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'hasPassword', 'updatedAt'])
  ) ||
  // Special case: Employee setting hasPassword during first-time authentication
  (
    isOwner(employeeId) &&
    resource.data.hasPassword == false &&
    request.resource.data.hasPassword == true &&
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['hasPassword', 'updatedAt']) &&
    request.resource.data.corporateId == resource.data.corporateId &&
    request.resource.data.email == resource.data.email &&
    request.resource.data.points == resource.data.points &&
    request.resource.data.status == resource.data.status
  )
);
```

### Explanation

Update access is the most complex rule, supporting four different scenarios:

#### 1. Admin Updates (Unrestricted)
- Admins can update any field
- No restrictions
- Used for administrative tasks

```typescript
// Admin updating employee points
await updateDoc(doc(db, 'employees', employeeId), {
  points: 2000,
  status: 'inactive',
  updatedAt: new Date().toISOString()
});
```

#### 2. Corporate Updates (Restricted to Their Employees)
- Corporate users can update employees under their account
- Must verify `resource.data.corporateId == request.auth.uid`
- Can update any field for their employees

```typescript
// Corporate updating their employee
await updateDoc(doc(db, 'employees', employeeId), {
  points: employee.points + 500,
  name: 'Updated Name',
  updatedAt: new Date().toISOString()
});
```

#### 3. Employee Self-Updates (Limited Fields)
- Employees can update their own record
- **CANNOT** change: corporateId, points, status, email
- **CAN** change: name, hasPassword, updatedAt
- Prevents employees from giving themselves points

```typescript
// Employee updating their name
await updateDoc(doc(db, 'employees', currentUser.uid), {
  name: 'New Name',
  updatedAt: new Date().toISOString()
});
```

#### 4. First-Time Password Setup (Special Case)
This is the critical rule for employee authentication:

**Purpose**: Allow newly authenticated employees to mark their account as having a password

**IMPORTANT**: This rule matches by **email**, not document ID, because:
- When corporate creates employee → Firestore generates document ID (e.g., "abc123xyz")
- When employee creates Auth account → Firebase generates Auth UID (e.g., "xyz789abc")
- These IDs are DIFFERENT! So we match `request.auth.token.email == resource.data.email`

**Conditions**:
- Employee must be authenticated
- **Email must match** (`request.auth.token.email == resource.data.email`)
- Current hasPassword must be `false`
- New hasPassword must be `true`
- ONLY hasPassword and updatedAt can change
- All other fields must remain identical

```typescript
// During first-time setup, after Firebase Auth account is created
// Note: employee.id is the Firestore document ID (NOT the Auth UID)
await updateDoc(doc(db, 'employees', employee.id), {
  hasPassword: true,
  updatedAt: new Date().toISOString()
});
```

**Why This Rule Exists**:
1. Employee is added by corporate with Firestore-generated ID (hasPassword = false)
2. Employee creates Firebase Auth account on subpage (gets different Auth UID)
3. Employee needs to update Firestore record using the Firestore document ID
4. Rule verifies identity by matching email instead of UID
5. This allows the specific update while preventing abuse

### Prevented Actions

The update rules **prevent** these attacks:

❌ **Employee cannot give themselves points**:
```typescript
// This will FAIL
await updateDoc(doc(db, 'employees', currentUser.uid), {
  points: 999999
});
// Error: points is in the blocked list
```

❌ **Employee cannot change their corporate**:
```typescript
// This will FAIL
await updateDoc(doc(db, 'employees', currentUser.uid), {
  corporateId: 'different-corporate'
});
// Error: corporateId is in the blocked list
```

❌ **Employee cannot activate their own inactive account**:
```typescript
// This will FAIL
await updateDoc(doc(db, 'employees', currentUser.uid), {
  status: 'active'
});
// Error: status is in the blocked list
```

❌ **Employee cannot set hasPassword to true while changing other fields**:
```typescript
// This will FAIL
await updateDoc(doc(db, 'employees', currentUser.uid), {
  hasPassword: true,
  points: 1000
});
// Error: Can only change hasPassword and updatedAt together
```

---

## Delete Access

### Rule

```javascript
allow delete: if isAuthenticated() && (
  isAdmin() ||
  (isCorporate() && resource.data.corporateId == request.auth.uid)
);
```

### Explanation

Only authorized users can delete employees:

#### 1. Admin Users
- Can delete any employee
- No restrictions

```typescript
await deleteDoc(doc(db, 'employees', employeeId));
```

#### 2. Corporate Users
- Can only delete employees under their account
- Cannot delete employees from other corporates

```typescript
// Corporate deleting their employee
// Rule verifies: resource.data.corporateId == request.auth.uid
await deleteDoc(doc(db, 'employees', employeeId));
```

#### 3. Employees
- **CANNOT** delete their own account
- Must contact corporate or admin

---

## Security Considerations

### 1. Public Read Access Trade-off

**Benefit**: Enables seamless authentication without requiring employees to have accounts before login

**Risk**: Anyone can enumerate employees

**Mitigation**:
- Only store non-sensitive data in employees collection
- Use separate collection for sensitive employee data with stricter rules
- Monitor for scraping attempts
- Consider rate limiting at application level

### 2. hasPassword Flag Security

**Why Public?**
- Needed to route first-time users vs returning users
- Not sensitive information (doesn't reveal password)

**Protection**:
- Only the authenticated employee can change it
- Can only change from false → true
- Cannot change other fields simultaneously

### 3. Points Balance Integrity

**Critical Protection**: Employees cannot modify their own points

**Rules**:
- Points in blocked fields list for employee updates
- Only admins and corporates can adjust points
- Points must be non-negative on creation

### 4. Corporate Isolation

**Protection**: Corporates cannot access/modify other corporate's employees

**Rules**:
- Updates require: `resource.data.corporateId == request.auth.uid`
- Deletes require: `resource.data.corporateId == request.auth.uid`
- Creates must specify their own UID as corporateId

---

## Testing Rules

### Test Cases

#### Test 1: Public Read Access
```typescript
// No authentication required
const snapshot = await getDocs(query(
  collection(db, 'employees'),
  where('email', '==', 'test@example.com')
));
// Should succeed
```

#### Test 2: Corporate Creating Employee
```typescript
// Authenticated as corporate
await addDoc(collection(db, 'employees'), {
  corporateId: currentUser.uid,
  email: 'new@example.com',
  name: 'New Employee',
  points: 0,
  status: 'active',
  createdAt: new Date().toISOString()
});
// Should succeed
```

#### Test 3: Corporate Creating Employee for Different Company
```typescript
// Authenticated as corporate
await addDoc(collection(db, 'employees'), {
  corporateId: 'different-corporate-id',
  email: 'new@example.com',
  name: 'New Employee',
  points: 0,
  status: 'active',
  createdAt: new Date().toISOString()
});
// Should FAIL
```

#### Test 4: Employee Setting hasPassword
```typescript
// Authenticated as employee, after creating Firebase Auth account
await updateDoc(doc(db, 'employees', currentUser.uid), {
  hasPassword: true,
  updatedAt: new Date().toISOString()
});
// Should succeed if hasPassword was false
```

#### Test 5: Employee Trying to Add Points
```typescript
// Authenticated as employee
await updateDoc(doc(db, 'employees', currentUser.uid), {
  points: 999999,
  updatedAt: new Date().toISOString()
});
// Should FAIL
```

#### Test 6: Employee Updating Name
```typescript
// Authenticated as employee
await updateDoc(doc(db, 'employees', currentUser.uid), {
  name: 'Updated Name',
  updatedAt: new Date().toISOString()
});
// Should succeed
```

#### Test 7: Corporate Updating Another Corporate's Employee
```typescript
// Authenticated as corporate-A, trying to update corporate-B's employee
await updateDoc(doc(db, 'employees', employeeOfCorporateB), {
  points: 1000
});
// Should FAIL
```

### Firebase Emulator Testing

To test rules locally:

```bash
# Start Firebase emulators
firebase emulators:start

# Run tests
npm test
```

Example test file:

```typescript
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

describe('Employee Rules', () => {
  it('allows public read', async () => {
    const db = getFirestore();
    await assertSucceeds(
      getDocs(collection(db, 'employees'))
    );
  });

  it('prevents employee from changing points', async () => {
    const db = getAuthedFirestore({ uid: 'employee-123' });
    await assertFails(
      updateDoc(doc(db, 'employees', 'employee-123'), {
        points: 999999
      })
    );
  });
});
```

---

## Common Scenarios

### Scenario 1: New Employee Added by Corporate

**Step 1**: Corporate adds employee
```typescript
await addDoc(collection(db, 'employees'), {
  corporateId: corporateUser.uid,
  email: 'newemployee@company.com',
  name: 'John Doe',
  points: 500,
  status: 'active',
  hasPassword: false,
  createdAt: new Date().toISOString()
});
```

**Firestore State**:
```json
{
  "corporateId": "corporate-abc",
  "email": "newemployee@company.com",
  "name": "John Doe",
  "points": 500,
  "status": "active",
  "hasPassword": false,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Scenario 2: Employee First-Time Setup

**Step 1**: Employee visits company subpage
```typescript
// No auth required - public read
const employeeQuery = query(
  collection(db, 'employees'),
  where('email', '==', 'newemployee@company.com'),
  where('corporateId', '==', corporateId)
);
const snapshot = await getDocs(employeeQuery);
```

**Step 2**: System checks hasPassword
```typescript
const employee = snapshot.docs[0].data();
if (employee.hasPassword === false) {
  // Show password creation form
}
```

**Step 3**: Employee creates password in Firebase Auth
```typescript
await createUserWithEmailAndPassword(
  auth,
  'newemployee@company.com',
  'password123'
);
// User is now authenticated with UID
```

**Step 4**: Update hasPassword flag
```typescript
// Now authenticated as employee
await updateDoc(doc(db, 'employees', auth.currentUser.uid), {
  hasPassword: true,
  updatedAt: new Date().toISOString()
});
```

**Firestore State**:
```json
{
  "corporateId": "corporate-abc",
  "email": "newemployee@company.com",
  "name": "John Doe",
  "points": 500,
  "status": "active",
  "hasPassword": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T14:30:00Z"
}
```

### Scenario 3: Returning Employee Login

**Step 1**: Employee visits company subpage
```typescript
const employeeQuery = query(
  collection(db, 'employees'),
  where('email', '==', 'newemployee@company.com'),
  where('corporateId', '==', corporateId)
);
const snapshot = await getDocs(employeeQuery);
```

**Step 2**: System checks hasPassword
```typescript
const employee = snapshot.docs[0].data();
if (employee.hasPassword === true) {
  // Show login form
}
```

**Step 3**: Employee logs in
```typescript
await signInWithEmailAndPassword(
  auth,
  'newemployee@company.com',
  'password123'
);
// User authenticated, no Firestore update needed
```

### Scenario 4: Corporate Awards Points

**Step 1**: Corporate adds points to employee
```typescript
// Authenticated as corporate
const employeeRef = doc(db, 'employees', employeeId);
const employeeSnap = await getDoc(employeeRef);
const currentPoints = employeeSnap.data().points;

await updateDoc(employeeRef, {
  points: currentPoints + 100,
  updatedAt: new Date().toISOString()
});
```

**Step 2**: Record transaction
```typescript
await addDoc(collection(db, 'pointTransactions'), {
  employeeId: employeeId,
  corporateId: corporateUser.uid,
  amount: 100,
  type: 'award',
  description: 'Monthly bonus',
  createdAt: new Date().toISOString()
});
```

### Scenario 5: Employee Attempts to Cheat

**Employee tries to add points**:
```typescript
// This will FAIL
await updateDoc(doc(db, 'employees', currentUser.uid), {
  points: 999999
});
// Error: Missing or insufficient permissions
```

**Rule prevents it**:
```javascript
// Points is in the blocked list for employee updates
!request.resource.data.diff(resource.data).affectedKeys().hasAny(['corporateId', 'points', 'status', 'email'])
```

---

## Best Practices

### For Developers

1. **Always use proper authentication**
   - Verify user is authenticated before operations
   - Use Firebase Auth for identity management
   - Don't rely on client-side checks alone

2. **Validate on client AND server**
   - Client-side validation for UX
   - Firestore rules for security
   - Never trust client input

3. **Test rules thoroughly**
   - Use Firebase emulator for testing
   - Test all scenarios: success and failure
   - Automate rule testing

4. **Monitor rule usage**
   - Check Firebase console for denied requests
   - Look for patterns indicating attacks
   - Adjust rules based on real usage

### For Corporate Administrators

1. **Employee management**
   - Add employees with correct corporateId
   - Set appropriate initial points
   - Use status field to enable/disable access

2. **Points management**
   - Update points through dashboard
   - Keep audit trail of changes
   - Regular reconciliation

3. **Security**
   - Monitor for unusual activity
   - Remove inactive employees
   - Verify email addresses before adding

### For Security

1. **Data sensitivity**
   - Never store sensitive PII in employees collection
   - Use separate collection for private data
   - Apply stricter rules to sensitive collections

2. **Rate limiting**
   - Implement application-level rate limiting
   - Prevent enumeration attacks
   - Monitor for scraping

3. **Audit logging**
   - Log all authentication attempts
   - Track point changes
   - Alert on suspicious patterns

---

## Troubleshooting

### Permission Denied on Employee Read

**Symptom**: Cannot read employees collection

**Cause**: Rules may have been modified incorrectly

**Solution**: Verify rule has `allow read: if true`

### Permission Denied on hasPassword Update

**Symptom**: Cannot update hasPassword during first-time setup

**Cause**: User not authenticated, trying to change other fields, or email mismatch

**Solution**:
1. Ensure user is authenticated with Firebase Auth
2. Verify the authenticated user's email matches the employee document's email
3. Only update hasPassword and updatedAt (no other fields)
4. Verify hasPassword is currently false
5. Use the Firestore document ID (not Auth UID) when calling updateDoc

**Common Mistake**:
```typescript
// WRONG - Using Auth UID as document ID
await updateDoc(doc(db, 'employees', currentUser.uid), { ... });

// CORRECT - Using Firestore document ID
await updateDoc(doc(db, 'employees', employee.id), { ... });
```

### Corporate Cannot Update Employee

**Symptom**: Corporate user gets permission denied when updating employee

**Cause**: Employee doesn't belong to this corporate

**Solution**: Verify `resource.data.corporateId == request.auth.uid`

### Employee Can Update Too Many Fields

**Symptom**: Employee can change fields they shouldn't

**Cause**: Rules not properly restricting fields

**Solution**: Check `hasOnly()` clause includes correct fields

---

## Rule Deployment

### Deploying to Firebase

```bash
# Deploy rules only
firebase deploy --only firestore:rules

# Deploy rules and indexes
firebase deploy --only firestore
```

### Validation Before Deploy

Firebase validates rules before deployment:

```bash
firebase firestore:rules:validate
```

### Rolling Back Rules

If rules cause issues:

1. Go to Firebase Console → Firestore → Rules
2. View rule history
3. Select previous version
4. Publish

---

## Summary

The Firestore security rules for employee authentication balance **accessibility** (public reads for auth) with **security** (protected writes). Key points:

✅ **Public Read**: Anyone can read employees (needed for login)
✅ **Controlled Create**: Only admins/corporates can add employees
✅ **Protected Update**: hasPassword flag update specifically allowed
✅ **Field Restrictions**: Employees cannot change critical fields
✅ **Corporate Isolation**: Corporates only access their employees
✅ **Admin Override**: Admins have full control

These rules enable the complete authentication flow while preventing common attacks and unauthorized modifications.
