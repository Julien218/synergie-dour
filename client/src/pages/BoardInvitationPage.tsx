import { useEffect, useRef, useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

const STORAGE_KEY = "synergie.boardInvitation";
function readToken() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const supplied = fragment.get("token");
  if (supplied !== null) return /^[a-f0-9]{64}$/.test(supplied) ? supplied : "";
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY) || "";
    return /^[a-f0-9]{64}$/.test(saved) ? saved : "";
  } catch { return ""; }
}
function forgetToken() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be disabled. */ }
}

export default function BoardInvitationPage() {
  // Reading does not consume the invitation. StrictMode can safely call this twice.
  const [token] = useState(readToken);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);
  const inspected = useRef(false);
  const inspect = trpc.board.invitations.inspect.useMutation();
  const accept = trpc.board.invitations.accept.useMutation();
  const login = trpc.auth.login.useMutation();
  const session = trpc.auth.me.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  useEffect(() => {
    // Only the URL fragment contains the secret; it is never sent in a URL to the server.
    window.history.replaceState(window.history.state, "", window.location.pathname);
    if (token) {
      try { sessionStorage.setItem(STORAGE_KEY, token); } catch { /* In-memory flow remains usable. */ }
      if (!inspected.current) {
        inspected.current = true;
        inspect.mutate({ token });
      }
    } else forgetToken();
    const previousTitle = document.title;
    document.title = "Activer mon accès Conseil & Votes — Synergie Dour";
    const referrer = document.createElement("meta");
    referrer.name = "referrer";
    referrer.content = "no-referrer";
    document.head.appendChild(referrer);
    return () => { referrer.remove(); document.title = previousTitle; };
  }, [token]);

  const details = inspect.data;
  const sameAccount = !!details && !!session.data &&
    String(session.data.email || "").trim().toLowerCase() === details.email.trim().toLowerCase();
  const isNewAccount = !!details && !details.hasAccount && !accountCreated;
  const needsPassword = isNewAccount || accountCreated || (!!details?.hasAccount && !sameAccount);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!details || busy) return;
    setError("");
    if (isNewAccount && (password.length < 12 || password.length > 128 || password !== confirmation)) {
      setError("Choisissez un mot de passe de 12 à 128 caractères et confirmez-le à l'identique.");
      return;
    }
    setBusy(true);
    try {
      if (accountCreated) {
        // The token is already consumed. A failed sign-in must not create another account.
        await login.mutateAsync({ email: details.email, password });
      } else if (isNewAccount) {
        await accept.mutateAsync({ token, password, passwordConfirmation: confirmation });
        setAccountCreated(true);
        forgetToken();
        await login.mutateAsync({ email: details.email, password });
      } else {
        if (!sameAccount) await login.mutateAsync({ email: details.email, password });
        await accept.mutateAsync({ token });
      }
      forgetToken();
      setPassword("");
      setConfirmation("");
      await utils.auth.me.invalidate();
      window.location.assign("/dashboard/board");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "L'activation n'a pas pu aboutir. Réessayez.";
      setError(message === "Invalid credentials" ? "Identifiants incorrects. Utilisez le mot de passe habituel du compte invité." : message);
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[#001a3d] px-4 py-10 text-slate-900 sm:py-16">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <header className="text-center">
          <img src="/logo-sd-transparent.png" alt="Synergie Dour" className="mx-auto mb-4 h-20 w-20 object-contain" />
          <h1 className="text-2xl font-bold text-[#D4AF37]">Conseil &amp; Votes</h1>
          <p className="mt-2 text-sm text-slate-200">Activation de votre accès personnel</p>
        </header>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="h-5 w-5 shrink-0" /> Invitation sécurisée</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {!token ? (
              <p role="alert">Le lien d'invitation est absent ou incomplet. Ouvrez le bouton reçu par email ou demandez à l'administrateur de renvoyer une invitation.</p>
            ) : inspect.isPending || (!details && !inspect.error) ? (
              <p className="flex items-center gap-2" role="status"><Loader2 className="h-5 w-5 animate-spin" /> Vérification de votre invitation…</p>
            ) : inspect.error ? (
              <div className="space-y-3" role="alert">
                <p>{inspect.error.message || "L'invitation ne peut pas être vérifiée."}</p>
                <Button variant="outline" onClick={() => inspect.mutate({ token })}>Réessayer la vérification</Button>
                <p className="text-sm text-slate-500">Un lien expiré, utilisé ou annulé nécessite une nouvelle invitation de l'administrateur.</p>
              </div>
            ) : details && (
              <form onSubmit={submit} className="space-y-5">
                <p>Bonjour <strong>{details.fullName}</strong>, votre accès sera associé à <strong className="break-all">{details.email}</strong>.</p>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="font-semibold">Autorisations accordées</p>
                  <p className="mt-2">{[
                    details.canCalendar && "Calendrier et rappels de réunions",
                    details.canVotes && "Votes en ligne",
                    details.canMinutes && "PV et comptes-rendus",
                  ].filter(Boolean).join(" · ") || "Aucune autorisation de consultation n'a encore été accordée."}</p>
                  <p className="mt-2 text-slate-600">Cet accès n'ouvre pas le CRM, la liste clients ou les adhésions.</p>
                </div>
                {accountCreated ? <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">Votre compte et votre accès sont activés. Terminez la connexion avec le mot de passe que vous venez de choisir.</p> : isNewAccount ? <p className="text-sm">Choisissez votre mot de passe pour créer votre compte et activer l'accès.</p> : sameAccount ? <p className="text-sm">Vous êtes connecté avec le compte invité. Confirmez l'activation ci-dessous.</p> : <p className="text-sm">Un compte existe déjà avec cette adresse. Connectez-vous avec son mot de passe habituel ; cette invitation ne le modifie pas.</p>}
                {needsPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="board-invitation-password">{isNewAccount ? "Créer un mot de passe" : "Mot de passe du compte invité"}</Label>
                    <Input id="board-invitation-password" type="password" autoComplete={isNewAccount ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} minLength={isNewAccount ? 12 : 1} maxLength={isNewAccount ? 128 : undefined} required disabled={busy} />
                    {isNewAccount && <p className="text-xs text-slate-500">12 à 128 caractères. Une phrase de passe est acceptée.</p>}
                  </div>
                )}
                {isNewAccount && (
                  <div className="space-y-2">
                    <Label htmlFor="board-invitation-confirmation">Confirmer le mot de passe</Label>
                    <Input id="board-invitation-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={12} maxLength={128} required disabled={busy} />
                  </div>
                )}
                {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
                <Button type="submit" className="h-auto w-full whitespace-normal bg-[#D4AF37] py-3 text-[#001a3d] hover:bg-amber-300" disabled={busy || session.isLoading}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />}
                  {busy ? "Activation en cours…" : accountCreated ? "Me connecter" : isNewAccount ? "Créer mon compte et activer mon accès" : sameAccount ? "Activer mon accès Conseil & Votes" : "Me connecter et activer mon accès"}
                </Button>
                {!accountCreated && <p className="text-xs text-slate-500">Lien personnel à usage unique, valable jusqu'au {new Date(details.expiresAt).toLocaleString("fr-BE", { timeZone: "Europe/Brussels", dateStyle: "long", timeStyle: "short" })} (heure de Bruxelles).</p>}
              </form>
            )}
            <p className="border-t pt-4 text-sm text-slate-500">Un accès déjà activé reste accessible depuis <a href="/dashboard/board" className="font-medium text-[#001a3d] underline">votre espace Conseil &amp; Votes</a>.</p>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-slate-300">Synergie Dour ASBL · Ne transférez pas votre lien d'invitation.</p>
      </div>
    </main>
  );
}
