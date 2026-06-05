import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { loginWithPassword, registerWithPassword, SESSION_COOKIE, SESSION_DURATION_MS, signSession } from "./authService";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure, protectedProcedure } from "./_core/trpc";
import {
  getMerchants,
  getMerchantById,
  getCategories,
  getPublishedNews,
  getNewsById,
  getPublishedEvents,
  getEventById,
  createContactRequest,
  createMembershipRequest,
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getAllMerchants,
  createMerchant,
  updateMerchant,
  deleteMerchant,
  getContactRequests,
  updateContactRequest,
  deleteContactRequest,
  getMembershipRequests,
  updateMembershipRequest,
  deleteMembershipRequest,
  getMerchantByUserId,
  createLocalRequest,
  getLocalRequests,
  updateLocalRequest,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure.input((val: any) => val).mutation(async ({ input, ctx }) => {
      const user = await registerWithPassword(input);
      if (!user) throw new Error("Unable to create user");
      const token = await signSession(user);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_DURATION_MS, path: "/" });
      return user;
    }),
    login: publicProcedure.input((val: any) => val).mutation(async ({ input, ctx }) => {
      const user = await loginWithPassword(input);
      const token = await signSession(user);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_DURATION_MS, path: "/" });
      return user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Merchants routes
  merchants: router({
    list: publicProcedure.query(async () => {
      return getMerchants();
    }),
    getById: publicProcedure.input((val: unknown) => {
      if (typeof val === "number") return val;
      throw new Error("Invalid input");
    }).query(async ({ input }) => {
      return getMerchantById(input);
    }),
    // Admin routes
    listAll: adminProcedure.query(async () => {
      return getAllMerchants();
    }),
    create: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      return createMerchant(input as any);
    }),
    update: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }: any) => {
      const { id, ...data } = input;
      return updateMerchant(id, data);
    }),
    delete: adminProcedure.input((val: unknown) => {
      if (typeof val === "number") return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      return deleteMerchant(input);
    }),
    // Merchant routes
    getMyProfile: protectedProcedure.query(async ({ ctx }) => {
      return getMerchantByUserId(ctx.user.id);
    }),
    updateMyProfile: protectedProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ ctx, input }: any) => {
      const merchant = await getMerchantByUserId(ctx.user.id);
      if (!merchant) throw new Error("Merchant profile not found");
      return updateMerchant(merchant.id, input);
    }),
  }),

  // Categories routes
  categories: router({
    list: publicProcedure.query(async () => {
      return getCategories();
    }),
  }),

  // News routes
  news: router({
    list: publicProcedure.query(async () => {
      return getPublishedNews();
    }),
    getById: publicProcedure.input((val: unknown) => {
      if (typeof val === "number") return val;
      throw new Error("Invalid input");
    }).query(async ({ input }) => {
      return getNewsById(input);
    }),
    // Admin routes
    listAll: adminProcedure.query(async () => {
      return getAllNews();
    }),
    create: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      return createNews(input as any);
    }),
    update: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }: any) => {
      const { id, ...data } = input;
      return updateNews(id, data);
    }),
    delete: adminProcedure.input((val: unknown) => {
      if (typeof val === "number") return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      return deleteNews(input);
    }),
  }),

  // Events routes
  events: router({
    list: publicProcedure.query(async () => {
      return getPublishedEvents();
    }),
    getById: publicProcedure.input((val: unknown) => {
      if (typeof val === "number") return val;
      throw new Error("Invalid input");
    }).query(async ({ input }) => {
      return getEventById(input);
    }),
    // Admin routes
    listAll: adminProcedure.query(async () => {
      return getAllEvents();
    }),
    create: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      return createEvent(input as any);
    }),
    update: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }: any) => {
      const { id, ...data } = input;
      return updateEvent(id, data);
    }),
    delete: adminProcedure.input((val: unknown) => {
      if (typeof val === "number") return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      return deleteEvent(input);
    }),
  }),

  // Contact requests
  contact: router({
    submit: publicProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      return createContactRequest(input as any);
    }),
    // Admin routes
    listAll: adminProcedure.query(async () => {
      return getContactRequests();
    }),
    update: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }: any) => {
      const { id, ...data } = input;
      return updateContactRequest(id, data);
    }),
    delete: adminProcedure.input((val: unknown) => {
      if (typeof val === "number") return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      return deleteContactRequest(input);
    }),
  }),

  // Membership requests
  membership: router({
    request: publicProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      return createMembershipRequest(input as any);
    }),
    // Admin routes
    listAll: adminProcedure.query(async () => {
      return getMembershipRequests();
    }),
    update: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }: any) => {
      const { id, ...data } = input;
      return updateMembershipRequest(id, data);
    }),
    delete: adminProcedure.input((val: unknown) => {
      if (typeof val === "number") return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      return deleteMembershipRequest(input);
    }),
  }),

  // Locaux commerciaux — annonces propriétaires
  locaux: router({
    submit: publicProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      return createLocalRequest(input as any);
    }),
    listAll: adminProcedure.query(async () => {
      return getLocalRequests();
    }),
    updateStatus: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }: any) => {
      const { id, ...data } = input;
      return updateLocalRequest(id, data);
    }),
  }),
  // =====================================================================
  // POSTS PLANIFIÉS — Validation Olivier → Publication réseaux sociaux
  // =====================================================================
  posts: router({
    listAll: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      return db.execute('SELECT * FROM scheduled_posts ORDER BY day_of_week, scheduled_time');
    }),

    listPending: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const [rows] = await db.execute("SELECT * FROM scheduled_posts WHERE status = 'draft' ORDER BY day_of_week");
      return rows;
    }),

    updateStatus: adminProcedure.input((val: unknown) => {
      if (typeof val === 'object' && val !== null) return val;
      throw new Error('Invalid input');
    }).mutation(async ({ input, ctx }: any) => {
      const { id, status } = input;
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(
        'UPDATE scheduled_posts SET status=?, approved_by=?, approved_at=?, updatedAt=? WHERE id=?',
        [status, ctx.user.id, now, now, id]
      );
      return { success: true };
    }),

    create: adminProcedure.input((val: unknown) => {
      if (typeof val === 'object' && val !== null) return val;
      throw new Error('Invalid input');
    }).mutation(async ({ input }: any) => {
      const { title, content, day_of_week, scheduled_time, platforms, source_type } = input;
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await db.execute(
        'INSERT INTO scheduled_posts (title, content, day_of_week, scheduled_time, platforms, status, source_type) VALUES (?, ?, ?, ?, ?, 'draft', ?)',
        [title, content, day_of_week, scheduled_time || '09:00:00', platforms || 'facebook,instagram', source_type || 'manual']
      );
      return { success: true };
    }),

    delete: adminProcedure.input((val: unknown) => {
      if (typeof val === 'object' && val !== null) return val;
      throw new Error('Invalid input');
    }).mutation(async ({ input }: any) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await db.execute('DELETE FROM scheduled_posts WHERE id=?', [input.id]);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
