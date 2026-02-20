import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
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
  }),

  // Contact requests
  contact: router({
    submit: publicProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      return createContactRequest(input as any);
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
  }),
});

export type AppRouter = typeof appRouter;
