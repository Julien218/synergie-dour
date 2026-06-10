import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { Trash2, ArrowLeft, Check } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ManageRequests() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Membership requests
  const { data: membershipRequests = [], refetch: refetchMembership } = trpc.membership.listAll.useQuery();
  const deleteMembershipMutation = trpc.membership.delete.useMutation({
    onSuccess: () => {
      toast.success("Demande supprimée avec succès");
      refetchMembership();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Contact requests
  const { data: contactRequests = [], refetch: refetchContact } = trpc.contact.listAll.useQuery();
  const deleteContactMutation = trpc.contact.delete.useMutation({
    onSuccess: () => {
      toast.success("Demande supprimée avec succès");
      refetchContact();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleDeleteMembership = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette demande ?")) {
      deleteMembershipMutation.mutate(id);
    }
  };

  const handleDeleteContact = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette demande ?")) {
      deleteContactMutation.mutate(id);
    }
  };

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600">Accès réservé aux administrateurs</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold text-blue-900">Gestion des Demandes</h1>
        </div>

        <Tabs defaultValue="membership" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="membership">
              Demandes d'Adhésion ({membershipRequests.length})
            </TabsTrigger>
            <TabsTrigger value="contact">
              Demandes de Contact ({contactRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* Membership Requests */}
          <TabsContent value="membership" className="space-y-4">
            {membershipRequests.length === 0 ? (
              <Card className="border-amber-200">
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">Aucune demande d'adhésion pour le moment.</p>
                </CardContent>
              </Card>
            ) : (
              membershipRequests.map((request) => (
                <Card key={request.id} className="border-amber-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{request.businessName}</CardTitle>
                        <CardDescription>{request.businessCategory}</CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {new Date(request.createdAt).toLocaleString("fr-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm"><strong>Contact :</strong> {request.contactName}</p>
                      <p className="text-sm"><strong>Email :</strong> {request.email}</p>
                      {request.phone && <p className="text-sm"><strong>Téléphone :</strong> {request.phone}</p>}
                      {request.address && <p className="text-sm"><strong>Adresse :</strong> {request.address}</p>}
                      {request.message && (
                        <div className="mt-2 p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-700">{request.message}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteMembership(request.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Contact Requests */}
          <TabsContent value="contact" className="space-y-4">
            {contactRequests.length === 0 ? (
              <Card className="border-amber-200">
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">Aucune demande de contact pour le moment.</p>
                </CardContent>
              </Card>
            ) : (
              contactRequests.map((request) => (
                <Card key={request.id} className="border-amber-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{request.name}</CardTitle>
                        <CardDescription>{request.subject || "Sans sujet"}</CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {new Date(request.createdAt).toLocaleString("fr-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm"><strong>Email :</strong> {request.email}</p>
                      {request.phone && <p className="text-sm"><strong>Téléphone :</strong> {request.phone}</p>}
                      <div className="mt-2 p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-700">{request.message}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteContact(request.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
