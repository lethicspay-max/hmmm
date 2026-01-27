/**
 * Employee Authentication Validation for Company Subpages
 *
 * This module contains validation rules for employee login and registration
 * on company subpages.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validation Constants
 */
export const AUTH_VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128,
  MAX_EMAIL_LENGTH: 254,
  PASSWORD_REQUIRED_MESSAGE: 'Password is required',
  EMAIL_REQUIRED_MESSAGE: 'Email is required',
} as const;

/**
 * Validates email format
 */
export function validateEmailFormat(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || !email.trim()) {
    errors.push(AUTH_VALIDATION_RULES.EMAIL_REQUIRED_MESSAGE);
    return { valid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    errors.push('Please enter a valid email address');
  }

  if (email.length > AUTH_VALIDATION_RULES.MAX_EMAIL_LENGTH) {
    errors.push(`Email is too long (max ${AUTH_VALIDATION_RULES.MAX_EMAIL_LENGTH} characters)`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates password for first-time setup
 */
export function validatePasswordCreation(
  password: string,
  confirmPassword: string
): ValidationResult {
  const errors: string[] = [];

  // Check password
  if (!password || !password.trim()) {
    errors.push(AUTH_VALIDATION_RULES.PASSWORD_REQUIRED_MESSAGE);
  } else {
    if (password.length < AUTH_VALIDATION_RULES.MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${AUTH_VALIDATION_RULES.MIN_PASSWORD_LENGTH} characters long`);
    }

    if (password.length > AUTH_VALIDATION_RULES.MAX_PASSWORD_LENGTH) {
      errors.push(`Password is too long (max ${AUTH_VALIDATION_RULES.MAX_PASSWORD_LENGTH} characters)`);
    }
  }

  // Check confirmation password
  if (!confirmPassword || !confirmPassword.trim()) {
    errors.push('Please confirm your password');
  } else if (password && password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates password for login
 */
export function validatePasswordLogin(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password || !password.trim()) {
    errors.push(AUTH_VALIDATION_RULES.PASSWORD_REQUIRED_MESSAGE);
    return { valid: false, errors };
  }

  if (password.length < AUTH_VALIDATION_RULES.MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${AUTH_VALIDATION_RULES.MIN_PASSWORD_LENGTH} characters long`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates complete first-time setup form
 */
export function validateFirstTimeSetup(
  email: string,
  password: string,
  confirmPassword: string
): ValidationResult {
  const allErrors: string[] = [];

  // Validate email
  const emailResult = validateEmailFormat(email);
  allErrors.push(...emailResult.errors);

  // Validate password creation
  const passwordResult = validatePasswordCreation(password, confirmPassword);
  allErrors.push(...passwordResult.errors);

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Validates complete login form
 */
export function validateLoginForm(
  email: string,
  password: string
): ValidationResult {
  const allErrors: string[] = [];

  // Validate email
  const emailResult = validateEmailFormat(email);
  allErrors.push(...emailResult.errors);

  // Validate password
  const passwordResult = validatePasswordLogin(password);
  allErrors.push(...passwordResult.errors);

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Sanitizes email input
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Gets user-friendly error message for Firebase Auth errors
 */
export function getAuthErrorMessage(errorCode: string): string {
  const errorMessages: { [key: string]: string } = {
    'auth/email-already-in-use': 'An account with this email already exists. Please try logging in instead.',
    'auth/invalid-email': 'Invalid email address format.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled. Please contact support.',
    'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
    'auth/user-disabled': 'This account has been disabled. Please contact your HR department.',
    'auth/user-not-found': 'No account found with this email. Please check your email or contact HR.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid login credentials. Please try again.',
    'auth/too-many-requests': 'Too many failed login attempts. Please try again later or reset your password.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/popup-closed-by-user': 'Login was cancelled. Please try again.',
    'auth/cancelled-popup-request': 'Another login is already in progress.',
    'auth/popup-blocked': 'Login popup was blocked by browser. Please allow popups and try again.',
  };

  return errorMessages[errorCode] || 'An error occurred during authentication. Please try again.';
}

/**
 * Checks if password is strong (optional, for enhanced security)
 */
export function checkPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (password.length < 8) {
    feedback.push('Use at least 8 characters for better security');
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('Add lowercase letters');
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Add uppercase letters');
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('Add numbers');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push('Add special characters');
  }

  let strength: 'weak' | 'medium' | 'strong';
  if (score <= 2) {
    strength = 'weak';
  } else if (score <= 4) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return { strength, feedback };
}

/**
 * Validates employee status
 */
export function validateEmployeeStatus(status: string): ValidationResult {
  const errors: string[] = [];

  if (status !== 'active') {
    errors.push('Your account is inactive. Please contact your HR department.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates corporate status
 */
export function validateCorporateStatus(status: string): ValidationResult {
  const errors: string[] = [];

  if (status !== 'active') {
    errors.push('This company page is currently inactive. Please contact the company administrator.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates that employee belongs to corporate
 */
export function validateEmployeeCorporateMatch(
  employeeCorporateId: string,
  corporateId: string
): ValidationResult {
  const errors: string[] = [];

  if (employeeCorporateId !== corporateId) {
    errors.push('This employee is not associated with this company.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Comprehensive validation for employee authentication
 */
export function validateEmployeeAuthentication(
  email: string,
  employeeData: any | null,
  corporateId: string,
  corporateStatus: string
): ValidationResult {
  const allErrors: string[] = [];

  // Validate email format
  const emailResult = validateEmailFormat(email);
  allErrors.push(...emailResult.errors);

  // Check if employee exists
  if (!employeeData) {
    allErrors.push('This email is not registered. Please contact your HR department.');
    return { valid: false, errors: allErrors };
  }

  // Validate employee status
  const statusResult = validateEmployeeStatus(employeeData.status);
  allErrors.push(...statusResult.errors);

  // Validate corporate status
  const corporateStatusResult = validateCorporateStatus(corporateStatus);
  allErrors.push(...corporateStatusResult.errors);

  // Validate employee belongs to corporate
  const matchResult = validateEmployeeCorporateMatch(
    employeeData.corporateId,
    corporateId
  );
  allErrors.push(...matchResult.errors);

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}
