import { describe, it, expect, vi } from 'vitest';
import {
  ENFORCED_ADMIN_EMAIL,
  ENFORCED_ADMIN_PASSWORD,
  ALLOW_ADMIN_REGISTRATION,
  loginAdmin,
  registerAdminUser,
  verifyAdminStatus,
  sendAdminPasswordReset,
  verifyAdminPasswordResetCode,
  confirmAdminPasswordResetAndLogin,
  getEffectiveAdminPassword,
  setRuntimeAdminPassword
} from '../../admin-panel/src/services/adminAuthService';

describe('Admin Panel Single-User Authentication & Restriction Tests', () => {
  it('1. should strictly configure the single authorized admin credentials with VITE fallback', () => {
    expect(ENFORCED_ADMIN_EMAIL).toBe('dominicsanjay2009@gmail.com');
    expect(ENFORCED_ADMIN_PASSWORD).toBe('sanjay0920');
    expect(ALLOW_ADMIN_REGISTRATION).toBe(false);
  });

  it('2. should reject any login attempt with unauthorized email', async () => {
    const res = await loginAdmin('intruder@example.com', 'sanjay0920');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Access denied: Only the designated platform administrator');
    expect(res.error).toContain('dominicsanjay2009@gmail.com');
  });

  it('3. should reject login attempts with correct email but incorrect password', async () => {
    const res = await loginAdmin('dominicsanjay2009@gmail.com', '');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Please enter your administrator password');
  });

  it('4. should prohibit new user registrations with an explicit error', async () => {
    await expect(registerAdminUser()).rejects.toThrow(
      /Prohibited: The Admin Panel enforces strict single-user access/i
    );
  });

  it('5. verifyAdminStatus should reject any user without the exact enforced email', async () => {
    const mockUserUnauthorized = {
      uid: 'unauthorized_uid_123',
      email: 'hacker@malicious.com',
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'global_admin' } })
    } as any;

    const isAllowed = await verifyAdminStatus(mockUserUnauthorized);
    expect(isAllowed).toBe(false);
  });

  describe('Forgot Password & Password Reset Workflow', () => {
    it('6. sendAdminPasswordReset should reject reset requests for unauthorized emails', async () => {
      const res = await sendAdminPasswordReset('unauthorized@test.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Password reset is restricted. Only the designated platform administrator');
      expect(res.error).toContain('dominicsanjay2009@gmail.com');
    });

    it('7. verifyAdminPasswordResetCode should reject empty or invalid reset codes', async () => {
      const resEmpty = await verifyAdminPasswordResetCode('');
      expect(resEmpty.success).toBe(false);
      expect(resEmpty.error).toContain('Invalid or missing password reset code');
    });

    it('8. confirmAdminPasswordResetAndLogin should enforce minimum password length (>= 6)', async () => {
      const resShort = await confirmAdminPasswordResetAndLogin('sample_oob_code_123', '123');
      expect(resShort.success).toBe(false);
      expect(resShort.error).toContain('at least 6 characters');
    });

    it('9. setRuntimeAdminPassword should update effective password and permit immediate login with updated credentials', () => {
      expect(getEffectiveAdminPassword()).toBe('sanjay0920');

      // Admin updates password
      setRuntimeAdminPassword('newUpdatedAdminPass2026');
      expect(getEffectiveAdminPassword()).toBe('newUpdatedAdminPass2026');

      // Reset back for other tests
      setRuntimeAdminPassword('sanjay0920');
      expect(getEffectiveAdminPassword()).toBe('sanjay0920');
    });
  });
});
