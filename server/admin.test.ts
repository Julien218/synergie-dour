import { describe, it, expect, beforeAll, vi } from 'vitest';

vi.mock('./db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./db')>();
  return {
    ...actual,
    createNews: vi.fn(async (data) => data),
    createEvent: vi.fn(async (data) => data),
    createContactRequest: vi.fn(async (data) => data),
  };
});

vi.mock('./email/notifications', () => ({
  sendAdminNewMessageNotification: vi.fn(async () => undefined),
  sendInstantAcknowledgement: vi.fn(async () => undefined),
  sendContractEmail: vi.fn(async () => undefined),
}));

import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

describe('Admin Routes', () => {
  let adminContext: TrpcContext;
  let userContext: TrpcContext;

  beforeAll(async () => {
    // Create admin context
    adminContext = {
      user: {
        id: 1,
        openId: 'admin-test',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin',
        loginMethod: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    };

    // Create regular user context
    userContext = {
      user: {
        id: 2,
        openId: 'user-test',
        name: 'Regular User',
        email: 'user@test.com',
        role: 'user',
        loginMethod: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    };
  });

  describe('News Admin Routes', () => {
    it('should allow admin to list all news', async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.news.listAll();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should deny regular user from listing all news', async () => {
      const caller = appRouter.createCaller(userContext);
      await expect(caller.news.listAll()).rejects.toThrow();
    });

    it('should allow admin to create news', async () => {
      const caller = appRouter.createCaller(adminContext);
      const newsData = {
        title: 'Test News',
        content: 'Test content',
        excerpt: 'Test excerpt',
        authorId: adminContext.user!.id,
        status: 'draft' as const,
      };
      
      const result = await caller.news.create(newsData);
      expect(result).toBeDefined();
    });
  });

  describe('Events Admin Routes', () => {
    it('should allow admin to list all events', async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.events.listAll();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should deny regular user from listing all events', async () => {
      const caller = appRouter.createCaller(userContext);
      await expect(caller.events.listAll()).rejects.toThrow();
    });

    it('should allow admin to create event', async () => {
      const caller = appRouter.createCaller(adminContext);
      const eventData = {
        title: 'Test Event',
        description: 'Test description',
        startDate: new Date(),
        authorId: adminContext.user!.id,
        status: 'draft' as const,
      };
      
      const result = await caller.events.create(eventData);
      expect(result).toBeDefined();
    });
  });

  describe('Merchants Admin Routes', () => {
    it('should allow admin to list all merchants', async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.merchants.listAll();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should deny regular user from listing all merchants', async () => {
      const caller = appRouter.createCaller(userContext);
      await expect(caller.merchants.listAll()).rejects.toThrow();
    });
  });

  describe('Membership Requests Admin Routes', () => {
    it('should allow admin to list all membership requests', async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.membership.listAll();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should deny regular user from listing membership requests', async () => {
      const caller = appRouter.createCaller(userContext);
      await expect(caller.membership.listAll()).rejects.toThrow();
    });
  });

  describe('Contact Requests Admin Routes', () => {
    it('should allow admin to list all contact requests', async () => {
      const caller = appRouter.createCaller(adminContext);
      const result = await caller.contact.listAll();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should deny regular user from listing contact requests', async () => {
      const caller = appRouter.createCaller(userContext);
      await expect(caller.contact.listAll()).rejects.toThrow();
    });

    it('should reject a public contact request without explicit RGPD consent', async () => {
      const caller = appRouter.createCaller({ user: null });
      await expect(caller.contact.submit({
        name: 'Test Contact',
        email: 'contact@example.com',
        subject: 'Question',
        message: 'Bonjour',
        rgpdConsent: false,
      })).rejects.toThrow('consentement RGPD');
    });

    it('should record explicit RGPD consent for a valid public contact request', async () => {
      const caller = appRouter.createCaller({ user: null });
      const result = await caller.contact.submit({
        name: ' Test Contact ',
        email: 'CONTACT@example.com',
        phone: '',
        subject: ' Question ',
        message: ' Bonjour ',
        rgpdConsent: true,
      });

      expect(result).toMatchObject({
        name: 'Test Contact',
        email: 'contact@example.com',
        phone: null,
        subject: 'Question',
        message: 'Bonjour',
        rgpdConsent: 1,
        status: 'new',
      });
      expect(result.rgpdConsentAt).toBeInstanceOf(Date);
    });
  });
});
