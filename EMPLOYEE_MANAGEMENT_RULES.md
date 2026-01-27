# Employee Management Rules

This document outlines all rules and validation requirements for adding and managing employees in the corporate dashboard.

## Table of Contents

1. [Security Rules](#security-rules)
2. [Validation Rules](#validation-rules)
3. [Business Rules](#business-rules)
4. [Single Employee Addition](#single-employee-addition)
5. [Bulk Employee Upload](#bulk-employee-upload)
6. [Point Management](#point-management)
7. [Error Handling](#error-handling)

---

## Security Rules

### Firestore Security Rules

#### Employee Creation
Employees can be created by:
- **Admins**: Can create employees for any corporate account
- **Corporate Users**: Can create employees only under their own account
- **Self-Registration**: Allowed on company subpages with these requirements:
  - Must have a valid `corporateId`
  - Must include valid `email` and `name`
  - Points must be non-negative (≥ 0)
  - Status must be either `active` or `inactive`
  - Must include `createdAt` timestamp

#### Employee Updates
- **Admins**: Can update any employee
- **Corporate Users**: Can update only their own employees
- **Employees**: Can update their own profile, but cannot change:
  - `corporateId`
  - `points` allocation

#### Employee Deletion
- **Admins**: Can delete any employee
- **Corporate Users**: Can delete only their own employees
- **Employees**: Cannot delete themselves

---

## Validation Rules

### Email Validation
- **Required**: Email field must not be empty
- **Format**: Must match standard email format (xxx@xxx.xxx)
- **Max Length**: 254 characters
- **Uniqueness**: Email must be unique within the corporate account
- **Case Insensitive**: Emails are compared in lowercase
- **No Duplicates**: Cannot have duplicate emails in bulk uploads

### Name Validation
- **Required**: Name field must not be empty
- **Min Length**: 2 characters
- **Max Length**: 100 characters
- **Allowed Characters**: Letters, spaces, hyphens, apostrophes, and periods only
- **Trimming**: Leading and trailing spaces are removed
- **Normalization**: Multiple consecutive spaces are replaced with single space

### Points Validation
- **Type**: Must be a valid number
- **Min Value**: 0 (cannot be negative)
- **Max Value**: 10,000 points per employee
- **Budget Check**: Corporate must have sufficient available points
- **Integer Only**: Decimal points are rounded down

---

## Business Rules

### Corporate Limits
- **Maximum Employees**: 1,000 employees per corporate account
- **Bulk Upload Limit**: 100 employees per batch
- **Point Budget**: Total allocated points cannot exceed corporate's available points

### Point Allocation
- **Initial Points**: Can allocate 0 to 10,000 points when creating an employee
- **Point Deduction**: Points are deducted from corporate's available balance
- **Transaction Logging**: All point allocations are logged in `pointTransactions` collection
- **Atomic Operations**: Point allocation and employee creation happen together

### Employee Status
- **Default Status**: `active`
- **Valid Statuses**:
  - `active`: Employee can access the system
  - `inactive`: Employee is disabled but data is retained

### Data Integrity
- **Timestamps**: All employees must have `createdAt` timestamp
- **Corporate Association**: Every employee must be linked to a valid `corporateId`
- **Company Name**: Employees inherit the `corporateCompany` name

---

## Single Employee Addition

### Required Fields
```typescript
{
  email: string,        // Valid email format
  name: string,         // 2-100 characters
  points: number,       // 0-10,000
  corporateId: string,  // Corporate user's ID
  status: 'active'      // Default status
}
```

### Validation Process
1. **Validate Email Format**: Check email matches regex pattern
2. **Check Email Uniqueness**: Verify email doesn't exist in corporate's employees
3. **Validate Name**: Check length and allowed characters
4. **Validate Points**:
   - Check if points are within valid range
   - Verify corporate has sufficient available points
5. **Check Employee Limit**: Ensure corporate hasn't reached max employees
6. **Sanitize Data**: Trim and normalize all inputs

### Success Actions
1. Create employee document in `employees` collection
2. Update corporate's `usedPoints` field
3. Create transaction record in `pointTransactions`
4. Refresh dashboard data
5. Clear form inputs

---

## Bulk Employee Upload

### CSV Format
```
email,name,points
john.doe@company.com,John Doe,500
jane.smith@company.com,Jane Smith,750
```

### Format Requirements
- **Delimiter**: Comma (`,`)
- **Fields**: email, name, points (points optional, defaults to 100)
- **Line Breaks**: Each employee on a new line
- **No Header Row**: First line is data, not headers
- **Empty Lines**: Empty lines are skipped

### Validation Process
1. **Parse CSV**: Split by newlines, then by commas
2. **Check Batch Size**: Max 100 employees per upload
3. **Validate Each Line**:
   - Check email format and uniqueness
   - Check name format
   - Validate points
4. **Check Duplicates Within Upload**: No duplicate emails in the batch
5. **Calculate Total Points**: Sum all point allocations
6. **Verify Point Budget**: Ensure corporate has enough points
7. **Check Employee Limit**: Total employees after upload must not exceed 1,000

### Error Reporting
- Errors are reported with line numbers
- All errors are collected before submission fails
- Clear error messages indicate what needs to be fixed

### Success Actions
1. Create all employee documents
2. Update corporate's `usedPoints` field
3. Create single bulk transaction record
4. Clear upload form
5. Refresh dashboard data

---

## Point Management

### Available Points Calculation
```
Available Points = Total Allocated Points - Used Points
```

### Point Allocation Rules
1. **Single Employee**: Points deducted immediately upon creation
2. **Bulk Upload**: Total points calculated and deducted as single transaction
3. **Bulk Add to All**: Points multiplied by employee count
4. **Cannot Overdraw**: Operations fail if insufficient points

### Point Transaction Types
- `corporate_to_employee`: Points allocated to new employee
- `bulk_upload`: Points allocated during bulk upload
- `corporate_to_employee` (bulk): Points added to all employees

### Transaction Logging
Every point allocation creates a transaction record:
```typescript
{
  type: string,
  fromId: string,       // Corporate user ID
  toId: string,         // Employee ID or 'bulk_upload'
  points: number,
  reason: string,       // Description of transaction
  createdAt: string,
  corporateId: string   // Optional
}
```

---

## Error Handling

### Common Error Messages

#### Email Errors
- "Email is required"
- "Invalid email format"
- "Email is too long (max 254 characters)"
- "An employee with this email already exists"
- "Duplicate email in upload"

#### Name Errors
- "Name is required"
- "Name must be at least 2 characters"
- "Name must not exceed 100 characters"
- "Name contains invalid characters"

#### Points Errors
- "Points must be a valid number"
- "Points cannot be negative"
- "Points per employee cannot exceed 10,000"
- "Insufficient points. You have X points available, but trying to allocate Y points"

#### Limit Errors
- "Maximum employee limit reached (1,000)"
- "Bulk upload limited to 100 employees per batch"
- "Adding X employees would exceed maximum limit of 1,000"

#### Bulk Upload Errors
- "No employee data provided"
- "Line X: [specific error]"

### User Feedback
- **Success**: Clear confirmation messages with counts and totals
- **Validation Errors**: Displayed before submission attempt
- **Server Errors**: Caught and displayed with user-friendly messages
- **Loading States**: Indicated during operations

---

## Best Practices

### For Corporate Users
1. **Plan Point Allocation**: Calculate total points needed before bulk upload
2. **Verify Emails**: Double-check email addresses for accuracy
3. **Use Bulk Upload**: More efficient for adding multiple employees
4. **Monitor Limits**: Keep track of total employee count
5. **Regular Audits**: Review employee list periodically

### For Developers
1. **Always Validate**: Use validation utilities before database operations
2. **Sanitize Inputs**: Clean and normalize data before storage
3. **Atomic Operations**: Update points and create employees together
4. **Log Transactions**: Always create transaction records
5. **Clear Error Messages**: Provide actionable error messages
6. **Test Edge Cases**: Test with maximum values, duplicates, etc.

---

## API Reference

### Validation Functions

#### `validateEmployee(employee, existingEmployees, availablePoints)`
Validates a single employee entry.

**Parameters:**
- `employee`: Partial employee data
- `existingEmployees`: Array of existing employees
- `availablePoints`: Corporate's available points

**Returns:** `{ valid: boolean, errors: string[] }`

#### `validateBulkEmployees(csvData, existingEmployees, availablePoints)`
Validates bulk employee upload.

**Parameters:**
- `csvData`: CSV string with employee data
- `existingEmployees`: Array of existing employees
- `availablePoints`: Corporate's available points

**Returns:** `{ valid: boolean, errors: string[] }`

#### `sanitizeEmployeeData(employee)`
Cleans and normalizes employee data.

**Parameters:**
- `employee`: Raw employee data

**Returns:** Sanitized employee data object

---

## Security Considerations

1. **Authentication Required**: Corporate users must be authenticated
2. **Authorization Checks**: Users can only manage their own employees
3. **Input Sanitization**: All inputs are cleaned before database operations
4. **SQL Injection Prevention**: Using Firebase SDK, not raw queries
5. **XSS Prevention**: Data is sanitized, React handles escaping
6. **Rate Limiting**: Consider implementing rate limits for bulk operations
7. **Audit Trail**: All changes logged via point transactions

---

## Updates and Maintenance

### When to Update Rules
- New business requirements emerge
- Security vulnerabilities are discovered
- User feedback indicates issues
- Regulatory compliance changes

### Testing Requirements
- Test all validation functions with edge cases
- Verify Firestore rules in Firebase Console
- Test bulk upload with maximum size
- Verify point calculations
- Test with insufficient points
- Test duplicate email scenarios

---

## Support and Troubleshooting

### Common Issues

**Issue**: "Insufficient points" error
- **Solution**: Check corporate's available points balance

**Issue**: "Email already exists" error
- **Solution**: Search existing employees for duplicate email

**Issue**: Bulk upload fails silently
- **Solution**: Check browser console for validation errors

**Issue**: Employee limit reached
- **Solution**: Remove inactive employees or contact admin for limit increase

### Getting Help
- Review error messages carefully
- Check validation rules in this document
- Contact system administrator for account issues
- Report bugs with detailed error messages
