/**
 * Employee Validation Rules and Utilities
 *
 * This module contains all validation rules for adding employees
 * to the corporate dashboard.
 */

export interface EmployeeValidationResult {
  valid: boolean;
  errors: string[];
}

export interface EmployeeData {
  email: string;
  name: string;
  points: number;
  corporateId: string;
  corporateCompany?: string;
}

/**
 * Validation Rules for Employee Creation:
 *
 * 1. Email Format: Must be a valid email address
 * 2. Email Domain: Can optionally restrict to corporate domain
 * 3. Name: Must be at least 2 characters, max 100 characters
 * 4. Points: Must be non-negative integer, max per employee limit
 * 5. Duplicate Check: Email must be unique within corporate
 * 6. Point Budget: Corporate must have sufficient points
 */

// Validation Constants
export const VALIDATION_RULES = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_POINTS: 0,
  MAX_POINTS_PER_EMPLOYEE: 10000,
  MAX_EMPLOYEES_PER_CORPORATE: 1000,
  MAX_BULK_UPLOAD_SIZE: 100,
} as const;

/**
 * Validates email format
 */
export function validateEmail(email: string): EmployeeValidationResult {
  const errors: string[] = [];

  if (!email || !email.trim()) {
    errors.push('Email is required');
    return { valid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    errors.push('Invalid email format');
  }

  if (email.length > 254) {
    errors.push('Email is too long (max 254 characters)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates employee name
 */
export function validateName(name: string): EmployeeValidationResult {
  const errors: string[] = [];

  if (!name || !name.trim()) {
    errors.push('Name is required');
    return { valid: false, errors };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < VALIDATION_RULES.MIN_NAME_LENGTH) {
    errors.push(`Name must be at least ${VALIDATION_RULES.MIN_NAME_LENGTH} characters`);
  }

  if (trimmedName.length > VALIDATION_RULES.MAX_NAME_LENGTH) {
    errors.push(`Name must not exceed ${VALIDATION_RULES.MAX_NAME_LENGTH} characters`);
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
  if (!nameRegex.test(trimmedName)) {
    errors.push('Name contains invalid characters. Only letters, spaces, hyphens, apostrophes, and periods are allowed');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates point allocation
 */
export function validatePoints(points: number, availablePoints: number): EmployeeValidationResult {
  const errors: string[] = [];

  if (typeof points !== 'number' || isNaN(points)) {
    errors.push('Points must be a valid number');
    return { valid: false, errors };
  }

  if (points < VALIDATION_RULES.MIN_POINTS) {
    errors.push(`Points cannot be negative`);
  }

  if (points > VALIDATION_RULES.MAX_POINTS_PER_EMPLOYEE) {
    errors.push(`Points per employee cannot exceed ${VALIDATION_RULES.MAX_POINTS_PER_EMPLOYEE}`);
  }

  if (points > availablePoints) {
    errors.push(`Insufficient points. You have ${availablePoints} points available, but trying to allocate ${points} points`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates email uniqueness within a corporate
 */
export function validateUniqueEmail(
  email: string,
  existingEmployees: EmployeeData[]
): EmployeeValidationResult {
  const errors: string[] = [];

  const emailLower = email.toLowerCase().trim();
  const isDuplicate = existingEmployees.some(
    emp => emp.email.toLowerCase().trim() === emailLower
  );

  if (isDuplicate) {
    errors.push('An employee with this email already exists');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates corporate employee limit
 */
export function validateEmployeeLimit(
  currentEmployeeCount: number
): EmployeeValidationResult {
  const errors: string[] = [];

  if (currentEmployeeCount >= VALIDATION_RULES.MAX_EMPLOYEES_PER_CORPORATE) {
    errors.push(`Maximum employee limit reached (${VALIDATION_RULES.MAX_EMPLOYEES_PER_CORPORATE})`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a single employee entry
 */
export function validateEmployee(
  employee: Partial<EmployeeData>,
  existingEmployees: EmployeeData[],
  availablePoints: number
): EmployeeValidationResult {
  const allErrors: string[] = [];

  // Validate email
  const emailResult = validateEmail(employee.email || '');
  allErrors.push(...emailResult.errors);

  // Validate name
  const nameResult = validateName(employee.name || '');
  allErrors.push(...nameResult.errors);

  // Validate points
  const pointsResult = validatePoints(employee.points || 0, availablePoints);
  allErrors.push(...pointsResult.errors);

  // Validate uniqueness (only if email is valid)
  if (emailResult.valid && employee.email) {
    const uniqueResult = validateUniqueEmail(employee.email, existingEmployees);
    allErrors.push(...uniqueResult.errors);
  }

  // Validate employee limit
  const limitResult = validateEmployeeLimit(existingEmployees.length);
  allErrors.push(...limitResult.errors);

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validates bulk employee upload
 */
export function validateBulkEmployees(
  csvData: string,
  existingEmployees: EmployeeData[],
  availablePoints: number
): EmployeeValidationResult {
  const errors: string[] = [];
  const lines = csvData.trim().split('\n');

  // Check bulk upload size limit
  if (lines.length > VALIDATION_RULES.MAX_BULK_UPLOAD_SIZE) {
    errors.push(`Bulk upload limited to ${VALIDATION_RULES.MAX_BULK_UPLOAD_SIZE} employees per batch`);
    return { valid: false, errors };
  }

  if (lines.length === 0) {
    errors.push('No employee data provided');
    return { valid: false, errors };
  }

  const parsedEmployees: Partial<EmployeeData>[] = [];
  let totalPointsNeeded = 0;
  const emailsSeen = new Set<string>();

  // Parse and validate each line
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const [email, name, points = '100'] = line.split(',').map(s => s.trim());

    if (!email && !name) {
      // Skip empty lines
      return;
    }

    const employee: Partial<EmployeeData> = {
      email,
      name,
      points: parseInt(points) || 0
    };

    // Validate email
    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      errors.push(`Line ${lineNum}: ${emailResult.errors.join(', ')}`);
    }

    // Check for duplicates within the upload
    const emailLower = email.toLowerCase().trim();
    if (emailsSeen.has(emailLower)) {
      errors.push(`Line ${lineNum}: Duplicate email in upload - ${email}`);
    }
    emailsSeen.add(emailLower);

    // Check for duplicates with existing employees
    const uniqueResult = validateUniqueEmail(email, existingEmployees);
    if (!uniqueResult.valid) {
      errors.push(`Line ${lineNum}: ${uniqueResult.errors.join(', ')}`);
    }

    // Validate name
    const nameResult = validateName(name);
    if (!nameResult.valid) {
      errors.push(`Line ${lineNum}: ${nameResult.errors.join(', ')}`);
    }

    // Validate points format
    if (isNaN(parseInt(points))) {
      errors.push(`Line ${lineNum}: Invalid points value - ${points}`);
    } else {
      const pointsNum = parseInt(points);
      if (pointsNum < 0) {
        errors.push(`Line ${lineNum}: Points cannot be negative`);
      }
      if (pointsNum > VALIDATION_RULES.MAX_POINTS_PER_EMPLOYEE) {
        errors.push(`Line ${lineNum}: Points exceed maximum (${VALIDATION_RULES.MAX_POINTS_PER_EMPLOYEE})`);
      }
      totalPointsNeeded += pointsNum;
    }

    parsedEmployees.push(employee);
  });

  // Check total employee limit
  if (existingEmployees.length + parsedEmployees.length > VALIDATION_RULES.MAX_EMPLOYEES_PER_CORPORATE) {
    errors.push(`Adding ${parsedEmployees.length} employees would exceed maximum limit of ${VALIDATION_RULES.MAX_EMPLOYEES_PER_CORPORATE}`);
  }

  // Validate total points budget
  if (totalPointsNeeded > availablePoints) {
    errors.push(`Insufficient points. Need ${totalPointsNeeded} points but only have ${availablePoints} available`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes employee data before submission
 */
export function sanitizeEmployeeData(employee: Partial<EmployeeData>): Partial<EmployeeData> {
  return {
    email: employee.email?.trim().toLowerCase(),
    name: employee.name?.trim().replace(/\s+/g, ' '),
    points: Math.max(0, Math.floor(employee.points || 0)),
    corporateId: employee.corporateId,
    corporateCompany: employee.corporateCompany
  };
}
