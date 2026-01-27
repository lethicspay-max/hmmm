# Firestore Rules for Employee Authentication - Summary

## What Was Updated

Enhanced the Firestore security rules in `firestore.rules` to support:
1. Employee login and account creation on company subpages
2. Full employee functionality after authentication (orders, tickets, point management)
3. Email-based authentication matching (since employee Firestore doc ID ≠ Auth UID)

## Key Changes to Employees Collection Rules

### Read Access (Unchanged)
```javascript
allow read: if true;
```
- Public read access required for email verification during login
- Only non-sensitive data should be stored in employees collection

### Create Access (Unchanged)
Employees can be created by:
1. Admin users (unrestricted)
2. Corporate users (for their own account only)
3. Validated self-registration (with required fields)

### Update Access (Enhanced) ⭐
**CRITICAL CHANGE**: Uses email matching instead of document ID matching

Why? Employee Firestore document IDs don't match their Firebase Auth UIDs:
- Corporate creates employee → Firestore generates document ID (e.g., "abc123")
- Employee creates Auth account → Firebase generates Auth UID (e.g., "xyz789")
- These IDs are different! So we match by email instead.

**Added Helper Function**: `isEmployeeOwner()`

```javascript
function isEmployeeOwner(resourceEmployeeEmail) {
  return isAuthenticated() &&
         request.auth.token.email != null &&
         request.auth.token.email == resourceEmployeeEmail;
}
```

This helper checks if an authenticated employee owns a resource by matching their Auth email with the resource's employeeEmail field.

**Rule 1**: First-time password setup:

```javascript
// Special case: Employee setting hasPassword during first-time authentication
// Matches by email since employee's Firestore doc ID != Auth UID
(
  request.auth.token.email == resource.data.email &&
  resource.data.hasPassword == false &&
  request.resource.data.hasPassword == true &&
  request.resource.data.diff(resource.data).affectedKeys().hasOnly(['hasPassword', 'updatedAt']) &&
  // Ensure they cannot change anything else during this operation
  request.resource.data.corporateId == resource.data.corporateId &&
  request.resource.data.email == resource.data.email &&
  request.resource.data.points == resource.data.points &&
  request.resource.data.status == resource.data.status
)
```

**What this enables**:
- Authenticated employees can update their `hasPassword` flag from `false` to `true`
- **Matches by email** (not document ID) since Firestore doc ID ≠ Firebase Auth UID
- This happens after they create their Firebase Auth account during first-time setup
- They can ONLY change `hasPassword` and `updatedAt` fields
- All other fields must remain unchanged
- Prevents abuse while enabling the authentication flow

**Rule 2**: Point spending during order placement:

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
- Employees can decrease their points when placing orders
- Points must remain >= 0 (cannot go negative)
- Only points and updatedAt can be changed
- All other fields must remain unchanged

**What this prevents**:
- Employees cannot give themselves more points
- Employees cannot change their corporateId
- Employees cannot change their status
- Employees cannot change their email
- Employees cannot update points while modifying other fields

### Delete Access (Unchanged)
Only admins and corporate users can delete employees

## Key Changes to Orders Collection Rules

### Read Access
```javascript
allow read: if isAuthenticated() && (
  isAdmin() ||
  resource.data.corporateId == request.auth.uid ||
  isEmployeeOwner(resource.data.employeeEmail)  // ← Email matching
);
```

**What this enables**:
- Admins can read all orders
- Corporates can read orders from their employees
- Employees can read their own orders (matched by email)

### Create Access
```javascript
allow create: if isAuthenticated() && (
  isAdmin() ||
  isEmployeeOwner(request.resource.data.employeeEmail)  // ← Email matching
);
```

**What this enables**:
- Admins can create orders
- Employees can create orders for themselves (matched by email)

**Required fields**: Order documents must include `employeeEmail` field for authentication.

## Key Changes to Tickets Collection Rules

### Read Access
```javascript
allow read: if isAuthenticated() && (
  isAdmin() ||
  resource.data.corporateId == request.auth.uid ||
  isEmployeeOwner(resource.data.employeeEmail)  // ← Email matching
);
```

