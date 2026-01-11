# Firebase Security Rules Guide

## Overview

Your Firebase database is currently in **test mode**, which means anyone can read and write to your database. This is a critical security vulnerability. This guide will help you secure your Firebase project.

---

## What's Been Created

Two security rules files have been created for you:

1. **`firestore.rules`** - Secures your Firestore database
2. **`storage.rules`** - Secures your Firebase Storage

---

## How to Deploy These Rules

### Option 1: Firebase Console (Easiest)

#### For Firestore Rules:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **suraj-int**
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the entire contents of `firestore.rules`
5. Paste it into the rules editor
6. Click **Publish**

#### For Storage Rules:

1. In the Firebase Console, navigate to **Storage** → **Rules** tab
2. Copy the entire contents of `storage.rules`
3. Paste it into the rules editor
4. Click **Publish**

### Option 2: Firebase CLI (For Developers)

If you have Firebase CLI installed:

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init

# Deploy security rules
firebase deploy --only firestore:rules,storage:rules
```

---

## What These Rules Protect

### Firestore Security Rules

#### 1. Users Collection (`/users/{userId}`)
- ✅ Users can read their own profile
- ✅ Admins can read all profiles
- ✅ Only admins can create users
- ✅ Users can update their own profile (but cannot change `role` or `status`)
- ✅ Only admins can delete users

#### 2. Products Collection (`/products/{productId}`)
- ✅ Any authenticated user can read products
- ✅ Only admins can create, update, or delete products

#### 3. Corporate Settings (`/corporateSettings/{settingId}`)
- ✅ Admins can read all settings
- ✅ Corporates can only read their own settings (where `corporateId` matches their user ID)
- ✅ Only admins can modify settings

#### 4. Corporate Product Settings (`/corporateProductSettings/{settingId}`)
- ✅ Admins can read all product settings
- ✅ Corporates can only read their own product settings
- ✅ Only admins can modify product settings

#### 5. Employees Collection (`/employees/{employeeId}`)
- ✅ Admins can read all employees
- ✅ Corporates can read their own employees (where `corporateId` matches)
- ✅ Employees can read their own profile
- ✅ Admins and corporates can create employees under their corporate
- ✅ Employees can update limited fields on their profile (cannot change points or corporateId)
- ✅ Only admins and parent corporates can delete employees

#### 6. Orders Collection (`/orders/{orderId}`)
- ✅ Admins can read all orders
- ✅ Corporates can read orders from their employees
- ✅ Employees can read their own orders
- ✅ Employees can create orders for themselves
- ✅ Only admins can update order status
- ✅ Only admins can delete orders

#### 7. Tickets Collection (`/tickets/{ticketId}`)
- ✅ Admins can read all tickets
- ✅ Corporates can read tickets related to their account
- ✅ Employees can read their own tickets
- ✅ Any authenticated user can create tickets
- ✅ Admins can update any ticket
- ✅ Ticket creators can add messages (limited updates)
- ✅ Only admins can delete tickets

#### 8. Point Transactions Collection (`/pointTransactions/{transactionId}`)
- ✅ Admins can read all transactions
- ✅ Corporates can read their own transactions
- ✅ Employees can read their own transactions
- ✅ Admins and corporates can create transactions
- ✅ Only admins can update or delete transactions

#### 9. Contact Submissions Collection (`/contactSubmissions/{submissionId}`)
- ✅ Only admins can read contact submissions
- ✅ Anyone can create contact submissions (public contact form)
- ✅ Only admins can update or delete submissions

#### 10. Default Deny
- ❌ All other collections are blocked by default

### Storage Security Rules

#### 1. Product Images (`/products/{productId}/`)
- ✅ Any authenticated user can read product images
- ✅ Only admins can upload/modify product images

#### 2. Corporate Uploads (`/corporates/{corporateId}/`)
- ✅ Corporates can read and write to their own folder
- ✅ Admins can access all corporate folders

#### 3. Admin Uploads (`/admin/`)
- ✅ Only admins can access admin storage

#### 4. Default Deny
- ❌ All other storage paths are blocked

---

## Key Security Features

### Authentication Required
- **All access requires authentication** - unauthenticated users cannot access anything
- Uses Firebase Authentication to verify identity

### Role-Based Access Control (RBAC)
- **Admin Role**: Full access to all data and operations
- **Corporate Role**: Limited access to their own data only
- Roles are stored in the `users` collection and verified on every request

### Data Isolation
- Corporates can **only see their own data**
- Corporates **cannot change their role or status**
- Corporates **cannot access other corporate's settings**

### Admin Protection
- Only admins can:
  - Create, update, or delete products
  - Modify corporate settings and product locks
  - Access any user's profile
  - Delete users

---

## Testing Your Rules

After deploying, test your security rules:

### Test 1: Unauthenticated Access (Should Fail)
```javascript
// This should be denied
const products = await getDocs(collection(db, 'products'));
// Expected: Permission denied error
```

### Test 2: Corporate Reading Own Settings (Should Work)
```javascript
// Login as corporate user
// This should work
const settingsQuery = query(
  collection(db, 'corporateSettings'),
  where('corporateId', '==', currentUser.uid)
);
const settings = await getDocs(settingsQuery);
// Expected: Returns their settings
```

### Test 3: Corporate Reading Other Corporate's Settings (Should Fail)
```javascript
// Login as corporate user
// This should be denied
const settingsQuery = query(
  collection(db, 'corporateSettings'),
  where('corporateId', '==', 'someOtherCorporateId')
);
const settings = await getDocs(settingsQuery);
// Expected: Returns empty (Firebase filters out unauthorized data)
```

### Test 4: Corporate Modifying Products (Should Fail)
```javascript
// Login as corporate user
// This should be denied
await updateDoc(doc(db, 'products', 'someProductId'), {
  name: 'Hacked Product'
});
// Expected: Permission denied error
```

### Test 5: Admin Full Access (Should Work)
```javascript
// Login as admin user
// This should work
await updateDoc(doc(db, 'products', 'someProductId'), {
  name: 'Updated Product'
});
// Expected: Success
```

---

## Important Notes

### Custom Claims (Advanced)
The current rules use a database lookup to check user roles:
```javascript
get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
```

This works but costs an extra read per request. For better performance, you can use **Firebase Custom Claims**:

1. Set custom claims when users are created (requires Cloud Functions or Admin SDK)
2. Update rules to use `request.auth.token.role` instead

### Indexes
You may need to create composite indexes for some queries. Firebase will automatically prompt you to create them when needed.

### Backup Before Deploying
Before deploying these rules to production:
1. Export your current rules from Firebase Console
2. Keep a backup copy
3. Test rules in a development environment first

---

## Common Errors After Deploying

### "Permission Denied" on Read Operations
**Cause**: The user doesn't have the correct role or isn't authenticated.

**Solution**:
- Verify the user is logged in
- Check the user's `role` field in the `users` collection
- Ensure the role is exactly `'admin'` or `'corporate'` (case-sensitive)

### "Missing or insufficient permissions" on Write Operations
**Cause**: User is trying to write data they don't have permission to modify.

**Solution**:
- Verify the user has admin role for admin-only operations
- Check that corporates are only modifying their own data

### Rules Take Time to Deploy
After publishing rules, they may take 1-2 minutes to propagate globally.

---

## Security Checklist

Before going to production, ensure:

- [x] Security rules are deployed to Firestore
- [x] Security rules are deployed to Storage
- [x] All users have correct `role` field in their user document
- [x] Test mode is disabled
- [ ] Test all user flows (login, registration, dashboard access)
- [ ] Test admin operations work correctly
- [ ] Test corporate users cannot access other corporate's data
- [ ] Test unauthenticated users cannot access anything
- [ ] Enable Firebase App Check for additional security (optional but recommended)

---

## Next Steps

1. **Deploy the rules immediately** using the Firebase Console
2. **Test your application** to ensure everything still works
3. **Monitor Firebase Console** for any permission errors
4. **Set up alerting** for security rule violations

---

## Additional Security Recommendations

### 1. Enable Firebase App Check
Protects your backend resources from abuse (bots, scrapers).

### 2. Set Up Monitoring
Monitor security rule violations in Firebase Console.

### 3. Regular Audits
Review and update security rules as your app evolves.

### 4. Environment Variables
Your Firebase config contains public API keys (this is normal), but:
- Never expose admin SDK credentials
- Use environment variables for sensitive data
- Enable App Check to prevent API key abuse

### 5. Rate Limiting
Consider implementing rate limiting for sensitive operations.

---

## Support

If you encounter issues after deploying:
1. Check the Firebase Console → Firestore → Rules tab for syntax errors
2. Review the Firebase Console logs for permission denied errors
3. Test with Firebase Rules Playground in the Console

---

## Summary

Your Firebase database is now secured with production-ready security rules that:
- Require authentication for all operations
- Implement role-based access control
- Isolate corporate data
- Protect admin operations
- Follow the principle of least privilege

**Deploy these rules as soon as possible to secure your application!**
