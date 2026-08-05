import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { loginWithPassword, registerWithPassword, SESSION_COOKIE, SESSION_DURATION_MS, signSession } from "./authService";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure, protectedProcedure } from "./_core/trpc";
import { getDb, rawQuery, rawExecute } from "./db";
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
import { sendAdminNewMessageNotification, sendInstantAcknowledgement } from "./email/notifications";
import { approveMembershipAndSendInvoice } from "./membership/workflow";
import { TRPCError } from "@trpc/server";

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
    }).mutation(async ({ input, ctx }) => {
      // Injecter l'userId de l'admin connecté — évite la FK violation
      const data = { ...(input as any) };
      if (!data.userId && ctx?.user?.id) {
        data.userId = ctx.user.id;
      }
      return createMerchant(data);
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
      if (typeof val !== "object" || val === null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Formulaire invalide." });
      }
      const v = val as Record<string, unknown>;
      if (!v.name || typeof v.name !== "string" || !v.name.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Le nom est obligatoire." });
      }
      if (!v.email || typeof v.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Une adresse email valide est obligatoire." });
      }
      if (!v.subject || typeof v.subject !== "string" || !v.subject.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Le sujet est obligatoire." });
      }
      if (!v.message || typeof v.message !== "string" || !v.message.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Le message est obligatoire." });
      }
      if (v.rgpdConsent !== true) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Le consentement RGPD est obligatoire." });
      }
      return v;
    }).mutation(async ({ input }: any) => {
      let result;
      try {
        result = await createContactRequest({
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: typeof input.phone === "string" && input.phone.trim() ? input.phone.trim() : null,
          subject: input.subject.trim(),
          message: input.message.trim(),
          rgpdConsent: 1,
          rgpdConsentAt: new Date(),
          status: "new",
        });
      } catch (e: any) {
        console.error("[contact.submit] Erreur base de données:", e.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Votre message n'a pas pu être envoyé pour le moment. Merci de réessayer dans quelques instants ou de nous contacter directement à contact@synergiedour.be.",
        });
      }
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
      let memberResult;
      try {
        memberResult = await createMembershipRequest({
          businessName:        data.businessName,
          businessCategory:    data.businessCategory    || "",
          structureType:       data.structureType       || null,
          vatNumber:           data.vatNumber           || null,
          sector:              data.sector              || null,
          website:             data.website             || null,
          socialMedia:         data.socialMedia         || null,
          employeeCount:       data.employeeCount       || null,
          googleBusinessUrl:   data.googleBusinessUrl   || null,
          contactName:         data.contactName,
          email:               data.email.trim().toLowerCase(),
          phone:               data.phone,
          address:             data.address,
          village:             data.village             || null,
          message:             data.message             || null,
          howDidYouHear:       data.howDidYouHear       || null,
          acceptsEmailContact: data.acceptsEmailContact ? 1 : 0,
          acceptsEmailContactAt: data.acceptsEmailContact ? new Date() : null,
          rgpdConsent:         data.rgpdConsent         ? 1 : 0,
          rgpdConsentAt:       new Date(),
          paymentMode:         "one_time",
          status:              "pending",
          paiementStatut:      "en_attente",
        });
      } catch (e: any) {
        console.error("[membership.request] Erreur base de données:", e.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Votre demande d'adhésion n'a pas pu être enregistrée pour le moment. Merci de réessayer dans quelques instants ou de contacter directement Synergie Dour à contact@synergiedour.be.",
        });
      }
      // 1. Notification admin
      sendAdminNewMessageNotification({
        type: "membership",
        name: data.contactName ?? "",
        email: data.email ?? "",
        businessName: data.businessName ?? "",
        message: data.message ?? "",
      }).catch(() => {});
      // 2. Accusé de réception immédiat au demandeur
      sendInstantAcknowledgement({
        to: data.email,
        contactName: data.contactName,
        businessName: data.businessName,
        village: data.village ?? undefined,
      }).catch(() => {});
      return memberResult;
    }),
    // Admin routes
    listAll: adminProcedure.query(async () => {
      return getMembershipRequests();
    }),
    approveAndSendInvoice: adminProcedure.input((val: unknown) => {
      const id = Number((val as { id?: unknown } | null)?.id);
      if (Number.isInteger(id) && id > 0) return { id };
      throw new TRPCError({ code: "BAD_REQUEST", message: "Demande invalide." });
    }).mutation(async ({ input, ctx }) => {
      try {
        return await approveMembershipAndSendInvoice({
          requestId: input.id,
          adminUserId: ctx.user.id,
        });
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error?.message || "La facture de cotisation n'a pas pu être envoyée.",
        });
      }
    }),
    update: adminProcedure.input((val: unknown) => {
      const data = val as { id?: unknown; status?: unknown; reviewNote?: unknown } | null;
      const id = Number(data?.id);
      if (Number.isInteger(id) && id > 0 && data?.status === "rejected") {
        return {
          id,
          status: "rejected" as const,
          reviewNote: typeof data.reviewNote === "string" ? data.reviewNote.trim().slice(0, 2_000) : "",
        };
      }
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Seul le refus motivé est permis par cette action.",
      });
    }).mutation(async ({ input, ctx }) => {
      return updateMembershipRequest(input.id, {
        status: "rejected",
        reviewNote: input.reviewNote || null,
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
      });
    }),
    markRegisterSigned: adminProcedure.input((val: unknown) => {
      const id = Number((val as { id?: unknown } | null)?.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Demande invalide.",
        });
      }
      return { id };
    }).mutation(async ({ input }) => {
      return updateMembershipRequest(input.id, { memberRegisterSignedAt: new Date() });
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
          for (const b of (rows as unknown as any[])) {
            results.push({ ...b, source: b.source || "Immoweb" });
          }
          console.log(`[locaux] ${(rows as unknown as any[]).length} biens chargés depuis MySQL`);
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
          for (const r of rows as unknown as any[]) {
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
      await rawExecute("UPDATE scheduled_posts SET status=?, approved_by=?, approved_at=?, updatedAt=? WHERE id=?", [status, ctx.user.id, now, now, id]);
      return { success: true };
    }),

    create: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }: any) => {
      const { title, content: postContent, day_of_week, scheduled_time, platforms, source_type } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await rawExecute("INSERT INTO scheduled_posts (title, content, day_of_week, scheduled_time, platforms, status, source_type) VALUES (?, ?, ?, ?, ?, 'draft', ?)", [title, postContent, day_of_week, scheduled_time || "09:00:00", platforms || "facebook,instagram", source_type || "manual"]);
      return { success: true };
    }),

    delete: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }: any) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await rawExecute("DELETE FROM scheduled_posts WHERE id=?", [input.id]);
      return { success: true };
    }),
  }),

  // Memberships — statut membre pour l'espace membre
  memberships: router({
    myStatus: protectedProcedure.query(async ({ ctx }) => {
      try {
        const mysql2 = await import("mysql2/promise");
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) return null;
        const pool = mysql2.createPool({ uri: dbUrl.split("?")[0], ssl: { rejectUnauthorized: false }, connectionLimit: 2 });
        const [rows] = await pool.execute(
          "SELECT * FROM membership_requests WHERE email = ? ORDER BY created_at DESC LIMIT 1",
          [ctx.user.email]
        ) as any;
        await pool.end().catch(() => {});
        return (rows as unknown as any[])[0] ?? null;
      } catch {
        return null;
      }
    }),
  }),

  // ── LEADFINDER PRO — Intégration CRM & Campagnes ────────────────────────
  leadfinder: router({
    // Liste des contacts LeadFinder
    contacts: adminProcedure.input((val: any) => val ?? {}).query(async ({ input }) => {
      const { getAllLeadFinderContacts, getLeadFinderContacts } = await import("./leadfinder");
      const limit = input?.limit ?? 0;
      if (limit === 0) return getAllLeadFinderContacts();
      return getLeadFinderContacts({ limit: input.limit, skip: input.skip ?? 0, query: input.query });
    }),

    // Liste des campagnes
    campaigns: adminProcedure.query(async () => {
      const { getEmailCampaigns } = await import("./leadfinder");
      return getEmailCampaigns({ limit: 100 });
    }),

    // Liste des templates
    templates: adminProcedure.query(async () => {
      const { getEmailTemplates } = await import("./leadfinder");
      return getEmailTemplates();
    }),

    // Créer une campagne
    createCampaign: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      const { createEmailCampaign } = await import("./leadfinder");
      return createEmailCampaign(input as any);
    }),

    // Créer un template
    createTemplate: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      const { createEmailTemplate } = await import("./leadfinder");
      return createEmailTemplate(input as any);
    }),

    // Importer contacts LeadFinder → CRM commerçants Synergie
    importToMerchants: adminProcedure.input((val: any) => val ?? {}).mutation(async ({ input, ctx }) => {
      const { getAllLeadFinderContacts } = await import("./leadfinder");
      const { createMerchant } = await import("./db");
      const contacts = await getAllLeadFinderContacts();
      // Filtrer ceux avec vrai email
      const valid = contacts.filter((c: any) => c.email && c.email.includes("@"));
      let inserted = 0; let skipped = 0; const errors: string[] = [];
      for (const c of valid) {
        try {
          await createMerchant({
            userId: ctx.user.id,
            businessName: c.full_name || c.company || "Sans nom",
            businessCategory: c.profession || "Professionnel",
            description: c.notes || "",
            address: c.location || "",
            phone: "",
            email: c.email,
            website: "",
            googleBusinessUrl: "",
            status: "approved",
          });
          inserted++;
        } catch (e: any) {
          if (e.message?.includes("Duplicate")) skipped++;
          else errors.push(`${c.full_name}: ${e.message}`);
        }
      }
      return { inserted, skipped, errors: errors.slice(0, 10), total: valid.length };
    }),

    // Envoyer email à un contact
    sendEmail: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val;
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      const { sendCampaignEmail } = await import("./leadfinder");
      return sendCampaignEmail(input as any);
    }),
  }),

  // ── INBOX — compteur messages non lus ──────────────────────────────────
  inbox: router({
    unreadCount: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { contacts: 0, memberships: 0, total: 0 };
      const cr = await rawQuery("SELECT COUNT(*) as count FROM contact_requests WHERE status = 'new'");
      const mr = await rawQuery("SELECT COUNT(*) as count FROM membership_requests WHERE status = 'pending'");
      const c = Number((cr as unknown as any[])[0]?.count ?? 0);
      const m = Number((mr as unknown as any[])[0]?.count ?? 0);
      return { contacts: c, memberships: m, total: c + m };
    }),
  }),

  // ── PENDING CHANGES (agent de vérification) ────────────────────────────
  pendingChanges: router({
    listPending: adminProcedure.query(async () => {
      try {
        const rows = await rawQuery("SELECT pc.*, r.title as resource_title FROM pending_changes pc LEFT JOIN resources r ON pc.resourceId = r.id WHERE pc.status = ? ORDER BY pc.createdAt DESC", ["pending"]);
        return rows as any[];
      } catch { return []; }
    }),
    approve: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) {
        return val as { id: number; note?: string };
      }
      throw new Error("Invalid input");
    }).mutation(async ({ input, ctx }) => {
      await rawExecute(
        "UPDATE pending_changes SET status = ?, reviewedBy = ?, reviewNote = ?, reviewedAt = NOW() WHERE id = ?",
        ["approved", ctx.user.id, input.note || null, input.id]
      );
      return { success: true };
    }),
    reject: adminProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null) return val as { id: number; note?: string };
      throw new Error("Invalid input");
    }).mutation(async ({ input }) => {
      await rawExecute("UPDATE pending_changes SET status = ?, reviewNote = ?, reviewedAt = NOW() WHERE id = ?", ["rejected", input.note || null, input.id]);
      return { success: true };
    }),
  }),

  // ── AGENT (vérification hebdomadaire) ──────────────────────────────────
  agent: router({
    runManual: adminProcedure.mutation(async () => {
      try {
        const { runWeeklyVerification } = await import("./agents/verificationAgent");
        const result = await runWeeklyVerification();
        return result;
      } catch (e: any) {
        throw new Error(e.message || "Erreur agent");
      }
    }),
    stats: adminProcedure.query(async () => {
      try {
        const pending = await rawQuery("SELECT COUNT(*) as count FROM pending_changes WHERE status = ?", ["pending"]);
        const approved = await rawQuery("SELECT COUNT(*) as count FROM pending_changes WHERE status = ?", ["approved"]);
        const rejected = await rawQuery("SELECT COUNT(*) as count FROM pending_changes WHERE status = ?", ["rejected"]);
        return {
          pending: Number((pending as any[])[0]?.count ?? 0),
          approved: Number((approved as any[])[0]?.count ?? 0),
          rejected: Number((rejected as any[])[0]?.count ?? 0),
        };
      } catch { return { pending: 0, approved: 0, rejected: 0 }; }
    }),
  }),
});

export type AppRouter = typeof appRouter;
