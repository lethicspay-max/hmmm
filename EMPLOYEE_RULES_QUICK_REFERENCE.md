# Employee Management Rules - Quick Reference

## Validation Limits

| Rule | Limit |
|------|-------|
| Min Name Length | 2 characters |
| Max Name Length | 100 characters |
| Min Points | 0 |
| Max Points Per Employee | 10,000 |
| Max Employees Per Corporate | 1,000 |
| Max Bulk Upload Size | 100 employees |
| Max Email Length | 254 characters |

## CSV Format for Bulk Upload

```
email,name,points
john@example.com,John Doe,500
jane@example.com,Jane Smith,750
```

- **Delimiter**: Comma (`,`)
- **No Header Row**: Start with data immediately
- **Points Optional**: Defaults to 100 if omitted
- **Empty Lines**: Skipped automatically

## Required Fields

### Single Employee
- Email (valid format)
- Name (2-100 chars)
- Points (0-10,000)

### All Employees
- corporateId (auto-set)
- status (auto-set to 'active')
- createdAt (auto-set)

## Validation Rules

### Email
- Must be valid format (xxx@xxx.xxx)
- Must be unique within corporate
- Case insensitive comparison
- Max 254 characters

### Name
- 2-100 characters
- Letters, spaces, hyphens, apostrophes, periods only
- Trimmed and normalized

### Points
- Must be a number
- Cannot be negative
- Max 10,000 per employee
- Corporate must have sufficient balance

## Security Rules

### Who Can Create Employees?
- Admins (any employee)
- Corporate users (their employees only)
- Self-registration (on company pages)

### Who Can Update Employees?
- Admins (any employee)
- Corporate users (their employees only)
- Employees (limited fields, not points/corporateId)

### Who Can Delete Employees?
- Admins only
- Corporate users (their employees only)

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Insufficient points" | Not enough balance | Check available points |
| "Email already exists" | Duplicate email | Use different email |
| "Maximum employee limit reached" | 1,000 employees | Remove inactive employees |
| "Bulk upload limited to 100" | Too many in batch | Split into smaller batches |
| "Invalid email format" | Email format wrong | Check email syntax |
| "Name must be at least 2 characters" | Name too short | Enter full name |

## Point Management

### Available Points Formula
```
Available = Total Allocated - Used Points
```

### Point Transactions
- Logged for all allocations
- Cannot be reversed (contact admin)
- Includes reason field
- Timestamped

## Best Practices

1. Verify emails before submission
2. Use bulk upload for multiple employees
3. Plan point allocation in advance
4. Monitor employee count regularly
5. Keep employee list updated
6. Use meaningful point allocations
7. Review transaction logs periodically

## Validation Constants

```typescript
VALIDATION_RULES = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_POINTS: 0,
  MAX_POINTS_PER_EMPLOYEE: 10000,
  MAX_EMPLOYEES_PER_CORPORATE: 1000,
  MAX_BULK_UPLOAD_SIZE: 100,
}
```

## Support

For issues with:
- Validation errors: Check this reference
- Point balance: Contact admin
- Employee limits: Contact admin
- System errors: Check browser console
