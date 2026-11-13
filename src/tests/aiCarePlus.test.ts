// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiHandler from '../../api/index.js';

describe('AI Care Plus Customer Support Integration (Gemini Powered)', () => {
  let fetchSpy: any;
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test_mock_gemini_api_key';
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'Hello from AI Care Plus! I can explain pledge bills, interest calculations, closures, and subscriptions in English, Tamil, and Tanglish.'
                    }
                  ]
                }
              }
            ]
          })
        } as any;
      }
      return { ok: false, status: 404 } as any;
    });
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalEnv;
    if (fetchSpy) fetchSpy.mockRestore();
  });

  const mockRes = () => {
    let statusCode = 200;
    let bodyData: any = null;
    const res: any = {
      setHeader: () => {},
      end: (str?: string) => {
        if (str) {
          try {
            bodyData = JSON.parse(str);
          } catch {
            bodyData = str;
          }
        }
      }
    };
    Object.defineProperty(res, 'statusCode', {
      set: (code) => { statusCode = code; },
      get: () => statusCode
    });
    return { res, getStatusCode: () => statusCode, getBody: () => bodyData };
  };

  describe('1. Serverless Endpoint Routing & Method Guards (/api/ask-gemini)', () => {
    it('should reject non-POST methods with 405', async () => {
      const { res, getStatusCode, getBody } = mockRes();
      const req: any = { method: 'GET', url: '/api/ask-gemini', headers: {} };

      await apiHandler(req, res);
      expect(getStatusCode()).toBe(405);
      expect(getBody().error).toContain('Method not allowed');
    });

    it('should reject requests with missing or empty question with 400', async () => {
      const { res, getStatusCode, getBody } = mockRes();
      const req: any = {
        method: 'POST',
        url: '/api/ask-gemini',
        headers: {},
        body: { question: '   ' }
      };

      await apiHandler(req, res);
      expect(getStatusCode()).toBe(400);
      expect(getBody().error).toContain('Question is required');
    });
  });

  describe('2. AI Care Plus Live Response Generation (Gemini API)', () => {
    it('should generate responses using persona "AI Care Plus" when Gemini succeeds', async () => {
      const { res, getStatusCode, getBody } = mockRes();
      const req: any = {
        method: 'POST',
        url: '/api/ask-gemini',
        headers: {},
        body: {
          question: 'How do I add a new pledge bill for a customer?',
          context: {
            shopName: 'GS Pawn Shop',
            ownerName: 'Dominic Sanjay',
            plan: 'Yearly Premium'
          }
        }
      };

      await apiHandler(req, res);
      expect(getStatusCode()).toBe(200);
      expect(getBody().success).toBe(true);
      expect(getBody().persona).toBe('AI Care Plus');
      expect(getBody().source).toBe('gemini_api');
      expect(getBody().text).toContain('AI Care Plus');
    });
  });

  describe('3. Graceful Fallback Handling (Network Delays / Rate Limits)', () => {
    beforeEach(() => {
      // Force fetch to reject/throw to test graceful fallback
      fetchSpy.mockImplementation(async () => {
        throw new Error('Network timeout / Rate limit simulated');
      });
    });

    it('should provide friendly contextual pawn pledge guidance on fallback', async () => {
      const { res, getStatusCode, getBody } = mockRes();
      const req: any = {
        method: 'POST',
        url: '/api/ask-gemini',
        headers: {},
        body: {
          question: 'How do I create a new bill for a customer?',
          context: {
            shopName: 'GS Pawn Shop',
            ownerName: 'Dominic Sanjay',
            plan: 'Yearly Premium'
          }
        }
      };

      await apiHandler(req, res);
      expect(getStatusCode()).toBe(200);
      expect(getBody().success).toBe(true);
      expect(getBody().persona).toBe('AI Care Plus');
      expect(getBody().source).toBe('care_plus_assistant');
      expect(getBody().text).toContain('Bills');
      expect(getBody().text).toContain('Add Bill');
    });

    it('should understand and respond to Tamil / Tanglish questions politely on fallback', async () => {
      const { res, getStatusCode, getBody } = mockRes();
      const req: any = {
        method: 'POST',
        url: '/api/ask-gemini',
        headers: {},
        body: {
          question: 'Vanakkam, bill eppadi close panradhu solunga?',
          context: {
            shopName: 'GS Pawn Shop',
            ownerName: 'Dominic Sanjay',
            plan: 'Yearly Premium'
          }
        }
      };

      await apiHandler(req, res);
      expect(getStatusCode()).toBe(200);
      expect(getBody().success).toBe(true);
      expect(getBody().persona).toBe('AI Care Plus');
      expect(getBody().text).toMatch(/வணக்கம்|vanakkam/i);
    });

    it('should explain interest calculation rules accurately on fallback', async () => {
      const { res, getStatusCode, getBody } = mockRes();
      const req: any = {
        method: 'POST',
        url: '/api/ask-gemini',
        headers: {},
        body: {
          question: 'How is interest calculated on pledge loans?',
          context: {
            shopName: 'GS Pawn Shop',
            ownerName: 'Dominic Sanjay',
            plan: 'Yearly Premium'
          }
        }
      };

      await apiHandler(req, res);
      expect(getStatusCode()).toBe(200);
      expect(getBody().success).toBe(true);
      expect(getBody().text.toLowerCase()).toContain('interest');
      expect(getBody().text.toLowerCase()).toContain('principal');
    });

    it('should explain bill closure, Plus/Minus adjustments, and redemption steps on fallback', async () => {
      const { res, getStatusCode, getBody } = mockRes();
      const req: any = {
        method: 'POST',
        url: '/api/ask-gemini',
        headers: {},
        body: {
          question: 'What are the steps to settle and redeem a closed bill?',
          context: {
            shopName: 'GS Pawn Shop',
            ownerName: 'Dominic Sanjay',
            plan: 'Yearly Premium'
          }
        }
      };

      await apiHandler(req, res);
      expect(getStatusCode()).toBe(200);
      expect(getBody().success).toBe(true);
      expect(getBody().text).toContain('Close');
      expect(getBody().text).toContain('Adjustment');
    });

    it('should explain subscription plans and device allocations on fallback', async () => {
      const { res, getStatusCode, getBody } = mockRes();
      const req: any = {
        method: 'POST',
        url: '/api/ask-gemini',
        headers: {},
        body: {
          question: 'What are the subscription plans available?',
          context: {
            shopName: 'GS Pawn Shop',
            ownerName: 'Dominic Sanjay',
            plan: 'Yearly Premium'
          }
        }
      };

      await apiHandler(req, res);
      expect(getStatusCode()).toBe(200);
      expect(getBody().success).toBe(true);
      expect(getBody().text).toContain('1,999');
      expect(getBody().text).toContain('2,999');
      expect(getBody().text).toContain('devices');
    });
  });
});

