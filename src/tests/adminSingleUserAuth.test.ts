import { describe, it, expect, vi } from 'vitest';
import {
  ENFORCED_ADMIN_EMAIL,
  ENFORCED_ADMIN_PASSWORD,
  ALLOW_ADMIN_REGISTRATION,
  loginAdmin,
  registerAdminUser,
  verifyAdminStatus
} from '../../admin-panel/src/services/adminAuthService';

describe('Admin Panel Single-User Authentication & Restriction Tests', () => {
  it('1. should strictly hardcode the single authorized admin credentials', () => {
    expect(ENFORCED_ADMIN_EMAIL).toBe('domnicsanjay2009@gmail.com');
    expect(ENFORCED_ADMIN_PASSWORD).toBe('sanjay0920');
    expect(ALLOW_ADMIN_REGISTRATION).toBe(false);
  });

  it('2. should reject any login attempt with unauthorized email', async () => {
    const res = await loginAdmin('intruder@example.com', 'sanjay0920');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Access denied: Only the designated platform administrator');
    expect(res.error).toContain('domnicsanjay2009@gmail.com');
  });

  it('3. should reject login attempts with correct email but incorrect password', async () => {
    const res = await loginAdmin('domnicsanjay2009@gmail.com', 'wrongpassword');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid administrator credentials');
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
});
