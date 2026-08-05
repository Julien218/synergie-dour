import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "wouter";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Loader2,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";

type OnboardingData = {
  businessName: string;
  contactName: string;
  website: string;
  socialMedia: string;
  activityDescription: string;
  openingHours: string;
  appointmentRequested: boolean;
  publicationConsent: boolean;
  completed: boolean;
  media: Array<{ key: string; url: string | null }>;
  appointmentUrl: string | null;
};

async function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error || new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}

export default function MembershipOnboarding() {
  const { token = "" } = useParams<{ token: string }>();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch(`/api/membership/onboarding/${token}`);
    const payload = await response.json();
    if (!response.ok)
      throw new Error(payload.message || "Lien invalide ou expiré.");
    setData(payload);
  };

  useEffect(() => {
    load()
      .catch(reason => setError(reason.message))
      .finally(() => setLoading(false));
  }, [token]);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const mediaType = file.type.startsWith("video/") ? "video" : "image";
        const response = await fetch(
          `/api/membership/onboarding/${token}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dataBase64: await fileAsDataUrl(file),
              contentType: file.type,
              mediaType,
            }),
          }
        );
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.message || `Échec de l'envoi de ${file.name}`
          );
      }
      await load();
      toast.success("Média enregistré");
    } catch (reason: any) {
      toast.error(reason.message || "Le média n'a pas pu être enregistré");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/membership/onboarding/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.message || "Enregistrement impossible");
      setData(current => (current ? { ...current, completed: true } : current));
      toast.success("Votre fiche a bien été transmise à Synergie Dour");
    } catch (reason: any) {
      toast.error(reason.message || "Votre fiche n'a pas pu être enregistrée");
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K]
  ) => setData(current => (current ? { ...current, [key]: value } : current));

  return (
    <PublicLayout>
      <main className="min-h-screen bg-gradient-to-b from-[#001a3d] via-[#003d99] to-gray-50 py-12 px-4">
        <div className="mx-auto max-w-3xl">
          {loading ? (
            <div className="flex min-h-[50vh] items-center justify-center text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error || !data ? (
            <Card>
              <CardContent className="py-12 text-center">
                <h1 className="text-2xl font-bold text-[#001a3d]">
                  Lien indisponible
                </h1>
                <p className="mt-3 text-gray-600">{error}</p>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              <Card className="border-amber-300 shadow-xl">
                <CardHeader>
                  <div className="text-sm font-semibold uppercase tracking-wider text-[#b58b14]">
                    Adhésion payée
                  </div>
                  <CardTitle className="text-3xl text-[#001a3d]">
                    Présentez {data.businessName}
                  </CardTitle>
                  <p className="text-gray-600">
                    Bonjour {data.contactName}. Ces informations seront
                    contrôlées par un administrateur avant toute publication.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {data.completed && (
                    <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                      <p>
                        Votre fiche a été transmise. Vous pouvez encore la
                        corriger tant que ce lien reste valide.
                      </p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="activity">Description du commerce *</Label>
                    <Textarea
                      id="activity"
                      required
                      minLength={20}
                      rows={6}
                      value={data.activityDescription}
                      onChange={e => set("activityDescription", e.target.value)}
                      placeholder="Votre activité, vos spécialités et ce qui vous distingue…"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="website">Site internet</Label>
                      <Input
                        id="website"
                        type="url"
                        value={data.website}
                        onChange={e => set("website", e.target.value)}
                        placeholder="https://…"
                      />
                    </div>
                    <div>
                      <Label htmlFor="social">Réseaux sociaux</Label>
                      <Input
                        id="social"
                        value={data.socialMedia}
                        onChange={e => set("socialMedia", e.target.value)}
                        placeholder="Facebook, Instagram, LinkedIn…"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="hours">Horaires d'ouverture</Label>
                    <Textarea
                      id="hours"
                      rows={4}
                      value={data.openingHours}
                      onChange={e => set("openingHours", e.target.value)}
                      placeholder="Lundi : 9h–18h…"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#001a3d]">
                    <ImagePlus className="h-5 w-5 text-[#D4AF37]" /> Photos et
                    vidéo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Formats acceptés : JPG, PNG, WebP, MP4 ou WebM. Maximum 15
                    Mo par image et 200 Mo par vidéo.
                  </p>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#D4AF37] bg-amber-50 px-4 py-8 font-semibold text-[#001a3d] hover:bg-amber-100">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    {uploading
                      ? "Téléversement en cours…"
                      : "Ajouter mes photos ou ma vidéo"}
                    <input
                      className="sr-only"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                      disabled={uploading}
                      onChange={e => uploadFiles(e.target.files)}
                    />
                  </label>
                  {data.media.length > 0 && (
                    <p className="text-sm font-medium text-emerald-700">
                      {data.media.length} média(s) reçu(s).
                    </p>
                  )}
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Checkbox
                      id="appointment"
                      checked={data.appointmentRequested}
                      onCheckedChange={value =>
                        set("appointmentRequested", Boolean(value))
                      }
                    />
                    <div>
                      <Label htmlFor="appointment" className="cursor-pointer">
                        Je souhaite que Synergie Dour réalise la vidéo de mon
                        commerce
                      </Label>
                      <p className="mt-1 text-xs text-gray-500">
                        Olivier recevra votre demande afin de vous proposer un
                        rendez-vous.
                      </p>
                    </div>
                  </div>
                  {data.appointmentUrl && data.appointmentRequested && (
                    <a
                      href={data.appointmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#003d99] hover:underline"
                    >
                      Choisir un rendez-vous{" "}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <Checkbox
                      id="consent"
                      checked={data.publicationConsent}
                      onCheckedChange={value =>
                        set("publicationConsent", Boolean(value))
                      }
                    />
                    <Label
                      htmlFor="consent"
                      className="cursor-pointer leading-5"
                    >
                      J'autorise Synergie Dour à utiliser, monter et publier les
                      médias transmis sur sa plateforme et ses réseaux
                      officiels, après validation administrative.
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                disabled={saving || uploading}
                className="w-full bg-[#D4AF37] py-6 font-bold text-[#001a3d] hover:bg-[#c7a329]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />{" "}
                    Enregistrement…
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-5 w-5" /> Transmettre ma fiche
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </main>
    </PublicLayout>
  );
}
