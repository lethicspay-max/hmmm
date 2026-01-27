# Employee Subpage Authentication Rules

This document outlines all rules and requirements for employee login and account creation on company subpages.

## Table of Contents

1. [Overview](#overview)
2. [Access Rules](#access-rules)
3. [Authentication Flow](#authentication-flow)
4. [Validation Rules](#validation-rules)
5. [Security Rules](#security-rules)
6. [Business Rules](#business-rules)
7. [Error Handling](#error-handling)
8. [Edge Cases](#edge-cases)

---

## Overview

Employees access the system through company-specific subpages at `/company/{slug}`. The authentication system supports two user types:

- **First-time users**: Employees who have been added by corporate but haven't set up their password
- **Returning users**: Employees who have already created their password and are logging in again

---

## Access Rules

### URL Structure
```
/company/{slug}
```

- `{slug}` must match an existing corporate account's slug
- Invalid slugs display a "Company Not Found" error
- Only active corporate accounts can have accessible subpages

### Pre-requisites for Employee Access

1. **Corporate Account**
   - Must exist in the database
   - Status must be `active`
   - Must have a valid `slug` configured

2. **Employee Record**
   - Must exist in `employees` collection
   - Must be linked to the corporate via `corporateId`
   - Status must be `active`
   - Email must match the corporate's domain (optional, based on corporate settings)

---

## Authentication Flow

### Step 1: Email Verification

**Purpose**: Verify that the user is a registered employee

**Process**:
1. User enters their email address
2. System queries `employees` collection for matching email and corporateId
3. If found, check `hasPassword` field to determine user type
4. Route to appropriate authentication step

**Rules**:
- Email must be in valid format
- Email must exist in employees collection for this corporate
- Employee status must be `active`
- Case-insensitive email matching

### Step 2A: First-Time Setup (New Employee)

**Purpose**: Allow new employees to create their password

**Trigger**: `hasPassword === false` or field doesn't exist

**Process**:
1. Display password creation form
2. User creates password (with confirmation)
3. System creates Firebase Auth account
4. Update employee record with `hasPassword: true`
5. Automatically log user in

**Rules**:
- Password minimum length: 6 characters
- Password confirmation must match
- Must handle case where auth account already exists
- Update employee record only after successful auth creation

### Step 2B: Returning User Login

**Purpose**: Allow existing employees to log in

**Trigger**: `hasPassword === true`

**Process**:
1. Display password login form
2. User enters password
3. System authenticates with Firebase Auth
4. On success, grant access to employee portal
5. Trigger celebration animation (confetti)

**Rules**:
- Password must match Firebase Auth record
- Limit login attempts (handled by Firebase)
- Clear error messages for failed attempts

---

## Validation Rules

### Email Validation

```typescript
interface EmailValidation {
  required: true,
  format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  maxLength: 254,
  caseInsensitive: true,
  mustExistInDatabase: true
}
```

**Validation Steps**:
1. Check email is not empty
2. Check email format is valid
3. Check email length ≤ 254 characters
4. Query database for employee record
5. Verify employee is linked to correct corporate
6. Verify employee status is `active`

**Error Messages**:
- "Email is required"
- "Please enter a valid email address"
- "This email is not registered. Please contact your HR department."
- "Your account is inactive. Please contact your HR department."

### Password Validation (First-Time Setup)

```typescript
interface PasswordValidation {
  minLength: 6,
  required: true,
  confirmationRequired: true,
  mustMatch: true
}
```

**Validation Steps**:
1. Check password is not empty
2. Check password length ≥ 6 characters
3. Check confirmation password is not empty
4. Check password matches confirmation

**Error Messages**:
- "Password is required"
- "Password must be at least 6 characters long"
- "Please confirm your password"
- "Passwords do not match"

### Password Validation (Returning User)

```typescript
interface LoginValidation {
  required: true,
  minLength: 6,
  mustMatchFirebaseAuth: true
}
```

**Validation Steps**:
1. Check password is not empty
2. Attempt Firebase Auth sign in
3. Handle authentication errors

**Error Messages**:
- "Password is required"
- "Incorrect password. Please try again."
- "Too many failed login attempts. Please try again later."

---

## Security Rules

### Firestore Security Rules

#### Employee Read Access
```javascript
allow read: if true;
```

**Rationale**: Anyone can read employee records to:
- Check if email exists during login
- Verify employee belongs to corporate
- Allow subpage to load employee data

**Important**: Sensitive fields should be stored elsewhere or protected at application level

#### Employee Create Access
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

**Rules**:
- Admins can create any employee
- Corporate users can create employees under their account
- Self-registration requires all mandatory fields
- Points must be non-negative
- Status must be valid enum value

#### Employee Update Access
```javascript
allow update: if isAuthenticated() && (
  isAdmin() ||
  (isCorporate() && resource.data.corporateId == request.auth.uid) ||
  (isOwner(employeeId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['corporateId', 'points']))
);
```

**Rules**:
- Admins can update any employee
- Corporate users can update their employees
- Employees can update own profile (limited fields)
- Cannot change corporateId or points

### Firebase Authentication Security

**Password Requirements**:
- Minimum 6 characters (Firebase default)
- No maximum length (up to Firebase limits)
- Any characters allowed

**Account Protection**:
- Email/password authentication only on subpages
- Rate limiting handled by Firebase
- Account lockout after multiple failed attempts (Firebase default)

**Session Management**:
- Sessions persist in browser localStorage
- Explicit logout required to end session
- Sessions tied to specific employee account

---

## Business Rules

### First-Time User Rules

1. **Password Creation**
   - Must create password on first login
   - Cannot skip password creation
   - Password immediately active upon creation
   - Auto-login after successful creation

2. **Account Linking**
   - Firebase Auth account linked to employee record
   - Email must match employee record exactly
   - No duplicate Firebase Auth accounts per email

3. **Record Updates**
   - `hasPassword` set to `true` after creation
   - `updatedAt` timestamp updated
   - Original employee data preserved

### Returning User Rules

1. **Login Process**
   - Must use existing password
   - Cannot create new password without reset
   - Failed attempts tracked by Firebase
   - Success triggers celebration animation

2. **Session Behavior**
   - Remains logged in until explicit logout
   - Can access all employee features
   - Session scoped to company subpage

### Account State Transitions

```
[Employee Added by Corporate]
          ↓
[hasPassword: false] → First-Time Setup → [hasPassword: true]
          ↓                                      ↓
    Password Creation                    Returning User Login
          ↓                                      ↓
    Auto Login                              Manual Login
          ↓                                      ↓
    [Authenticated State] ←──────────────[Authenticated State]
```

---

## Error Handling

### Email Verification Errors

| Error Condition | Error Message | Action |
|----------------|---------------|---------|
| Empty email | "Email is required" | Show inline error |
| Invalid format | "Please enter a valid email address" | Show inline error |
| Email not found | "This email is not registered. Please contact your HR department." | Show alert |
| Account inactive | "Your account is inactive. Please contact your HR department." | Show alert |
| Network error | "Failed to verify email. Please try again." | Show alert |

### First-Time Setup Errors

| Error Condition | Error Message | Action |
|----------------|---------------|---------|
| Empty password | "Password is required" | Show inline error |
| Password too short | "Password must be at least 6 characters long" | Show inline error |
| Passwords don't match | "Passwords do not match" | Show inline error |
| Email already in use (different password) | "An account with this email already exists. Please contact your HR department or try logging in with your existing password." | Show alert |
| Account creation failed | "Failed to create account. Please try again." | Show alert |

### Returning User Errors

| Error Condition | Error Message | Action |
|----------------|---------------|---------|
| Empty password | "Password is required" | Show inline error |
| Wrong password | "Incorrect password. Please try again." | Show alert |
| Too many attempts | "Too many failed login attempts. Please try again later." | Show alert |
| Network error | "Login failed. Please check your connection and try again." | Show alert |

### Error Display Rules

1. **Inline Errors**: Display below form field
2. **Alert Errors**: Display in alert box above form
3. **Clear on Input**: Errors clear when user types
4. **Clear on Submit**: Previous errors clear on new submission

---

## Edge Cases

### Case 1: Email Exists in Firebase Auth but Employee Record Missing

**Scenario**: User tries to log in but employee record was deleted

**Handling**:
- Email verification step will fail
- Show "Email not registered" error
- User cannot proceed to login
- Admin must re-add employee record

### Case 2: Employee Record Exists but Firebase Auth Account Doesn't

**Scenario**: First-time user, hasPassword is false

**Handling**:
- Normal first-time setup flow
- Create Firebase Auth account
- Update employee record
- Proceed to authenticated state

### Case 3: Email Already in Firebase Auth (Different Corporate)

**Scenario**: Same email exists for different corporate

**Handling**:
- Firebase Auth allows one account per email
- First corporate to create password claims the account
- Other corporates must use different email
- Corporate should ensure unique emails per organization

### Case 4: hasPassword True but Firebase Auth Account Missing

**Scenario**: Database inconsistency or account deleted

**Handling**:
- Login attempt will fail
- Show "Incorrect password" error
- User should contact HR
- Admin can reset hasPassword to false for password recreation

### Case 5: User Creates Account, Closes Browser, Returns Later

**Scenario**: User completed first-time setup, closed browser, returns to login

**Handling**:
- Email verification identifies as returning user
- Show login form (not password creation)
- User enters same password
- Successful authentication

### Case 6: Multiple Failed Login Attempts

**Scenario**: User enters wrong password repeatedly

**Handling**:
- Firebase tracks failed attempts
- After threshold, temporarily locks account
- User sees "Too many attempts" error
- Must wait before trying again (Firebase handles timing)

### Case 7: Corporate Account Deactivated While Employee Logged In

**Scenario**: Corporate status changes to inactive

**Handling**:
- Current session remains active (not actively terminated)
- New logins blocked at email verification
- Show "Company not found" error
- Employee should contact corporate admin

### Case 8: Password Reset Needed

**Scenario**: User forgot password

**Handling**:
- "Forgot Password" link available on login form
- Links to `/forgot-password?type=employee`
- Password reset email sent via Firebase
- User can reset password and log in again

---

## Security Considerations

### Data Protection

1. **Sensitive Data**
   - Passwords never stored in Firestore
   - Only stored in Firebase Auth (hashed)
   - `hasPassword` boolean is safe to store

2. **Public Reads**
   - Employee records readable by anyone
   - Only store non-sensitive data in employees collection
   - Sensitive data should be in separate protected collection

3. **Authentication State**
   - Managed by Firebase Auth
   - Verified on every request
   - Cannot be spoofed or manipulated client-side

### Attack Prevention

1. **Brute Force Protection**
   - Rate limiting via Firebase Auth
   - Account lockout after failed attempts
   - No custom implementation needed

2. **Email Enumeration**
   - Generic error messages prevent enumeration
   - Same message for invalid email vs wrong password
   - Cannot determine if email exists without corporate association

3. **Session Hijacking**
   - Firebase Auth tokens expire
   - Secure HTTP-only cookies (Firebase default)
   - HTTPS required in production

---

## Best Practices

### For Developers

1. Always validate on both client and server side
2. Use Firebase Security Rules as server-side validation
3. Never trust client-side checks alone
4. Clear error state before new submissions
5. Log authentication events for auditing
6. Test all edge cases thoroughly

### For Corporate Administrators

1. Use unique emails for each employee
2. Verify employee email addresses before adding
3. Remove inactive employees promptly
4. Monitor for suspicious login patterns
5. Educate employees about password security
6. Provide clear onboarding instructions

### For Employees

1. Use a strong password (6+ characters minimum)
2. Don't share your password with anyone
3. Log out when using shared computers
4. Contact HR if you forgot your password
5. Report suspicious activity immediately

---

## Testing Checklist

### Email Verification
- [ ] Valid email formats accepted
- [ ] Invalid email formats rejected
- [ ] Empty email shows error
- [ ] Email not in database shows error
- [ ] Inactive employee shows error
- [ ] Case-insensitive matching works

### First-Time Setup
- [ ] Password creation succeeds
- [ ] Short password rejected
- [ ] Mismatched passwords rejected
- [ ] Empty fields show errors
- [ ] hasPassword updated after creation
- [ ] Auto-login works after setup

### Returning User Login
- [ ] Correct password logs in
- [ ] Incorrect password shows error
- [ ] Empty password shows error
- [ ] Multiple failures lock account
- [ ] Confetti animation triggers
- [ ] Session persists after refresh

### Edge Cases
- [ ] Missing employee record handled
- [ ] Missing Firebase Auth handled
- [ ] Duplicate emails handled
- [ ] Corporate deactivation handled
- [ ] Network errors handled gracefully

---

## API Reference

### Key Functions

#### `handleEmailCheck()`
Verifies employee email and determines authentication step

**Validation**:
- Email format
- Employee exists in database
- Employee belongs to current corporate
- Employee status is active

**Returns**: Sets `authStep` to 'first-time' or 'returning'

#### `handleFirstTimeSetup()`
Creates Firebase Auth account and sets password

**Validation**:
- Password length ≥ 6
- Password matches confirmation
- Employee record exists

**Side Effects**:
- Creates Firebase Auth account
- Updates employee record (hasPassword: true)
- Logs user in automatically

#### `handleReturningUserLogin()`
Authenticates existing user

**Validation**:
- Password not empty
- Password matches Firebase Auth

**Side Effects**:
- Signs user in with Firebase Auth
- Triggers confetti animation
- Sets authenticated state

---

## Troubleshooting Guide

### Problem: "Email not registered" but employee exists

**Solution**:
- Check employee corporateId matches corporate
- Verify employee status is 'active'
- Ensure email matches exactly (case-insensitive)

### Problem: "Account already exists" during first-time setup

**Solution**:
- User should try logging in instead
- If forgotten, use password reset
- Contact HR if issue persists

### Problem: Login succeeds but page doesn't load

**Solution**:
- Check browser console for errors
- Verify Firebase Auth working
- Check employee record loaded correctly
- Try clearing browser cache

### Problem: Can't find company subpage

**Solution**:
- Verify corporate slug is correct
- Check corporate status is 'active'
- Ensure URL is /company/{slug}
- Contact system admin if slug needs update
