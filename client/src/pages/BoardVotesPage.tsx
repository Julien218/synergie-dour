import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gavel,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
  Vote,
  XCircle,
} from "lucide-react";

type Tab = "meetings" | "members" | "myvotes";
type Choice = "for" | "against" | "abstain";

const choiceLabel: Record<Choice, string> = {
  for: "Pour",
  against: "Contre",
  abstain: "Abstention",
};

const attendanceLabel: Record<string, string> = {
  pending: "À confirmer",
  present: "Présent",
  represented: "Représenté",
  absent: "Absent",
  excused: "Excusé",
};

const kindLabel: Record<string, string> = {
  information: "Information",
  discussion: "Discussion",
  vote: "Vote",
  urgent: "Décision urgente",
};

const fmt = (value: any) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString("fr-BE", { dateStyle: "medium", timeStyle: "short" });
};

export default function BoardVotesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>(isAdmin ? "meetings" : "myvotes");

  const snapshot = trpc.board.snapshot.useQuery(undefined, { enabled: isAdmin });
  const myQueue = trpc.board.myQueue.useQuery();

  const refresh = async () => {
    await Promise.all([
      isAdmin ? utils.board.snapshot.invalidate() : Promise.resolve(),
      utils.board.myQueue.invalidate(),
    ]);
  };

  const mutationOptions = {
    onSuccess: async () => {
      await refresh();
    },
    onError: (error: any) => toast.error(error.message || "Action impossible"),
  };

  const saveMember = trpc.board.upsertMember.useMutation(mutationOptions);
  const deactivateMember = trpc.board.deactivateMember.useMutation(mutationOptions);
  const createMeeting = trpc.board.createMeeting.useMutation(mutationOptions);
  const updateMeetingStatus = trpc.board.updateMeetingStatus.useMutation(mutationOptions);
  const addAgendaItem = trpc.board.addAgendaItem.useMutation(mutationOptions);
  const setAttendance = trpc.board.setAttendance.useMutation(mutationOptions);
  const openAgendaVote = trpc.board.openAgendaVote.useMutation(mutationOptions);
  const closeAgendaVote = trpc.board.closeAgendaVote.useMutation(mutationOptions);
  const recordVote = trpc.board.recordVote.useMutation(mutationOptions);
  const castMyVote = trpc.board.castMyVote.useMutation(mutationOptions);

  const [memberForm, setMemberForm] = useState({
    id: 0,
    fullName: "",
    email: "",
    roleTitle: "",
    isPresident: false,
  });

  const [meetingForm, setMeetingForm] = useState({
    title: "",
    meetingDate: "",
    location: "",
    notes: "",
  });

  const [agendaForm, setAgendaForm] = useState({
    meetingId: 0,
    title: "",
    description: "",
    kind: "discussion",
  });

  const activeMembers = useMemo(
    () => (snapshot.data?.members || []).filter((m: any) => Number(m.active) === 1),
    [snapshot.data],
  );

  const submitMember = async () => {
    if (!memberForm.fullName.trim() || !memberForm.email.trim()) {
      return toast.error("Nom et email requis");
    }
    await saveMember.mutateAsync({
      ...memberForm,
      id: memberForm.id || undefined,
    });
    toast.success(memberForm.id ? "Membre CA mis à jour" : "Membre CA ajouté");
    setMemberForm({ id: 0, fullName: "", email: "", roleTitle: "", isPresident: false });
  };

  const submitMeeting = async () => {
    if (!meetingForm.title.trim() || !meetingForm.meetingDate) {
      return toast.error("Titre et date de réunion requis");
    }
    await createMeeting.mutateAsync({
      ...meetingForm,
      meetingDate: new Date(meetingForm.meetingDate).toISOString(),
    });
    toast.success("Réunion créée avec délai différé de 3 jours");
    setMeetingForm({ title: "", meetingDate: "", location: "", notes: "" });
  };

  const submitAgenda = async () => {
    if (!agendaForm.meetingId || !agendaForm.title.trim()) {
      return toast.error("Sélectionnez une réunion et indiquez le point");
    }
    await addAgendaItem.mutateAsync(agendaForm);
    toast.success("Point ajouté à l'ordre du jour");
    setAgendaForm((f) => ({ ...f, title: "", description: "", kind: "discussion" }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#001a3d] flex items-center justify-center">
              <Gavel className="h-6 w-6 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#001a3d]">Conseil & Votes</h1>
              <p className="text-sm text-gray-500">Réunions, ordre du jour, présence, procurations et consultations différées.</p>
            </div>
          </div>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
          </Button>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Règle appliquée dans le cockpit</div>
          <div className="mt-1">
            Le résultat officiel de la réunion reste distinct de la consultation des absents. Un membre absent ou excusé dispose de <strong>3 jours</strong> pour répondre. Après l'échéance, l'absence de réponse est affichée comme <strong>non exprimée / nulle</strong> et ne modifie pas rétroactivement le vote officiel.
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b pb-3">
          {isAdmin && (
            <>
              <Button variant={tab === "meetings" ? "default" : "outline"} onClick={() => setTab("meetings")}>
                <CalendarDays className="w-4 h-4 mr-2" /> Réunions & ordre du jour
              </Button>
              <Button variant={tab === "members" ? "default" : "outline"} onClick={() => setTab("members")}>
                <Users className="w-4 h-4 mr-2" /> Membres CA
              </Button>
            </>
          )}
          <Button variant={tab === "myvotes" ? "default" : "outline"} onClick={() => setTab("myvotes")}>
            <Vote className="w-4 h-4 mr-2" /> Mes votes
          </Button>
        </div>

        {tab === "members" && isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">{memberForm.id ? "Modifier le membre" : "Ajouter un membre du CA"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <label className="block text-sm">Nom complet<Input className="mt-1" value={memberForm.fullName} onChange={(e) => setMemberForm((f) => ({ ...f, fullName: e.target.value }))} /></label>
                <label className="block text-sm">Email de connexion<Input className="mt-1" type="email" value={memberForm.email} onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))} /></label>
                <label className="block text-sm">Fonction<Input className="mt-1" placeholder="Président, secrétaire, trésorier…" value={memberForm.roleTitle} onChange={(e) => setMemberForm((f) => ({ ...f, roleTitle: e.target.value }))} /></label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={memberForm.isPresident} onChange={(e) => setMemberForm((f) => ({ ...f, isPresident: e.target.checked }))} />
                  Président du CA
                </label>
                <div className="flex gap-2">
                  <Button onClick={submitMember} disabled={saveMember.isPending} className="flex-1">Enregistrer</Button>
                  {memberForm.id > 0 && <Button variant="outline" onClick={() => setMemberForm({ id: 0, fullName: "", email: "", roleTitle: "", isPresident: false })}>Annuler</Button>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Composition du Conseil</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(snapshot.data?.members || []).map((member: any) => (
                  <div key={member.id} className={"rounded-lg border p-3 flex items-center justify-between gap-3 " + (Number(member.active) ? "bg-white" : "bg-slate-50 opacity-60")}>
                    <div>
                      <div className="font-semibold text-[#001a3d] flex items-center gap-2">
                        {member.fullName}
                        {Number(member.isPresident) === 1 && <Badge className="bg-[#D4AF37] text-[#001a3d]">Président</Badge>}
                        {!Number(member.active) && <Badge variant="outline">Inactif</Badge>}
                      </div>
                      <div className="text-xs text-gray-500">{member.roleTitle || "Administrateur"} · {member.email}</div>
                      <div className="text-xs text-gray-400">{member.userId ? "Compte site associé" : "Compte site à associer via le même email"}</div>
                    </div>
                    {Number(member.active) === 1 && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setMemberForm({
                          id: Number(member.id),
                          fullName: member.fullName || "",
                          email: member.email || "",
                          roleTitle: member.roleTitle || "",
                          isPresident: Number(member.isPresident) === 1,
                        })}>Modifier</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
                          if (window.confirm("Désactiver " + member.fullName + " du CA ?")) deactivateMember.mutate({ id: member.id });
                        }}>Désactiver</Button>
                      </div>
                    )}
                  </div>
                ))}
                {!snapshot.isLoading && (snapshot.data?.members || []).length === 0 && (
                  <div className="py-10 text-center text-gray-400">Aucun membre du CA configuré.</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "meetings" && isAdmin && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Nouvelle réunion du CA</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Ex. Conseil d'administration — Octobre 2026" value={meetingForm.title} onChange={(e) => setMeetingForm((f) => ({ ...f, title: e.target.value }))} />
                  <Input type="datetime-local" value={meetingForm.meetingDate} onChange={(e) => setMeetingForm((f) => ({ ...f, meetingDate: e.target.value }))} />
                  <Input placeholder="Lieu" value={meetingForm.location} onChange={(e) => setMeetingForm((f) => ({ ...f, location: e.target.value }))} />
                  <Textarea placeholder="Notes internes facultatives" value={meetingForm.notes} onChange={(e) => setMeetingForm((f) => ({ ...f, notes: e.target.value }))} />
                  <Button onClick={submitMeeting} disabled={createMeeting.isPending}><Plus className="w-4 h-4 mr-2" /> Créer la réunion</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">Ajouter à l'ordre du jour</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <select className="w-full rounded-md border px-3 py-2 text-sm" value={agendaForm.meetingId} onChange={(e) => setAgendaForm((f) => ({ ...f, meetingId: Number(e.target.value) }))}>
                    <option value={0}>Sélectionner une réunion</option>
                    {(snapshot.data?.meetings || []).map((meeting: any) => <option key={meeting.id} value={meeting.id}>{meeting.title}</option>)}
                  </select>
                  <Input placeholder="Intitulé du point" value={agendaForm.title} onChange={(e) => setAgendaForm((f) => ({ ...f, title: e.target.value }))} />
                  <Textarea placeholder="Contexte, proposition, demande ou projet…" value={agendaForm.description} onChange={(e) => setAgendaForm((f) => ({ ...f, description: e.target.value }))} />
                  <select className="w-full rounded-md border px-3 py-2 text-sm" value={agendaForm.kind} onChange={(e) => setAgendaForm((f) => ({ ...f, kind: e.target.value }))}>
                    <option value="information">Information</option>
                    <option value="discussion">Discussion</option>
                    <option value="vote">Vote</option>
                    <option value="urgent">Décision urgente</option>
                  </select>
                  <Button onClick={submitAgenda} disabled={addAgendaItem.isPending}><Plus className="w-4 h-4 mr-2" /> Ajouter le point</Button>
                </CardContent>
              </Card>
            </div>

            {(snapshot.data?.meetings || []).map((meeting: any) => (
              <Card key={meeting.id} className="overflow-hidden">
                <CardHeader className="bg-white border-b">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl text-[#001a3d]">{meeting.title}</CardTitle>
                      <div className="text-sm text-gray-500 mt-1">{fmt(meeting.meetingDate)}{meeting.location ? " · " + meeting.location : ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{meeting.status}</Badge>
                      <Button size="sm" variant="outline" onClick={() => updateMeetingStatus.mutate({ id: meeting.id, status: meeting.status === "closed" ? "open" : "closed" })}>
                        {meeting.status === "closed" ? "Rouvrir" : "Clôturer réunion"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Stat label="Membres actifs" value={meeting.stats.activeBoardMembers} />
                    <Stat label="Présents" value={meeting.stats.present} />
                    <Stat label="Représentés" value={meeting.stats.represented} />
                    <Stat label="Absents" value={meeting.stats.absent} />
                    <Stat label="Quorum physique" value={meeting.stats.quorumReached ? "Atteint" : "Non (" + meeting.stats.quorumRequired + ")"} good={meeting.stats.quorumReached} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#001a3d] mb-3 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Présences et procurations</h3>
                    <div className="space-y-2">
                      {activeMembers.map((member: any) => {
                        const attendance = (meeting.attendance || []).find((a: any) => Number(a.memberId) === Number(member.id));
                        const status = attendance?.attendance || "pending";
                        return (
                          <div key={member.id} className="grid grid-cols-1 md:grid-cols-[1fr_180px_220px] gap-2 items-center rounded-lg bg-slate-50 p-2">
                            <div className="text-sm font-medium">{member.fullName}<span className="text-xs text-gray-400 ml-2">{member.roleTitle || ""}</span></div>
                            <select className="rounded-md border px-2 py-2 text-sm" value={status} onChange={(e) => setAttendance.mutate({
                              meetingId: meeting.id,
                              memberId: member.id,
                              attendance: e.target.value,
                              proxyMemberId: e.target.value === "represented" ? Number(attendance?.proxyMemberId || activeMembers.find((m: any) => Number(m.id) !== Number(member.id))?.id || 0) : undefined,
                            })}>
                              <option value="pending">À confirmer</option>
                              <option value="present">Présent</option>
                              <option value="represented">Représenté</option>
                              <option value="absent">Absent</option>
                              <option value="excused">Excusé</option>
                            </select>
                            {status === "represented" ? (
                              <select className="rounded-md border px-2 py-2 text-sm" value={attendance?.proxyMemberId || ""} onChange={(e) => setAttendance.mutate({
                                meetingId: meeting.id,
                                memberId: member.id,
                                attendance: "represented",
                                proxyMemberId: Number(e.target.value),
                              })}>
                                <option value="">Mandataire…</option>
                                {activeMembers.filter((m: any) => Number(m.id) !== Number(member.id)).map((m: any) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                              </select>
                            ) : <div className="text-xs text-gray-400">{attendanceLabel[status]}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#001a3d] mb-3">Ordre du jour</h3>
                    <div className="space-y-4">
                      {(meeting.agenda || []).map((item: any) => (
                        <div key={item.id} className="rounded-xl border bg-white p-4 space-y-4">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-[#001a3d]">{item.position}. {item.title}</span>
                                <Badge variant="outline">{kindLabel[item.kind] || item.kind}</Badge>
                                <Badge className={item.status === "open" ? "bg-blue-100 text-blue-800" : item.status === "closed" ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-800"}>{item.status}</Badge>
                                {item.outcome === "adopted" && <Badge className="bg-green-100 text-green-800">Adopté</Badge>}
                                {item.outcome === "rejected" && <Badge className="bg-red-100 text-red-800">Rejeté</Badge>}
                              </div>
                              {item.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{item.description}</p>}
                              {(item.kind === "vote" || item.kind === "urgent") && item.consultationDeadline && (
                                <p className="text-xs text-gray-500 mt-2"><Clock3 className="inline w-3 h-3 mr-1" /> Consultation des absents jusqu'au {fmt(item.consultationDeadline)}</p>
                              )}
                            </div>
                            {(item.kind === "vote" || item.kind === "urgent") && (
                              <div className="flex gap-2 flex-wrap">
                                {item.status !== "open" && item.status !== "closed" && <Button size="sm" onClick={() => openAgendaVote.mutate({ id: item.id })}>Ouvrir le vote</Button>}
                                {item.status === "open" && (
                                  <>
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => closeAgendaVote.mutate({ id: item.id, outcome: "adopted" })}>Clôturer adopté</Button>
                                    <Button size="sm" variant="destructive" onClick={() => closeAgendaVote.mutate({ id: item.id, outcome: "rejected" })}>Clôturer rejeté</Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {(item.kind === "vote" || item.kind === "urgent") && (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="rounded-lg bg-blue-50 p-3 text-sm">
                                  <div className="font-semibold text-blue-900">Vote officiel réunion</div>
                                  <div className="mt-1">Pour <strong>{item.official.for}</strong> · Contre <strong>{item.official.against}</strong> · Abstention <strong>{item.official.abstain}</strong></div>
                                </div>
                                <div className="rounded-lg bg-amber-50 p-3 text-sm">
                                  <div className="font-semibold text-amber-900">Consultation différée — 3 jours</div>
                                  <div className="mt-1">Pour <strong>{item.deferred.for}</strong> · Contre <strong>{item.deferred.against}</strong> · Abstention <strong>{item.deferred.abstain}</strong></div>
                                  <div className="text-xs mt-1">En attente : {item.pendingDeferred} · Non exprimé / nul : {item.nullDeferred}</div>
                                </div>
                              </div>

                              {item.status === "open" && (
                                <div>
                                  <div className="text-sm font-semibold mb-2">Saisie du vote officiel / procuration</div>
                                  <div className="space-y-2">
                                    {activeMembers.map((member: any) => {
                                      const att = (meeting.attendance || []).find((a: any) => Number(a.memberId) === Number(member.id));
                                      if (!att || (att.attendance !== "present" && att.attendance !== "represented")) return null;
                                      const current = (item.votes || []).find((v: any) => Number(v.memberId) === Number(member.id));
                                      return (
                                        <div key={member.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-2">
                                          <div className="text-sm">
                                            <span className="font-medium">{member.fullName}</span>
                                            <span className="text-xs text-gray-400 ml-2">{attendanceLabel[att.attendance]}</span>
                                            {current?.phase === "official" && <Badge variant="outline" className="ml-2">{choiceLabel[current.choice as Choice]}</Badge>}
                                          </div>
                                          <div className="flex gap-1">
                                            <Button size="sm" variant="outline" onClick={() => recordVote.mutate({ itemId: item.id, memberId: member.id, choice: "for" })}>Pour</Button>
                                            <Button size="sm" variant="outline" onClick={() => recordVote.mutate({ itemId: item.id, memberId: member.id, choice: "against" })}>Contre</Button>
                                            <Button size="sm" variant="outline" onClick={() => recordVote.mutate({ itemId: item.id, memberId: member.id, choice: "abstain" })}>Abst.</Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                      {(meeting.agenda || []).length === 0 && <div className="text-sm text-gray-400">Aucun point à l'ordre du jour.</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!snapshot.isLoading && (snapshot.data?.meetings || []).length === 0 && (
              <Card><CardContent className="py-14 text-center text-gray-400">Aucune réunion créée.</CardContent></Card>
            )}
          </div>
        )}

        {tab === "myvotes" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mes votes du Conseil d'Administration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!myQueue.data?.member && !myQueue.isLoading && (
                <div className="rounded-lg bg-slate-50 p-5 text-sm text-gray-600">
                  Votre compte n'est actuellement associé à aucun membre du Conseil d'Administration. L'association se fait automatiquement avec l'adresse email enregistrée dans « Membres CA ».
                </div>
              )}

              {myQueue.data?.member && (
                <div className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[#001a3d]">{myQueue.data.member.fullName}</div>
                    <div className="text-xs text-gray-500">{myQueue.data.member.roleTitle || "Administrateur"} · {myQueue.data.member.email}</div>
                  </div>
                  {Number(myQueue.data.member.isPresident) === 1 && <Badge className="bg-[#D4AF37] text-[#001a3d]">Président</Badge>}
                </div>
              )}

              {(myQueue.data?.items || []).map((item: any) => (
                <div key={item.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#001a3d]">{item.meetingTitle} — {item.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{fmt(item.meetingDate)} · {attendanceLabel[item.attendance] || "Présence non renseignée"}</div>
                      {item.description && <p className="text-sm text-gray-600 mt-2">{item.description}</p>}
                    </div>
                    <StateBadge state={item.state} />
                  </div>

                  {item.phase === "deferred" && item.consultationDeadline && (
                    <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                      Consultation différée ouverte jusqu'au <strong>{fmt(item.consultationDeadline)}</strong>. Cette réponse est conservée séparément du résultat officiel de la réunion.
                    </div>
                  )}

                  {item.choice && <div className="text-sm">Votre réponse enregistrée : <strong>{choiceLabel[item.choice as Choice]}</strong></div>}

                  {item.canVote && (
                    <div className="flex gap-2 flex-wrap">
                      <Button className="bg-green-600 hover:bg-green-700" onClick={() => castMyVote.mutate({ itemId: item.id, choice: "for" })}><CheckCircle2 className="w-4 h-4 mr-2" /> Pour</Button>
                      <Button variant="destructive" onClick={() => castMyVote.mutate({ itemId: item.id, choice: "against" })}><XCircle className="w-4 h-4 mr-2" /> Contre</Button>
                      <Button variant="outline" onClick={() => castMyVote.mutate({ itemId: item.id, choice: "abstain" })}>Abstention</Button>
                    </div>
                  )}
                </div>
              ))}

              {myQueue.data?.member && !myQueue.isLoading && (myQueue.data.items || []).length === 0 && (
                <div className="py-10 text-center text-gray-400">Aucun vote disponible.</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, good }: { label: string; value: any; good?: boolean }) {
  const tone = good === true ? "text-green-700" : good === false ? "text-red-700" : "text-[#001a3d]";
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={"text-lg font-bold " + tone}>{value}</div>
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    official_open: { label: "Vote officiel ouvert", cls: "bg-blue-100 text-blue-800" },
    official_voted: { label: "Vote officiel enregistré", cls: "bg-green-100 text-green-800" },
    deferred_open: { label: "3 jours — vote ouvert", cls: "bg-amber-100 text-amber-900" },
    deferred_voted: { label: "Consultation enregistrée", cls: "bg-green-100 text-green-800" },
    represented: { label: "Vote via procuration", cls: "bg-purple-100 text-purple-800" },
    non_expressed_null: { label: "Non exprimé / nul", cls: "bg-slate-200 text-slate-700" },
    attendance_pending: { label: "Présence à confirmer", cls: "bg-slate-100 text-slate-600" },
    closed: { label: "Clôturé", cls: "bg-slate-100 text-slate-600" },
  };
  const item = config[state] || config.closed;
  return <Badge className={item.cls}>{item.label}</Badge>;
}
