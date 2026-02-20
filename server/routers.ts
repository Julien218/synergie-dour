import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
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
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
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
});

export type AppRouter = typeof appRouter;
