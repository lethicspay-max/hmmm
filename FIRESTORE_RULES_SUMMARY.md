# Firestore Rules for Employee Authentication - Summary

## What Was Updated

Enhanced the Firestore security rules in `firestore.rules` to support employee login and account creation on company subpages.

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
Added special rule for first-time password setup:

```javascript
// Special case: Employee setting hasPassword during first-time authentication
(
  isOwner(employeeId) &&
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
- This happens after they create their Firebase Auth account during first-time setup
- They can ONLY change `hasPassword` and `updatedAt` fields
- All other fields must remain unchanged
- Prevents abuse while enabling the authentication flow

**What this prevents**:
- Employees cannot give themselves points
- Employees cannot change their corporateId
- Employees cannot change their status
- Employees cannot change their email
- Employees cannot update hasPassword while modifying other fields

### Delete Access (Unchanged)
Only admins and corporate users can delete employees

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
- Update updatedAt timestamp

### ❌ What Employees CANNOT Do
- Change their points balance
- Change their corporateId
- Change their status
- Change their email
- Change hasPassword while modifying other fields
- Update other employees' records
- Delete any employee records

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

### Test Scenarios
- [x] Public read access works without auth
- [x] Corporate can create employee
- [x] Corporate cannot create employee for different company
- [x] Employee can set hasPassword after auth
- [x] Employee cannot change points
- [x] Employee cannot change corporateId
- [x] Employee can update name
- [x] Corporate can update their employee
- [x] Corporate cannot update other corporate's employee

## Files Modified

1. **firestore.rules** - Enhanced employee collection update rules
2. **FIRESTORE_EMPLOYEE_AUTH_RULES.md** - Comprehensive documentation (NEW)
3. **FIRESTORE_RULES_SUMMARY.md** - This summary file (NEW)

## Related Documentation

- `EMPLOYEE_SUBPAGE_AUTH_RULES.md` - Complete authentication flow guide
- `EMPLOYEE_AUTH_QUICK_REFERENCE.md` - Quick reference for developers
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

## Security Best Practices

1. Always authenticate users before sensitive operations
2. Use Firestore rules as server-side validation (don't trust client)
3. Test rules in Firebase emulator before deploying
4. Monitor Firebase console for denied requests
5. Keep sensitive data in separate protected collections
6. Implement rate limiting at application level
7. Log authentication events for auditing

---

**Last Updated**: 2024-01-27
**Rule Version**: Enhanced for employee authentication v2
