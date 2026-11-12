/**
 * Form and Security Validators matching system specifications
 */

export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\+]/g, '');
  // Exactly 10 digits (ignoring optional country code 91 if present)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return /^\d{10}$/.test(cleaned.slice(2));
  }
  return /^\d{10}$/.test(cleaned);
}

export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function isValidPIN(pin: string): { valid: boolean; error?: string } {
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain digits only.' };
  }
  if (pin.length < 4 || pin.length > 6) {
    return { valid: false, error: 'PIN must be between 4 and 6 digits.' };
  }
  return { valid: true };
}

export function isValidPassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 4) {
    return { valid: false, error: 'Password must be at least 4 characters long.' };
  }
  return { valid: true };
}
