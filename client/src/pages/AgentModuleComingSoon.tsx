import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

// Module "Agent IA" (vérification automatique des ressources légales/fiscales) :
// désactivé temporairement le 08/07/2026 — les routeurs backend pendingChanges/agent
// n'étaient pas réellement intégrés à l'API (code resté à l'état de brouillon dans
// server/routers/routerExtensions.ts, jamais importé dans l'appRouter). Réactiver
// uniquement une fois les routes correctement câblées et testées.
export default function AgentModuleComingSoon() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Construction className="h-6 w-6 text-amber-600" />
            <CardTitle>Module Agent IA — en préparation</CardTitle>
          </div>
          <CardDescription>
            Ce module de vérification automatique des ressources légales n'est pas encore activé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            La veille légale hebdomadaire reste assurée normalement via l'automatisation
            existante. Cette interface d'approbation manuelle sera activée dans une prochaine
            mise à jour.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Retour au dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