**What this enables**:
- Admins can read all tickets
- Corporates can read tickets from their employees
- Employees can read their own tickets (matched by email)

### Create Access
```javascript
allow create: if isAuthenticated();
```

Any authenticated user can create tickets.

### Update Access
```javascript
allow update: if isAuthenticated() && (
  isAdmin() ||
  (isEmployeeOwner(resource.data.employeeEmail) &&
   !request.resource.data.diff(resource.data).affectedKeys().hasAny(['status', 'createdAt']))
);
```

**What this enables**:
- Admins can update any ticket field
- Employees can update their own tickets (except status and createdAt)

**Required fields**: Ticket documents must include `employeeEmail` field for authentication.

## Key Changes to Point Transactions Collection Rules

### Read Access
```javascript
allow read: if isAuthenticated() && (
  isAdmin() ||
  resource.data.corporateId == request.auth.uid ||
  isEmployeeOwner(resource.data.employeeEmail)  // ← Email matching
);
```

**What this enables**:
- Admins can read all point transactions
- Corporates can read transactions for their employees
- Employees can read their own transaction history (matched by email)

**Note**: Only admins and corporates can create transactions. Employees can only view their history.

## Authentication Flow Supported

### First-Time User
1. Employee visits `/company/{slug}`
2. Enters email (public read - no auth needed)
3. System checks `hasPassword === false`
4. Shows password creation form
5. Creates Firebase Auth account → User is now authenticated
6. **Updates Firestore**: Sets `hasPassword: true` ← NEW RULE ENABLES THIS
7. User is logged in

### Returning User
1. Employee visits `/company/{slug}`
2. Enters email (public read - no auth needed)
3. System checks `hasPassword === true`
4. Shows login form
5. Authenticates with Firebase Auth
6. User is logged in (no Firestore update needed)

## Security Guarantees

### ✅ What Employees CAN Do
- Read all employee records (needed for auth)
- Create Firebase Auth account
- Update own name
- Update hasPassword flag (false → true, when authenticated)
- **Spend points** (decrease only, when placing orders)
- **Read their own orders**
- **Create orders for themselves**
- **Read their own tickets**
- **Create support tickets**
- **Update their ticket descriptions**
- **Read their point transaction history**
- Update updatedAt timestamp

### ❌ What Employees CANNOT Do
- Give themselves more points
- Change their corporateId
- Change their status
- Change their email
- Change hasPassword while modifying other fields
- Update other employees' records
- Delete any employee records
- **View other employees' orders or tickets**
- **Change order status**
- **Change ticket status**
- **Delete orders or tickets**
- **Create point transactions**

### 🔒 What Corporate Users CAN Do
- Create employees under their account
- Update any field for their employees
- Delete their employees
- Award points to their employees

### 🛡️ What Corporate Users CANNOT Do
- Access employees from other corporates
- Update employees from other corporates
- Delete employees from other corporates

## Testing Checklist

### Employee Authentication
- [x] Public read access works without auth
- [x] Employee can set hasPassword after auth
- [x] Employee can update name
- [x] Employee cannot change corporateId, status, or email

### Employee Orders
- [ ] Employee can view their own orders
- [ ] Employee can create orders
- [ ] Employee cannot view other employees' orders
- [ ] Points deduct correctly when order is placed
- [ ] Employee cannot increase their points
- [ ] Points cannot go negative

### Employee Tickets
- [ ] Employee can create support tickets
- [ ] Employee can view their own tickets
- [ ] Employee can update ticket descriptions
- [ ] Employee cannot change ticket status
- [ ] Employee cannot view other employees' tickets

### Corporate Management
- [x] Corporate can create employee
- [x] Corporate cannot create employee for different company
- [x] Corporate can update their employee
- [x] Corporate cannot update other corporate's employee
- [ ] Corporate can view orders from their employees
- [ ] Corporate can view tickets from their employees

### Point Transactions
- [ ] Employee can view their point transaction history
- [ ] Employee cannot create point transactions
- [ ] Corporate can create point transactions for their employees

## Files Modified

1. **firestore.rules** - Enhanced rules for employees, orders, tickets, and point transactions
   - Added `isEmployeeOwner()` helper function
   - Updated employee rules: hasPassword setup, point spending
   - Updated orders rules: email-based access control
   - Updated tickets rules: email-based access control
   - Updated point transactions rules: email-based access control

