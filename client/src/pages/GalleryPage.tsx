import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon, Trash2, Video, Globe, Phone, Mail, Store } from "lucide-react";
import { toast } from "sonner";

export default function GalleryPage() {
  const { data: profile, refetch, isLoading } = trpc.merchants.getMyProfile.useQuery();
  const updateProfile = trpc.merchants.updateMyProfile.useMutation({
    onSuccess: () => {
      toast.success("Profil mis à jour avec succès");
      refetch();
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const [logoUrl, setLogoUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-2xl mx-auto text-center">
          <Store className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Aucun profil commerçant</h2>
          <p className="text-gray-500">Votre profil commerçant n&apos;a pas encore été créé. Contactez un administrateur.</p>
        </div>
      </DashboardLayout>
    );
  }

  const photos: string[] = Array.isArray(profile.photos) ? profile.photos : 
    (profile.photos ? [profile.photos] : []);
  const videos: string[] = Array.isArray(profile.videos) ? profile.videos :
    (profile.videos ? [profile.videos] : []);

  const addLogo = () => {
    if (!logoUrl.trim()) return;
    updateProfile.mutate({ logo: logoUrl.trim() });
    setLogoUrl("");
  };

  const addPhoto = () => {
    if (!photoUrl.trim()) return;
    const newPhotos = [...photos, photoUrl.trim()];
    updateProfile.mutate({ photos: newPhotos });
    setPhotoUrl("");
  };

  const removePhoto = (idx: number) => {
    const newPhotos = photos.filter((_: any, i: number) => i !== idx);
    updateProfile.mutate({ photos: newPhotos });
  };

  const addVideo = () => {
    if (!videoUrl.trim()) return;
    const newVideos = [...videos, videoUrl.trim()];
    updateProfile.mutate({ videos: newVideos });
    setVideoUrl("");
  };

  const removeVideo = (idx: number) => {
    const newVideos = videos.filter((_: any, i: number) => i !== idx);
    updateProfile.mutate({ videos: newVideos });
  };

  const saveEdit = () => {
    if (!editData) return;
    updateProfile.mutate(editData);
    setEditMode(false);
    setEditData(null);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Ma Galerie & Mon Profil</h1>
            <p className="text-sm text-gray-500 mt-1">Gérez la présentation de votre commerce sur Synergie Dour</p>
          </div>
          <Badge className={profile.status === "approved" ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600"}>
            {profile.status === "approved" ? "Actif" : "En attente"}
          </Badge>
        </div>

        {/* Infos de base */}
        <Card className="border-amber-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-900 flex items-center gap-2">
              <Store className="w-4 h-4" /> Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!editMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block">Nom du commerce</span>
                  <span className="font-semibold text-blue-900">{profile.businessName || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Catégorie</span>
                  <span>{profile.businessCategory || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{profile.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{profile.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  {profile.website
                    ? <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.website}</a>
                    : <span className="text-gray-400">—</span>}
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-500 block mb-1">Description</span>
                  <span className="text-gray-700">{profile.description || "Aucune description"}</span>
                </div>
                <div className="md:col-span-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditMode(true); setEditData({ ...profile }); }}>
                    Modifier mes informations
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {[
                  { key: "phone", label: "Téléphone", type: "text" },
                  { key: "email", label: "Email", type: "email" },
                  { key: "website", label: "Site web", type: "url" },
                  { key: "address", label: "Adresse", type: "text" },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="text-gray-500 block mb-1">{label}</label>
                    <input
                      type={type}
                      value={editData?.[key] || ""}
                      onChange={e => setEditData((d: any) => ({ ...d, [key]: e.target.value }))}
                      className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="text-gray-500 block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editData?.description || ""}
                    onChange={e => setEditData((d: any) => ({ ...d, description: e.target.value }))}
                    className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button size="sm" onClick={saveEdit} className="bg-blue-900 text-white hover:bg-blue-800" disabled={updateProfile.isPending}>
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditMode(false); setEditData(null); }}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="border-amber-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Logo du commerce
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              {profile.logo ? (
                <div className="relative">
                  <img src={profile.logo} alt="Logo" className="w-24 h-24 object-contain rounded-lg border border-amber-200 bg-gray-50 p-2" />
                  <button
                    onClick={() => updateProfile.mutate({ logo: null })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-2">Entrez l&apos;URL publique de votre logo (format recommandé : carré, PNG/JPG)</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://... (URL du logo)"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    className="flex-1 border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <Button size="sm" onClick={addLogo} className="bg-amber-500 text-blue-900 hover:bg-amber-600" disabled={!logoUrl.trim() || updateProfile.isPending}>
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Galerie photos */}
        <Card className="border-amber-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Galerie Photos
              <Badge variant="outline" className="ml-auto text-xs">{photos.length} photo{photos.length !== 1 ? "s" : ""}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {photos.map((url: string, idx: number) => (
                  <div key={idx} className="relative group aspect-square">
                    <img src={url} alt={`Photo ${idx+1}`} className="w-full h-full object-cover rounded-lg border border-gray-100" />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm mb-4">Aucune photo dans la galerie.</p>
            )}
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://... (URL de la photo)"
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
                className="flex-1 border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <Button size="sm" onClick={addPhoto} className="bg-blue-900 text-white hover:bg-blue-800" disabled={!photoUrl.trim() || updateProfile.isPending}>
                <Upload className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vidéos */}
        <Card className="border-amber-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-900 flex items-center gap-2">
              <Video className="w-4 h-4" /> Vidéos
              <Badge variant="outline" className="ml-auto text-xs">{videos.length} vidéo{videos.length !== 1 ? "s" : ""}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videos.length > 0 ? (
              <div className="space-y-2 mb-4">
                {videos.map((url: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <Video className="w-4 h-4 text-gray-400 shrink-0" />
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline truncate flex-1">{url}</a>
                    <button onClick={() => removeVideo(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm mb-4">Aucune vidéo ajoutée.</p>
            )}
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://youtube.com/... ou https://vimeo.com/..."
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                className="flex-1 border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <Button size="sm" onClick={addVideo} className="bg-blue-900 text-white hover:bg-blue-800" disabled={!videoUrl.trim() || updateProfile.isPending}>
                <Upload className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
