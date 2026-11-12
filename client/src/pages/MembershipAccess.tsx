import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MembershipAccess() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const mutation = trpc.membership.activateAccess.useMutation();
  return <PublicLayout><main className="max-w-lg mx-auto px-5 py-16 space-y-6">
    <h1 className="text-3xl font-bold">Votre accès membre</h1>
    <p>Après activation de votre adhésion, choisissez votre mot de passe. Si vous avez déjà un compte, utilisez vos identifiants habituels.</p>
    {mutation.isSuccess ? <p role="status">Votre mot de passe est enregistré. Vous pouvez vous connecter.</p> :
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (password === confirmation) mutation.mutate({ token, password }); }}>
        <Label htmlFor="member-password">Mot de passe (12 caractères minimum)</Label>
        <Input id="member-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} />
        <Label htmlFor="member-confirmation">Confirmer le mot de passe</Label>
        <Input id="member-confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} />
        {confirmation && password !== confirmation && <p role="alert">Les mots de passe ne correspondent pas.</p>}
        {mutation.error && <p role="alert">{mutation.error.message}</p>}
        <Button disabled={!token || mutation.isPending || password !== confirmation}>Activer mon accès</Button>
      </form>}
    <p><Link href="/login" className="underline">Me connecter</Link></p>
    <p>Besoin d’un nouveau lien ? <a href="mailto:contact@synergiedour.be" className="underline">Contacter le bureau</a></p>
  </main></PublicLayout>;
}
