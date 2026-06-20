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
import { sendAdminNewMessageNotification } from "./email/notifications";

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
    }).mutation(async ({ input }: any) => {
      const result = await createContactRequest(input as any);
      sendAdminNewMessageNotification({
        type: "contact",
        name: input.name ?? "",
        email: input.email ?? "",
        subject: input.subject ?? "",
        message: input.message ?? "",
      }).catch(() => {});
      return result;
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

  // Membership requests — enrichi (indépendants, PME, ASBL, professions libérales)
  membership: router({
    request: publicProcedure.input((val: unknown) => {
      if (typeof val !== "object" || val === null) throw new Error("Invalid input");
      const v = val as Record<string, unknown>;
      // Champs obligatoires
      if (!v.businessName || typeof v.businessName !== "string") throw new Error("businessName requis");
      if (!v.contactName  || typeof v.contactName  !== "string") throw new Error("contactName requis");
      if (!v.email        || typeof v.email        !== "string") throw new Error("email requis");
      if (!v.phone        || typeof v.phone        !== "string") throw new Error("phone requis");
      if (!v.address      || typeof v.address      !== "string") throw new Error("address requis");
      if (!v.rgpdConsent) throw new Error("Le consentement RGPD est obligatoire");
      return v;
    }).mutation(async ({ input }) => {
      const data = input as any;
      const memberResult = await createMembershipRequest({
        businessName:        data.businessName,
        businessCategory:    data.businessCategory    || "",
        structureType:       data.structureType       || null,
        vatNumber:           data.vatNumber           || null,
        sector:              data.sector              || null,
        website:             data.website             || null,
        socialMedia:         data.socialMedia         || null,
        employeeCount:       data.employeeCount       || null,
        contactName:         data.contactName,
        email:               data.email,
        phone:               data.phone,
        address:             data.address,
        message:             data.message             || null,
        howDidYouHear:       data.howDidYouHear       || null,
        acceptsEmailContact: data.acceptsEmailContact ? 1 : 0,
        rgpdConsent:         data.rgpdConsent         ? 1 : 0,
      });
      sendAdminNewMessageNotification({
        type: "membership",
        name: data.contactName ?? "",
        email: data.email ?? "",
        businessName: data.businessName ?? "",
        message: data.message ?? "",
      }).catch(() => {});
      return memberResult;
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
    // Query publique — annonces publiées (BienCommercial via API Base44 + local_requests publiées)
    listPublished: publicProcedure.query(async () => {
      const results: any[] = [];

      // 1. Lire les biens_commerciaux depuis MySQL Railway (source unique)
      try {
        const db = await getDb();
        if (db) {
          const [rows] = await db.execute(
            "SELECT id, titre, adresse, village, surface, loyer, type_bien, description, source, url_source, agence, statut, createdAt FROM biens_commerciaux ORDER BY createdAt DESC"
          ) as any;
          for (const b of (rows as any[])) {
            results.push({ ...b, source: b.source || "Immoweb" });
          }
          console.log(`[locaux] ${(rows as any[]).length} biens chargés depuis MySQL`);
        }
      } catch (e) {
        console.error("[locaux] biens_commerciaux MySQL error:", e);
      }

      // 2. Lire les annonces soumises via formulaire (table local_requests publiées)
      try {
        const db = await getDb();
        if (db) {
          const [rows] = await db.execute(
            "SELECT id, titre, adresse, village, surface, loyer, type_bien, description, url_source, createdAt FROM local_requests WHERE status = 'published' ORDER BY createdAt DESC"
          ) as any;
          for (const r of rows as any[]) {
            results.push({ ...r, source: "Annonce" });
          }
        }
      } catch (_) {}

      return results;
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
  // =============================================================
  // POSTS PLANIFIÉS — Validation Olivier => Publication réseaux
  // =============================================================
  posts: router({
    listAll: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [rows] = await db.execute("SELECT * FROM scheduled_posts ORDER BY day_of_week, scheduled_time");
      return rows;
    }),

    listPending: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [rows] = await db.execute("SELECT * FROM scheduled_posts WHERE status = 'draft' ORDER BY day_of_week");
      return rows;
    }),

    updateStatus: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input, ctx }: any) => {
      const { id, status } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      await db.execute(
        "UPDATE scheduled_posts SET status=?, approved_by=?, approved_at=?, updatedAt=? WHERE id=?",
        [status, ctx.user.id, now, now, id]
      );
      return { success: true };
    }),

    create: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }: any) => {
      const { title, content: postContent, day_of_week, scheduled_time, platforms, source_type } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.execute(
        "INSERT INTO scheduled_posts (title, content, day_of_week, scheduled_time, platforms, status, source_type) VALUES (?, ?, ?, ?, ?, 'draft', ?)",
        [title, postContent, day_of_week, scheduled_time || "09:00:00", platforms || "facebook,instagram", source_type || "manual"]
      );
      return { success: true };
    }),

    delete: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }: any) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.execute("DELETE FROM scheduled_posts WHERE id=?", [input.id]);
      return { success: true };
    }),
  }),

  // ── INBOX — compteur messages non lus ──────────────────────────────────
  inbox: router({
    unreadCount: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { contacts: 0, memberships: 0, total: 0 };
      const [cr] = await db.execute("SELECT COUNT(*) as count FROM contact_requests WHERE status = 'new'");
      const [mr] = await db.execute("SELECT COUNT(*) as count FROM membership_requests WHERE status = 'pending'");
      const c = Number((cr as any[])[0]?.count ?? 0);
      const m = Number((mr as any[])[0]?.count ?? 0);
      return { contacts: c, memberships: m, total: c + m };
    }),
  }),
});

export type AppRouter = typeof appRouter;
