import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PLANS } from '../services/subscriptionService';

describe('Razorpay Compliance - Public Legal & Information Pages Validation', () => {
  const confirmedBusinessDetails = {
    businessName: 'GS Pawn shop management',
    officialEmail: 'domnicsanjay2009@gmail.com',
    businessPhone: '+91 9363200295',
    businessAddress: 'Ponneri, Thiruvallur, Tamil Nadu, India',
    productionWebsite: 'https://pawnshopmanagement.vercel.app/'
  };

  const projectRoot = path.resolve(__dirname, '../../');

  describe('1. Verifying vercel.json SPA Routing Rewrites', () => {
    it('should have wildcard SPA rewrite configured to prevent 404s on direct refresh', () => {
      const vercelJsonPath = path.join(projectRoot, 'vercel.json');
      const content = fs.readFileSync(vercelJsonPath, 'utf-8');
      const vercelConfig = JSON.parse(content);

      expect(vercelConfig.rewrites).toBeDefined();
      const spaRewrite = vercelConfig.rewrites.find(
        (r: any) => r.source === '/(.*)' && r.destination === '/index.html'
      );
      expect(spaRewrite).toBeDefined();
    });
  });

  describe('2. Verifying Pricing and Subscription Service Invariants', () => {
    it('should match published pricing for Yearly (₹1,999) and Yearly Premium (₹2,999)', () => {
      expect(PLANS.YEARLY.priceRupees).toBe(1999);
      expect(PLANS.PREMIUM.priceRupees).toBe(2999);
    });

    it('should configure Razorpay checkout options with exact business name', () => {
      const subscriptionServicePath = path.join(projectRoot, 'src/services/subscriptionService.ts');
      const content = fs.readFileSync(subscriptionServicePath, 'utf-8');
      expect(content).toContain("name: 'GS Pawn shop management'");
      expect(content).toContain('GS Pawn shop management software service');
    });
  });

  describe('3. Verifying Public Pages and Business Information', () => {
    const publicPages = [
      'AboutUsPage.tsx',
      'ContactUsPage.tsx',
      'TermsAndConditionsPage.tsx',
      'RefundPolicyPage.tsx',
      'PrivacyPolicyPage.tsx',
      'PublicHeader.tsx',
      'PublicFooter.tsx'
    ];

    it('all 5 public pages and headers/footers must exist', () => {
      for (const page of publicPages) {
        const filePath = path.join(projectRoot, 'src/components/public', page);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });

    it('all public pages must accurately state confirmed business name', () => {
      for (const page of publicPages) {
        const filePath = path.join(projectRoot, 'src/components/public', page);
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toContain(confirmedBusinessDetails.businessName);
      }
    });

    it('ContactUsPage and PublicHeader must contain exact business email and phone with mailto/tel links', () => {
      const contactPageContent = fs.readFileSync(
        path.join(projectRoot, 'src/components/public/ContactUsPage.tsx'),
        'utf-8'
      );
      expect(contactPageContent).toContain(confirmedBusinessDetails.officialEmail);
      expect(contactPageContent).toContain(confirmedBusinessDetails.businessPhone);
      expect(contactPageContent).toContain(`mailto:${confirmedBusinessDetails.officialEmail}`);
      expect(contactPageContent).toContain('tel:+919363200295');

      const headerContent = fs.readFileSync(
        path.join(projectRoot, 'src/components/public/PublicHeader.tsx'),
        'utf-8'
      );
      expect(headerContent).toContain(`mailto:${confirmedBusinessDetails.officialEmail}`);
      expect(headerContent).toContain('tel:+919363200295');
    });

    it('RefundPolicyPage must enforce decisions 6.1 through 6.6', () => {
      const refundPolicyContent = fs.readFileSync(
        path.join(projectRoot, 'src/components/public/RefundPolicyPage.tsx'),
        'utf-8'
      );
      // 6.1: No post-activation refunds
      expect(refundPolicyContent).toContain('Activated Subscriptions — No Refunds');
      // 6.2: Duplicate payment review
      expect(refundPolicyContent).toContain('Duplicate Payments — Case-by-Case Review');
      // 6.3: Failed payments bank reversal
      expect(refundPolicyContent).toContain('Failed Payments — Payment Provider Reversal Process');
      // 6.4: Continuation of service until period ends
      expect(refundPolicyContent).toContain('Subscription Cancellation — Access Continues Until End of Paid Term');
      // 6.5: Step-by-step inquiry submission
      expect(refundPolicyContent).toContain('Refund &amp; Review Request Procedure');
      // 6.6: Commitment to transparency
      expect(refundPolicyContent).toContain('Policy Transparency &amp; Contact Information');
    });

    it('TermsAndConditionsPage must disclaim banking/money lending operations', () => {
      const termsContent = fs.readFileSync(
        path.join(projectRoot, 'src/components/public/TermsAndConditionsPage.tsx'),
        'utf-8'
      );
      expect(termsContent).toContain('strictly a software management tool');
      expect(termsContent).toContain('We do not provide money loans');
      expect(termsContent).toContain('laws of India');
    });

    it('PrivacyPolicyPage must reflect India data residency and multi-tenant security', () => {
      const privacyContent = fs.readFileSync(
        path.join(projectRoot, 'src/components/public/PrivacyPolicyPage.tsx'),
        'utf-8'
      );
      expect(privacyContent).toContain('Mumbai, India');
      expect(privacyContent).toContain('Multi-Tenant Data Isolation');
    });
  });

  describe('4. Verifying Server Contact Endpoint', () => {
    it('backend server must implement POST /api/contact endpoint', () => {
      const serverPath = path.join(projectRoot, 'backend/server.js');
      const content = fs.readFileSync(serverPath, 'utf-8');
      expect(content).toContain("app.post('/api/contact'");
      expect(content).toContain('support_inquiries');
    });
  });

  describe('5. Verifying App Routing Integration', () => {
    it('src/App.tsx must route to all 5 public pages without requiring authentication', () => {
      const appPath = path.join(projectRoot, 'src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');
      expect(content).toContain('/about-us');
      expect(content).toContain('/contact-us');
      expect(content).toContain('/terms-and-conditions');
      expect(content).toContain('/refund-policy');
      expect(content).toContain('/privacy-policy');
      expect(content).toContain('<AboutUsPage onNavigate={navigateTo} />');
      expect(content).toContain('<ContactUsPage onNavigate={navigateTo} />');
      expect(content).toContain('<TermsAndConditionsPage onNavigate={navigateTo} />');
      expect(content).toContain('<RefundPolicyPage onNavigate={navigateTo} />');
      expect(content).toContain('<PrivacyPolicyPage onNavigate={navigateTo} />');
    });
  });
});
