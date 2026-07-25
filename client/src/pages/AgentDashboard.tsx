/**
 * AgentDashboard — page orpheline (non routée)
 * Référence des routes tRPC (pendingChanges, agent) qui n'existent pas dans le routeur.
 * Stubbée pour permettre la compilation TypeScript.
 * Module Agent IA fonctionnel : voir /dashboard/agent (AgentModuleComingSoon.tsx)
 */

export default function AgentDashboard() {
  return (
    <div className="p-8">
      <p className="text-muted-foreground">
        Ce module n'est pas routé. Voir /dashboard/agent.
      </p>
    </div>
  );
}
