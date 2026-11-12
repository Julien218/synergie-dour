import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { loginWithPassword, registerWithPassword, SESSION_COOKIE, SESSION_DURATION_MS, signSession } from "./authService";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
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
  getMembershipRequestById,
  updateMembershipRequest,
  deleteMembershipRequest,
  getMerchantByUserId,
  createLocalRequest,
  getLocalRequests,
  updateLocalRequest,
} from "./db";
import { sendAdminNewMessageNotification, sendInstantAcknowledgement, sendContractEmail } from "./email/notifications";
import { TRPCError } from "@trpc/server";
import { getChatbotSystemPrompt } from "./chatbotPrompt";
import { askOpenAI } from "./chatbotClient";
import { boardVotesRouter } from "./boardVotesRouter";

import { z } from "zod";
import { membershipInput, membershipUpdateInput } from "../shared/membership";
import { sendMembershipContract, activateMembership, memberStatus, activateMemberAccess } from "./membershipService";

export const appRouter = router({
  system: systemRouter,
  board: boardVotesRouter,
  chatbot: router({
    ask: publicProcedure.input((value: unknown) => {
      if (!value || typeof value !== "object") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Question invalide" });
      }
      const input = value as Record<string, unknown>;
      const question = typeof input.question === "string" ? input.question.trim() : "";
      if (!question || question.length > 2_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La question doit contenir entre 1 et 2 000 caractères" });
      }
      const rawHistory = Array.isArray(input.history) ? input.history.slice(-10) : [];
      const history = rawHistory.map((item, index) => {
        if (!item || typeof item !== "object") {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Message ${index + 1} invalide` });
        }
        const message = item as Record<string, unknown>;
        const role = message.role;
        const content = typeof message.content === "string" ? message.content.trim() : "";
        if ((role !== "user" && role !== "assistant") || !content || content.length > 4_000) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Message ${index + 1} invalide` });
        }
        return { role, content } as const;
      });
      return { question, history };
    }).mutation(async ({ input }) => {
      try {
        const systemPrompt = await getChatbotSystemPrompt();
        const answer = await askOpenAI([
          { role: "system", content: systemPrompt },
          ...input.history,
          { role: "user", content: input.question },
        ]);
        return { answer };
      } catch (error) {
        console.error("[chatbot.ask]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "L’assistant est momentanément indisponible. Veuillez réessayer dans quelques instants.",
        });
      }
    }),
  }),
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
    updateMyProfile: protectedProcedure.input(z.object({
      description: z.string().trim().max(10000).optional(),
      address: z.string().trim().min(1).max(255).optional(),
      phone: z.string().trim().max(20).optional(),
      website: z.string().trim().max(255).optional(),
      logo: z.string().max(500).nullable().optional(),
      photos: z.array(z.string().max(2000)).max(100).optional(),
      videos: z.array(z.string().max(2000)).max(100).optional(),
    }).strict()).mutation(async ({ ctx, input }: any) => {
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
      return v;
    }).mutation(async ({ input }: any) => {
      let result;
      try {
        result = await createContactRequest(input as any);
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
    request: publicProcedure.input(membershipInput).mutation(async ({ input }) => {
      const data = input as any;
      let memberResult;
      try {
        memberResult = await createMembershipRequest({
          village: data.village,
          googleBusinessUrl: data.googleBusinessUrl,
          paymentMode: data.paymentMode,
          rgpdConsentAt: new Date(),
          acceptsEmailContactAt: data.acceptsEmailContact ? new Date() : null,
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
          mediaConsent:        data.mediaConsent        ? 1 : 0,
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
      let emailWarning: string | undefined;
      await sendInstantAcknowledgement({
        to: data.email,
        contactName: data.contactName,
        businessName: data.businessName,
        village: data.village ?? undefined,
      }).catch(error => { console.error("[membership.acknowledgement]", error); emailWarning = "Demande enregistrée. L’email de confirmation n’a pas pu être envoyé ; contactez le bureau si nécessaire."; });
      return { success: true, emailWarning };
    }),
    // Admin routes
    listAll: adminProcedure.query(async () => {
      return getMembershipRequests();
    }),
    update: adminProcedure.input(membershipUpdateInput).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const previous = await getMembershipRequestById(id);
      if (!previous) throw new TRPCError({ code: "NOT_FOUND", message: "Demande introuvable" });
      if (previous.membershipId && (data.status === "rejected" || data.status === "pending" || data.paiementStatut === "en_attente")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cette adhésion est déjà active. Utilisez la gestion des adhésions pour l'annuler." });
      }
      const status = data.status || previous.status;
      const paid = data.paiementStatut || previous.paiementStatut;
      if (status !== "approved" && paid !== "en_attente") throw new TRPCError({ code: "BAD_REQUEST", message: "Approuvez la demande avant de confirmer le paiement." });
      await updateMembershipRequest(id, data);
      if (status === "approved" && paid !== "en_attente") await activateMembership(id);
      let emailWarning: string | undefined;
      if (status === "approved" && previous.status !== "approved") {
        try { await sendMembershipContract(id); }
        catch (error) {
          console.error("[membership.contract]", error);
          emailWarning = "Demande approuvée, mais l'email n'a pas été envoyé. Utilisez Renvoyer le contrat.";
        }
      }
      return { success: true, emailWarning };
    }),
    resendContract: adminProcedure.input(z.number().int().positive()).mutation(async ({ input }) => {
      await sendMembershipContract(input);
      return { success: true };
    }),
    activateAccess: publicProcedure.input(z.object({ token: z.string().max(150), password: z.string().min(12).max(128) })).mutation(({ input }) => activateMemberAccess(input.token, input.password)),
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

  // Memberships — statut membre pour l'espace membre
  memberships: router({
    myPayments: protectedProcedure.query(async ({ ctx }) => {
      const { getPool } = await import("./db");
      const p = await getPool();
      if (!p) throw new Error("Base de données indisponible");
      const [rows] = await p.execute("SELECT id,amountCents,currency,status,paidAt FROM payments WHERE userId=? ORDER BY paidAt DESC,id DESC LIMIT 100", [ctx.user.id]);
      return rows as Array<{ id: number; amountCents: number; currency: string; status: string; paidAt: Date }>;
    }),
    billingPortal: protectedProcedure.mutation(async ({ ctx }) => {
      const { getPool } = await import("./db");
      const p = await getPool();
      if (!p) throw new Error("Base de données indisponible");
      const [rows] = await p.execute("SELECT stripeCustomerId FROM memberships WHERE userId=? AND stripeSubscriptionId IS NOT NULL ORDER BY id DESC LIMIT 1", [ctx.user.id]);
      const customer = rows[0]?.stripeCustomerId;
      if (!customer) throw new TRPCError({ code: "BAD_REQUEST", message: "Aucun abonnement Stripe associé à votre compte. Contactez le bureau." });
      const { stripe } = await import("./stripe/stripeService");
      const portal = await stripe.billingPortal.sessions.create({ customer, ...(process.env.STRIPE_BILLING_PORTAL_CONFIGURATION ? { configuration: process.env.STRIPE_BILLING_PORTAL_CONFIGURATION } : {}), return_url: `${process.env.APP_URL || "https://www.synergiedour.be"}/dashboard/members` });
      return { url: portal.url };
    }),
    checkoutStatus: publicProcedure.input(z.string().regex(/^cs_(test_|live_)?[A-Za-z0-9_]+$/).max(255)).query(async ({ input }) => {
      const { stripe } = await import("./stripe/stripeService");
      const session = await stripe.checkout.sessions.retrieve(input);
      const id = Number(session.metadata?.membershipRequestId);
      const request = id ? await getMembershipRequestById(id) : null;
      return { paid: session.payment_status === "paid", active: Boolean(request?.membershipId && request?.paiementStatut !== "en_attente"), kind: session.metadata?.invoiceId ? "invoice" : "membership" };
    }),
    myStatus: protectedProcedure.query(({ ctx }) => memberStatus(ctx.user.id, ctx.user.email)),
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
    importToMerchants: adminProcedure.input((val: any) => val ?? {}).mutation(async ({ input }) => {
      const { getAllLeadFinderContacts } = await import("./leadfinder");
      const { createMerchant } = await import("./db");
      const contacts = await getAllLeadFinderContacts();
      // Filtrer ceux avec vrai email
      const valid = contacts.filter((c: any) => c.email && c.email.includes("@"));
      let inserted = 0; let skipped = 0; const errors: string[] = [];
      for (const c of valid) {
        try {
          await createMerchant({
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
      const [cr] = await db.execute("SELECT COUNT(*) as count FROM contact_requests WHERE status = 'new'");
      const [mr] = await db.execute("SELECT COUNT(*) as count FROM membership_requests WHERE status = 'pending'");
      const c = Number((cr as any[])[0]?.count ?? 0);
      const m = Number((mr as any[])[0]?.count ?? 0);
      return { contacts: c, memberships: m, total: c + m };
    }),
  }),
});

export type AppRouter = typeof appRouter;
