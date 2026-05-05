/**
 * Routes tRPC à AJOUTER à server/routers.ts
 *
 * Importer les helpers nécessaires en haut de routers.ts :
 *   import { resources, pendingChanges, memberships } from "@/drizzle/schema";
 *   import { eq, desc } from "drizzle-orm";
 *   import { z } from "zod";
 *   import { createMembershipCheckout } from "./stripe/stripeService";
 *   import { runWeeklyVerification } from "./agents/verificationAgent";
 *   import { sendApplicationApprovedEmail } from "./email/notifications";
 *
 * Puis ajouter les blocs ci-dessous DANS l'objet appRouter, à côté des autres
 * routeurs (merchants, news, events...).
 *
 * NOTE : ce fichier est un EXTRAIT — copier-coller dans routers.ts.
 *
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

import { z } from "zod";

/* ========================================================================= */
/*  ROUTES RESSOURCES                                                         */
/* ========================================================================= */

export const resourcesRouterDefinition = `
  resources: router({
    list: publicProcedure.query(async () => {
      return db.select().from(resources)
        .where(eq(resources.status, "published"))
        .orderBy(desc(resources.updatedAt));
    }),

    getBySlug: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        const result = await db.query.resources.findFirst({
          where: eq(resources.slug, input),
        });
        if (!result || result.status !== "published") {
          throw new Error("Ressource introuvable");
        }
        return result;
      }),

    listAll: adminProcedure.query(async () => {
      return db.select().from(resources).orderBy(desc(resources.updatedAt));
    }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          title: z.string().optional(),
          summary: z.string().optional(),
          content: z.string().optional(),
          status: z.enum(["draft", "published", "archived"]).optional(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.update(resources)
          .set({ ...input.data, updatedAt: new Date() })
          .where(eq(resources.id, input.id));
        await db.insert(auditLogs).values({
          resourceId: input.id,
          eventType: "manual_update",
          payload: JSON.stringify({ fields: Object.keys(input.data) }),
          triggeredBy: ctx.user.id,
        });
        return { success: true };
      }),
  }),
`;

/* ========================================================================= */
/*  ROUTES PENDING CHANGES (validation agent)                                 */
/* ========================================================================= */

export const pendingChangesRouterDefinition = `
  pendingChanges: router({
    listPending: adminProcedure.query(async () => {
      return db.query.pendingChanges.findMany({
        where: eq(pendingChanges.status, "pending"),
        orderBy: desc(pendingChanges.createdAt),
        with: { resource: true },
      });
    }),

    getById: adminProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.query.pendingChanges.findFirst({
          where: eq(pendingChanges.id, input),
          with: { resource: true },
        });
      }),

    approve: adminProcedure
      .input(z.object({
        id: z.number(),
        note: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const change = await db.query.pendingChanges.findFirst({
          where: eq(pendingChanges.id, input.id),
        });
        if (!change || change.status !== "pending") {
          throw new Error("Changement introuvable ou déjà traité");
        }

        const proposal = JSON.parse(change.proposal);
        const updateData: Record<string, unknown> = {
          verifiedAt: new Date().toISOString().split("T")[0],
          updatedAt: new Date(),
        };
        for (const patch of proposal.patches) {
          updateData[patch.field] = patch.newValue;
        }

        await db.update(resources).set(updateData).where(eq(resources.id, change.resourceId));
        await db.update(pendingChanges).set({
          status: "approved",
          reviewedBy: ctx.user.id,
          reviewNote: input.note ?? null,
          reviewedAt: new Date(),
        }).where(eq(pendingChanges.id, input.id));
        await db.insert(auditLogs).values({
          resourceId: change.resourceId,
          eventType: "change_approved",
          payload: JSON.stringify({ changeId: input.id, note: input.note }),
          triggeredBy: ctx.user.id,
        });

        return { success: true };
      }),

    reject: adminProcedure
      .input(z.object({
        id: z.number(),
        note: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.update(pendingChanges).set({
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewNote: input.note,
          reviewedAt: new Date(),
        }).where(eq(pendingChanges.id, input.id));
        return { success: true };
      }),
  }),
`;

/* ========================================================================= */
/*  ROUTES MEMBERSHIPS (adhésions Stripe)                                     */
/* ========================================================================= */

export const membershipsRouterDefinition = `
  memberships: router({
    request: publicProcedure
      .input(z.object({
        businessName: z.string().min(2),
        businessCategory: z.string().min(2),
        contactName: z.string().min(2),
        email: z.string().email(),
        phone: z.string().min(8),
        address: z.string().min(5),
        message: z.string().optional(),
        paymentMode: z.enum(["one_time", "subscription"]),
      }))
      .mutation(async ({ input }) => {
        const [request] = await db.insert(membershipRequests).values({
          businessName: input.businessName,
          businessCategory: input.businessCategory,
          contactName: input.contactName,
          email: input.email,
          phone: input.phone,
          address: input.address,
          message: input.message ?? null,
          status: "pending",
        }).$returningId();

        await sendApplicationReceivedEmail({
          to: input.email,
          contactName: input.contactName,
          businessName: input.businessName,
        });

        return { requestId: request.id, success: true };
      }),

    approveAndSendCheckout: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        const request = await db.query.membershipRequests.findFirst({
          where: eq(membershipRequests.id, input),
        });
        if (!request) throw new Error("Demande introuvable");

        const asblConnectAccountId = process.env.ASBL_STRIPE_CONNECT_ACCOUNT_ID;
        if (!asblConnectAccountId) {
          throw new Error("Compte Stripe Connect ASBL non configuré");
        }

        const checkoutUrl = await createMembershipCheckout({
          mode: "one_time",
          customerEmail: request.email,
          metadata: {
            membershipRequestId: String(request.id),
            businessName: request.businessName,
          },
          asblConnectAccountId,
        });

        await sendApplicationApprovedEmail({
          to: request.email,
          contactName: request.contactName,
          businessName: request.businessName,
          checkoutUrl,
          paymentMode: "one_time",
        });

        return { success: true, checkoutUrl };
      }),

    myStatus: protectedProcedure.query(async ({ ctx }) => {
      return db.query.memberships.findFirst({
        where: eq(memberships.userId, ctx.user.id),
        orderBy: desc(memberships.createdAt),
      });
    }),
  }),
`;

/* ========================================================================= */
/*  ROUTE AGENT (déclenchement manuel)                                        */
/* ========================================================================= */

export const agentRouterDefinition = `
  agent: router({
    runManual: adminProcedure.mutation(async () => {
      const stats = await runWeeklyVerification();
      return stats;
    }),
  }),
`;
