import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { acceptBoardInvitation, inspectBoardInvitation, invitationAcceptInput, invitationTokenInput, sendBoardMemberInvitation } from "./boardInvitations";

// Additional bounded limiter for the two public invitation procedures.
// Tokens are only accepted in POST bodies, never GET query strings.
const requests = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60_000;
const publicInvitationProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const now = Date.now();
  for (const [key, bucket] of requests) if (bucket.until <= now) requests.delete(key);
  const key = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
  const bucket = requests.get(key);
  if ((bucket && bucket.count >= 120) || (!bucket && requests.size >= 10_000)) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Trop de tentatives. Réessayez dans quelques minutes." });
  }
  requests.set(key, { count: (bucket?.count ?? 0) + 1, until: bucket?.until ?? now + WINDOW_MS });
  ctx.res.setHeader("Cache-Control", "no-store");
  ctx.res.setHeader("Referrer-Policy", "no-referrer");
  return next();
});

export function createBoardInvitationRouter(initialize: () => Promise<void>) {
  return router({
    resend: adminProcedure.input(z.object({ memberId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      await initialize();
      return sendBoardMemberInvitation(input.memberId, ctx.user.id);
    }),
    inspect: publicInvitationProcedure.input(invitationTokenInput).mutation(async ({ input }) => {
      await initialize();
      return inspectBoardInvitation(input.token);
    }),
    accept: publicInvitationProcedure.input(invitationAcceptInput).mutation(async ({ input, ctx }) => {
      await initialize();
      return acceptBoardInvitation(input, ctx.user ? { id: ctx.user.id, email: ctx.user.email } : null);
    }),
  });
}
