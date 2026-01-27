# Employee Authentication - Quick Reference

## Authentication Flow

```
Employee visits /company/{slug}
         ↓
   Enter Email
         ↓
   Email Verified?
    ↙         ↘
  NO          YES
   ↓           ↓
Error       hasPassword?
           ↙         ↘
         NO          YES
          ↓           ↓
    First-Time    Returning
    Setup         User Login
          ↓           ↓
    Create        Enter
    Password      Password
          ↓           ↓
      Authenticated ←┘
```

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Email (Format) | Valid email format | "Please enter a valid email address" |
| Email (Exists) | Must be in database | "This email is not registered..." |
| Email (Status) | Must be active | "Your account is inactive..." |
| Password (Min) | ≥ 6 characters | "Password must be at least 6 characters long" |
| Password (Max) | ≤ 128 characters | "Password is too long..." |
| Confirm Password | Must match password | "Passwords do not match" |

## Authentication Steps

### Step 1: Email Verification
- **Input**: Email address
- **Validates**: Format, exists, active status, corporate match
- **Output**: Routes to first-time or returning login

### Step 2A: First-Time Setup
- **Input**: Password + Confirmation
- **Validates**: Length, match, format
- **Actions**: Create auth account, update employee record
- **Output**: Auto-login to employee portal

### Step 2B: Returning User
- **Input**: Password
- **Validates**: Matches Firebase Auth
- **Actions**: Sign in with Firebase
- **Output**: Login to employee portal + confetti animation

## Security Rules (Firestore)

### Employee Collection

```javascript
// Read: Anyone (needed for login verification)
allow read: if true;

// Create: Admin, Corporate, or valid self-registration
allow create: if (
  isAdmin() ||
  (isCorporate() && request.resource.data.corporateId == request.auth.uid) ||
  (validSelfRegistration)
);

// Update: Admin, Corporate owner, or Employee (limited fields)
allow update: if isAuthenticated() && (
  isAdmin() ||
  (isCorporate() && resource.data.corporateId == request.auth.uid) ||
  (isOwner(employeeId) && limitedFieldsOnly)
);
```

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Email not registered" | Email doesn't exist in DB | Contact HR to add employee |
| "Account is inactive" | Employee status = inactive | Contact HR to activate account |
| "Passwords do not match" | Confirmation mismatch | Re-enter matching passwords |
| "Password too short" | < 6 characters | Use longer password |
| "Incorrect password" | Wrong password entered | Try again or reset password |
| "Too many attempts" | Multiple failed logins | Wait before trying again |
| "Account already exists" | Auth account exists (different password) | Try logging in or reset password |

## Employee States

| State | hasPassword | Firebase Auth | Action |
|-------|-------------|---------------|---------|
| New Employee | false | ❌ | First-time setup |
| Active Employee | true | ✅ | Login |
| Reset Needed | true | ❌ | Contact admin |
| Inactive | N/A | N/A | Contact HR |

## Password Requirements

### Minimum Requirements
- **Length**: 6 characters minimum
- **Characters**: Any characters allowed
- **Confirmation**: Must match on creation

### Recommended (Strong Password)
- **Length**: 12+ characters
- **Lowercase**: a-z
- **Uppercase**: A-Z
- **Numbers**: 0-9
- **Special**: !@#$%^&*

## Authentication Constants

```typescript
AUTH_VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128,
  MAX_EMAIL_LENGTH: 254,
}
```

## Edge Cases

### Case 1: Email exists in Firebase but not in employees collection
**Result**: Email verification fails
**Message**: "Email not registered"

### Case 2: hasPassword = true but no Firebase Auth account
**Result**: Login fails
**Message**: "Incorrect password"
**Fix**: Admin resets hasPassword to false

### Case 3: Corporate account becomes inactive
**Result**: Login blocked
**Message**: "Company page is currently inactive"

### Case 4: Multiple failed login attempts
**Result**: Firebase locks account temporarily
**Message**: "Too many attempts"
**Fix**: Wait 15-30 minutes

## API Functions

### `validateEmailFormat(email)`
Validates email format

**Returns**: `{ valid: boolean, errors: string[] }`

### `validatePasswordCreation(password, confirmPassword)`
Validates password for first-time setup

**Returns**: `{ valid: boolean, errors: string[] }`

### `validatePasswordLogin(password)`
Validates password for login

**Returns**: `{ valid: boolean, errors: string[] }`

### `validateEmployeeAuthentication(email, employeeData, corporateId, corporateStatus)`
Comprehensive validation for employee auth

**Returns**: `{ valid: boolean, errors: string[] }`

### `getAuthErrorMessage(errorCode)`
Converts Firebase error codes to user-friendly messages

**Returns**: `string`

## Testing Checklist

- [ ] Valid email accepted
- [ ] Invalid email rejected
- [ ] Empty email shows error
- [ ] Non-existent email shows error
- [ ] Inactive employee shows error
- [ ] Password < 6 chars rejected
- [ ] Mismatched passwords rejected
- [ ] Correct password logs in
- [ ] Wrong password shows error
- [ ] First-time setup creates account
- [ ] hasPassword updated after setup
- [ ] Auto-login works after setup
- [ ] Returning user can login
- [ ] Confetti triggers on login
- [ ] Session persists after refresh
- [ ] Logout works correctly

## Support Contacts

### For Employees
- **Forgot Password**: Use "Forgot Password" link on login page
- **Account Issues**: Contact your HR department
- **Email Not Found**: Verify with HR you've been added to system

### For HR/Corporate
- **Add Employee**: Use corporate dashboard
- **Reset Employee**: Set hasPassword to false in database
- **Deactivate Employee**: Change status to 'inactive'

## URL Structure

```
Main Site: https://yourdomain.com
Company Subpage: https://yourdomain.com/company/{slug}
Password Reset: https://yourdomain.com/forgot-password?type=employee
```

## Data Flow

### First-Time Setup
1. Enter email → Query employees collection
2. Found + hasPassword=false → Show password creation form
3. Create password → Firebase createUserWithEmailAndPassword()
4. Success → Update employees doc (hasPassword=true)
5. Auto-login → Employee portal

### Returning User
1. Enter email → Query employees collection
2. Found + hasPassword=true → Show login form
3. Enter password → Firebase signInWithEmailAndPassword()
4. Success → Trigger confetti + Employee portal
5. Failure → Show error, allow retry

## Best Practices

### For Developers
1. Always validate on both client and server
2. Use Firebase Security Rules for server validation
3. Clear errors before new submission
4. Handle all Firebase error codes
5. Test edge cases thoroughly
6. Log authentication events

### For Corporate Admins
1. Verify employee emails before adding
2. Use unique email per employee
3. Communicate login process to employees
4. Monitor for authentication issues
5. Keep employee records up to date

### For Employees
1. Use a strong password
2. Don't share your password
3. Log out on shared computers
4. Contact HR if issues arise
5. Use password reset if forgotten
