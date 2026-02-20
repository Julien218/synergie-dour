import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { Plus, Edit, Trash2, ArrowLeft, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ManageMerchants() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: merchantsList = [], refetch } = trpc.merchants.listAll.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    businessName: "",
    businessCategory: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    status: "pending" as "pending" | "approved" | "rejected",
  });

  const updateMutation = trpc.merchants.update.useMutation({
    onSuccess: () => {
      toast.success("Commerçant mis à jour avec succès");
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteMutation = trpc.merchants.delete.useMutation({
    onSuccess: () => {
      toast.success("Commerçant supprimé avec succès");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      businessName: "",
      businessCategory: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      status: "pending",
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    }
  };

  const handleEdit = (merchant: any) => {
    setFormData({
      businessName: merchant.businessName,
      businessCategory: merchant.businessCategory,
      description: merchant.description || "",
      address: merchant.address,
      phone: merchant.phone || "",
      email: merchant.email || "",
      website: merchant.website || "",
      status: merchant.status,
    });
    setEditingId(merchant.id);
    setIsCreating(true);
  };

  const handleApprove = (id: number) => {
    updateMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir rejeter ce commerçant ?")) {
      updateMutation.mutate({ id, status: "rejected" });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce commerçant ?")) {
      deleteMutation.mutate(id);
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

  const pendingMerchants = merchantsList.filter(m => m.status === "pending");
  const approvedMerchants = merchantsList.filter(m => m.status === "approved");
  const rejectedMerchants = merchantsList.filter(m => m.status === "rejected");

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
            <h1 className="text-3xl font-bold text-blue-900">Gestion des Commerçants</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{pendingMerchants.length}</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Approuvés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{approvedMerchants.length}</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Rejetés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{rejectedMerchants.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form */}
        {isCreating && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Modifier le Commerçant</CardTitle>
              <CardDescription>Modifiez les informations ci-dessous</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nom du commerce *</label>
                    <Input
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Catégorie *</label>
                    <select
                      value={formData.businessCategory}
                      onChange={(e) => setFormData({ ...formData, businessCategory: e.target.value })}
                      className="w-full border rounded-md p-2"
                      required
                    >
                      <option value="">Sélectionnez une catégorie</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Adresse *</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Téléphone</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Site web</label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="pending">En attente</option>
                    <option value="approved">Approuvé</option>
                    <option value="rejected">Rejeté</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-blue-900">
                    Mettre à jour
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Pending Merchants */}
        {pendingMerchants.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-blue-900">Demandes en attente</h2>
            {pendingMerchants.map((merchant) => (
              <Card key={merchant.id} className="border-amber-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{merchant.businessName}</CardTitle>
                      <CardDescription>
                        {merchant.businessCategory} • {merchant.address}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">En attente</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {merchant.phone && <p className="text-sm">📞 {merchant.phone}</p>}
                    {merchant.email && <p className="text-sm">📧 {merchant.email}</p>}
                    {merchant.description && <p className="text-sm text-gray-600">{merchant.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(merchant.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(merchant.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Rejeter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(merchant)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Approved Merchants */}
        {approvedMerchants.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-blue-900">Commerçants approuvés</h2>
            {approvedMerchants.map((merchant) => (
              <Card key={merchant.id} className="border-green-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{merchant.businessName}</CardTitle>
                      <CardDescription>
                        {merchant.businessCategory} • {merchant.address}
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-600">Approuvé</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(merchant)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(merchant.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