2. **EMPLOYEE_SUBPAGE_FUNCTIONALITY_RULES.md** - Comprehensive guide for employee functionality (NEW)
3. **FIRESTORE_RULES_FIX.md** - Detailed explanation of email matching fix (NEW)
4. **FIRESTORE_EMPLOYEE_AUTH_RULES.md** - Comprehensive authentication documentation
5. **FIRESTORE_RULES_SUMMARY.md** - This summary file (UPDATED)

## Related Documentation

- `EMPLOYEE_SUBPAGE_FUNCTIONALITY_RULES.md` - Complete guide for employee features after login
- `EMPLOYEE_SUBPAGE_AUTH_RULES.md` - Complete authentication flow guide
- `EMPLOYEE_AUTH_QUICK_REFERENCE.md` - Quick reference for developers
- `FIRESTORE_RULES_FIX.md` - Explanation of ID mismatch problem and solution
- `src/utils/employeeAuthValidation.ts` - Client-side validation utilities

## Deployment

To deploy these rules to Firebase:

```bash
# Validate rules
firebase firestore:rules:validate

# Deploy rules only
firebase deploy --only firestore:rules

# Deploy everything
firebase deploy
```

## Important Notes

1. **Public Read Access**: Since employee records are publicly readable, NEVER store sensitive PII (SSN, phone, address, salary) in the employees collection. Use a separate protected collection for sensitive data.

2. **hasPassword Flag**: This boolean flag is safe to be public. It doesn't reveal the password and is necessary for the authentication flow.

3. **Firebase Auth Integration**: These rules work with Firebase Authentication. Employees must have a Firebase Auth account (created during first-time setup) before they can update their hasPassword flag.

4. **Field-Level Security**: The rules use `affectedKeys()` to check which fields are being modified, providing granular control over updates.

5. **Email Matching**: All employee-related operations (orders, tickets, point transactions) use email-based matching because employee Firestore document IDs don't match their Firebase Auth UIDs.

6. **Required Email Fields**: All documents related to employees (orders, tickets, point transactions) MUST include an `employeeEmail` field for authentication to work correctly.

7. **Point Spending**: Employees can only DECREASE their points (spending), never increase. Points must remain >= 0 at all times.

8. **Status Changes**: Only admins can change order and ticket status. Employees cannot modify these fields even for their own records.

## Common Issues & Solutions

### Issue: Permission denied when updating hasPassword
**Cause**: User not authenticated or trying to change other fields
**Solution**: Ensure user is authenticated and only updating hasPassword + updatedAt

### Issue: Employee can't update their name
**Cause**: Trying to change blocked fields simultaneously
**Solution**: Only update name and updatedAt fields

### Issue: Corporate can't update employee
**Cause**: Employee belongs to different corporate
**Solution**: Verify corporateId matches authenticated corporate user

### Issue: Employee can't view their orders
**Cause**: Order document missing `employeeEmail` field
**Solution**: Ensure all orders include `employeeEmail` field matching the employee's email

### Issue: Employee can't place order (permission denied)
**Cause**: Order document missing `employeeEmail` or email doesn't match
**Solution**: Include `employeeEmail` field in order creation that matches the authenticated user's email

### Issue: Points not deducting after order
**Cause**: Trying to change other fields or increase points
**Solution**: Only update `points` (decrease) and `updatedAt` fields. Ensure new points < old points and >= 0

### Issue: Employee can't create ticket
**Cause**: Not authenticated or network issue
**Solution**: Verify user is authenticated with Firebase Auth before creating ticket

## Security Best Practices

1. Always authenticate users before sensitive operations
2. Use Firestore rules as server-side validation (don't trust client)
3. Test rules in Firebase emulator before deploying
4. Monitor Firebase console for denied requests
5. Keep sensitive data in separate protected collections
6. Implement rate limiting at application level
7. Log authentication events for auditing

---

**Last Updated**: 2026-01-27
**Rule Version**: Enhanced for full employee functionality v3
**Changes**: Added email-based access control for orders, tickets, point transactions, and employee point spending
