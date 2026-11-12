import { describe, it, expect } from 'vitest';
import { isValidIndianPhone, isValidEmail, isValidPIN, isValidPassword } from '../utils/validators';

describe('Validators', () => {
  it('validates 10-digit Indian phone numbers', () => {
    expect(isValidIndianPhone('9876543210')).toBe(true);
    expect(isValidIndianPhone('98765 43210')).toBe(true);
    expect(isValidIndianPhone('+919876543210')).toBe(true);
    expect(isValidIndianPhone('987654321')).toBe(false); // 9 digits
    expect(isValidIndianPhone('98765432100')).toBe(false); // 11 digits
    expect(isValidIndianPhone('abcdefghij')).toBe(false);
  });

  it('validates email addresses', () => {
    expect(isValidEmail('owner@shop.com')).toBe(true);
    expect(isValidEmail('user.name+tag@example.co.in')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
  });

  it('validates PIN length (4 to 6 digits)', () => {
    expect(isValidPIN('1234').valid).toBe(true);
    expect(isValidPIN('123456').valid).toBe(true);
    expect(isValidPIN('123').valid).toBe(false);
    expect(isValidPIN('1234567').valid).toBe(false);
    expect(isValidPIN('12a4').valid).toBe(false);
  });

  it('validates Password length (min 4 chars)', () => {
    expect(isValidPassword('abcd').valid).toBe(true);
    expect(isValidPassword('strongSecret123').valid).toBe(true);
    expect(isValidPassword('abc').valid).toBe(false);
  });
});
