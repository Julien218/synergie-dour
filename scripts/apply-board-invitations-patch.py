"""One-shot integration helper. Delete after applying on the correction branch."""
from pathlib import Path


def once(source, old, new):
    count = source.count(old)
    assert count == 1, (old[:120], count)
    return source.replace(old, new, 1)


changes = {}
p = Path("server/boardVotesRouter.ts")
s = p.read_text()
s = once(s, 'import { Resend } from "resend";', '''import { Resend } from "resend";
import { BOARD_INVITATIONS_DDL, saveBoardMember, deactivateBoardMember, getBoardInvitationStates, invitationState } from "./boardInvitations";
import { createBoardInvitationRouter } from "./boardInvitationRouter";''')
s = once(s, "  boardTablesReady = true;", "  await pool.execute(BOARD_INVITATIONS_DDL);\n  boardTablesReady = true;")
s = once(s, '''WHERE active=1 AND ((userId IS NOT NULL AND userId=?) OR LOWER(email)=?)
     ORDER BY CASE WHEN userId=? THEN 0 ELSE 1 END, id ASC LIMIT 1''', '''WHERE active=1 AND userId=? AND LOWER(email)=?
     ORDER BY id ASC LIMIT 1''')
s = once(s, "[user?.id ?? 0, email, user?.id ?? 0]", "[user?.id ?? 0, email]")
s = once(s, "  const members = memberRows as any[];", '''  const invitationStates = await getBoardInvitationStates();
  const members = (memberRows as any[]).map(member => ({
    ...member, invitation: invitationStates.get(Number(member.id)) ?? invitationState(),
  }));''')
s = once(s, "export const boardVotesRouter = router({", "export const boardVotesRouter = router({\n  invitations: createBoardInvitationRouter(ensureBoardTables),")
start = s.index("  upsertMember: adminProcedure")
end = s.index("  createMeeting: adminProcedure", start)
s = s[:start] + '''  upsertMember: adminProcedure
    .input((value: any) => value ?? {})
    .mutation(async ({ input, ctx }) => {
      await ensureBoardTables();
      return saveBoardMember(input, ctx.user.id);
    }),

  deactivateMember: adminProcedure
    .input((value: any) => ({ id: asId(value?.id ?? value) }))
    .mutation(async ({ input, ctx }) => {
      await ensureBoardTables();
      return deactivateBoardMember(input.id, ctx.user.id);
    }),

''' + s[end:]
changes[p] = s

p = Path("client/src/App.tsx")
s = p.read_text()
s = once(s, 'const BoardVotesPage = lazy(() => import("@/pages/BoardVotesPage"));', '''const BoardVotesPage = lazy(() => import("@/pages/BoardVotesPage"));
const BoardInvitationPage = lazy(() => import("@/pages/BoardInvitationPage"));''')
s = once(s, '      <Route path="/login">', '''      <Route path="/board-invitation">{() => <BoardInvitationPage />}</Route>
      <Route path="/login">''')
changes[p] = s

p = Path("client/src/pages/BoardVotesPage.tsx")
s = p.read_text()
s = once(s, 'import DashboardLayout from "@/components/DashboardLayout";', '''import DashboardLayout from "@/components/DashboardLayout";
import BoardInvitationStatus from "@/components/BoardInvitationStatus";''')
s = once(s, 'const snapshot = trpc.board.snapshot.useQuery(undefined, { enabled: isAdmin });', 'const snapshot = trpc.board.snapshot.useQuery(undefined, { enabled: isAdmin, refetchInterval: isAdmin ? 30000 : false });')
start = s.index("  const submitMember = async () => {")
end = s.index("  const submitMeeting = async () => {", start)
s = s[:start] + '''  const submitMember = async () => {
    if (!memberForm.fullName.trim() || !memberForm.email.trim()) {
      return toast.error("Nom et email requis");
    }
    try {
      const result = await saveMember.mutateAsync({ ...memberForm, id: memberForm.id || undefined });
      if (result.invitationRequested) {
        if (result.invitation?.status === "sent") toast.success("Membre enregistré et invitation envoyée au service email.");
        else toast.error("Membre enregistré, mais invitation non envoyée : " + (result.invitation?.errorMessage || "Vérifiez l'état d'envoi sur sa fiche."));
      } else toast.success(memberForm.id ? "Membre CA mis à jour" : "Membre déjà existant mis à jour. Utilisez le bouton d'invitation sur sa fiche.");
      setMemberForm({ id: 0, fullName: "", email: "", roleTitle: "", isPresident: false, canCalendar: true, canVotes: true, canMinutes: true });
    } catch { /* The mutation error handler reports the failure; retain the form. */ }
  };

''' + s[end:]
s = once(s, '''<Button onClick={submitMember} disabled={saveMember.isPending} className="flex-1">Enregistrer</Button>''', '''<Button onClick={submitMember} disabled={saveMember.isPending} className="flex-1 h-auto whitespace-normal">{saveMember.isPending ? "Enregistrement…" : memberForm.id ? "Enregistrer" : "Enregistrer et inviter"}</Button>''')
s = once(s, '''<div className="text-xs text-gray-400">{member.userId ? "Compte site associé" : "Compte site à associer via le même email"}</div>''', '''<div className="text-xs text-gray-400">{member.userId ? "Compte site associé" : "Compte à associer après activation de l'invitation"}</div>''')
s = once(s, '''                        {Number(member.canMinutes) === 1 && <Badge variant="outline">PV</Badge>}
                      </div>
                    </div>''', '''                        {Number(member.canMinutes) === 1 && <Badge variant="outline">PV</Badge>}
                      </div>
                      <BoardInvitationStatus memberId={Number(member.id)} active={Number(member.active) === 1} invitation={member.invitation} />
                    </div>''')
s = once(s, "rounded-lg border p-3 flex items-center justify-between gap-3 ", "rounded-lg border p-3 flex flex-col items-stretch sm:flex-row sm:items-start sm:justify-between gap-3 ")
changes[p] = s

p = Path("client/src/main.tsx")
s = p.read_text()
s = once(s, '    console.error("[API Query Error]", error);', '    if (window.location.pathname !== "/board-invitation") console.error("[API Query Error]", error);')
s = once(s, '    console.error("[API Mutation Error]", error);', '    if (window.location.pathname !== "/board-invitation") console.error("[API Mutation Error]", error);')
changes[p] = s

# Save only after ALL assertions succeed. Never partially apply this patch.
for path, content in changes.items():
    path.write_text(content)
print("Applied exactly:", ", ".join(str(path) for path in changes))
