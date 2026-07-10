import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ManageEvents() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: eventsList = [], refetch } = trpc.events.listAll.useQuery();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    startDate: "",
    status: "draft" as "draft" | "published",
  });

  const createMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("Événement créé avec succès");
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success("Événement mis à jour avec succès");
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast.success("Événement supprimé avec succès");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({ title: "", description: "", location: "", startDate: "", status: "draft" });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      startDate: new Date(formData.startDate),
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (event: any) => {
    setFormData({
      title: event.title,
      description: event.description,
      location: event.location || "",
      startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : "",
      status: event.status,
    });
    setEditingId(event.id);
    setIsCreating(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
      deleteMutation.mutate(id);
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  if (!isAdmin) {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-3xl font-bold text-blue-900">Gestion des Événements</h1>
          </div>
          {!isCreating && (
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-amber-500 hover:bg-amber-600 text-blue-900"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvel Événement
            </Button>
          )}
        </div>

        {/* Create/Edit Form */}
        {isCreating && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>{editingId ? "Modifier l'Événement" : "Nouvel Événement"}</CardTitle>
              <CardDescription>Remplissez les informations ci-dessous</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Titre *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Lieu</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Date de l'événement *</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description *</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-blue-900">
                    {editingId ? "Mettre à jour" : "Créer"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Events List */}
        <div className="grid gap-4">
          {eventsList.map((event) => (
            <Card key={event.id} className="border-amber-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription>
                      {event.location && `📍 ${event.location} • `}
                      {event.startDate && new Date(event.startDate).toLocaleString("fr-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </CardDescription>
                  </div>
                  <Badge variant={event.status === "published" ? "default" : "secondary"}>
                    {event.status === "published" ? "Publié" : "Brouillon"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(event)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(event.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {eventsList.length === 0 && !isCreating && (
            <Card className="border-amber-200">
              <CardContent className="text-center py-12">
                <p className="text-gray-500">Aucun événement pour le moment.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
