import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, MapPin, Euro, Phone, Mail, CheckCircle, ArrowLeft, Store } from "lucide-react";

const schema = z.object({
  titre: z.string().min(5, "Décrivez le bien en au moins 5 caractères"),
  adresse: z.string().min(5, "Adresse requise"),
  village: z.string().min(2, "Village requis"),
  surface: z.string().optional(),
  loyer: z.string().optional(),
  type_bien: z.string().min(1, "Type de bien requis"),
  nom_proprietaire: z.string().min(2, "Votre nom est requis"),
  telephone_proprietaire: z.string().min(7, "Téléphone requis"),
  email_proprietaire: z.string().email("Email invalide"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function SoumettreLocal() {
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.locaux.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => toast.error("Erreur lors de l'envoi : " + e.message),
  });

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormValues) => {
    submitMutation.mutate(data);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001a3d] to-blue-900 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center border-amber-200 shadow-2xl">
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[#001a3d]">Annonce reçue !</h2>
            <p className="text-gray-600">
              Votre local commercial a bien été soumis. Notre équipe va vérifier
              les informations et publier l'annonce sur notre site et nos réseaux
              sociaux dans les plus brefs délais.
            </p>
            <div className="pt-4 space-y-2">
              <Button
                className="w-full bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-semibold"
                onClick={() => setLocation("/")}
              >
                Retour à l'accueil
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setSubmitted(false)}>
                Soumettre un autre local
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001a3d] via-[#003d99] to-[#001a3d]">
      {/* Header */}
      <div className="bg-[#001a3d]/80 border-b border-amber-500/30 px-4 py-4">
        <div className="container mx-auto max-w-3xl flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au site
          </button>
          <div className="flex items-center gap-3 ml-4">
            <img src="/logo.png" alt="Synergie Dour" className="h-9 w-9 object-contain" />
            <span className="text-[#D4AF37] font-bold text-lg">Synergie Dour</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10">
        {/* Intro */}
        <div className="text-center mb-8 space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
              <Store className="w-8 h-8 text-[#D4AF37]" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">Publiez votre local commercial</h1>
          <p className="text-blue-200 max-w-xl mx-auto">
            Vous avez un local à louer sur l'entité de Dour ? Soumettez votre annonce
            gratuitement. Elle sera vérifiée et publiée sur notre site et nos réseaux sociaux.
          </p>
          <div className="flex justify-center gap-3 pt-2 flex-wrap">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Gratuit</Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Publication rapide</Badge>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Diffusion réseaux sociaux</Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">

            {/* Infos bien */}
            <Card className="border-amber-200/30 bg-white/95 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-[#001a3d] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#D4AF37]" />
                  Informations sur le local
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="titre">Titre de l'annonce *</Label>
                    <Input id="titre" placeholder="ex: Commerce 80m² — Rue Grande, Dour" {...register("titre")} />
                    {errors.titre && <p className="text-sm text-red-600">{errors.titre.message}</p>}
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="adresse">Adresse *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <Input id="adresse" className="pl-9" placeholder="Rue Grande, 12" {...register("adresse")} />
                    </div>
                    {errors.adresse && <p className="text-sm text-red-600">{errors.adresse.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="village">Village / Localité *</Label>
                    <Select onValueChange={(v) => setValue("village", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {["Dour", "Elouges", "Wihéries", "Blaugies", "Douvrain"].map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.village && <p className="text-sm text-red-600">{errors.village.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="type_bien">Type de bien *</Label>
                    <Select onValueChange={(v) => setValue("type_bien", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {["Commerce", "Rez commercial", "Surface commerciale", "Restaurant / Horeca", "Atelier"].map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.type_bien && <p className="text-sm text-red-600">{errors.type_bien.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="surface">Surface (m²)</Label>
                    <Input id="surface" type="number" placeholder="ex: 80" {...register("surface")} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="loyer">Loyer mensuel (€)</Label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <Input id="loyer" className="pl-9" type="number" placeholder="ex: 800" {...register("loyer")} />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="description">Description complémentaire</Label>
                    <Textarea
                      id="description"
                      placeholder="Vitrine, parking, cave, état général, disponibilité..."
                      rows={3}
                      {...register("description")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coordonnées propriétaire */}
            <Card className="border-amber-200/30 bg-white/95 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-[#001a3d] flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#D4AF37]" />
                  Vos coordonnées
                </CardTitle>
                <CardDescription>Ces informations restent confidentielles — non publiées publiquement.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nom_proprietaire">Nom / Prénom *</Label>
                    <Input id="nom_proprietaire" placeholder="Jean Dupont" {...register("nom_proprietaire")} />
                    {errors.nom_proprietaire && <p className="text-sm text-red-600">{errors.nom_proprietaire.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telephone_proprietaire">Téléphone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <Input id="telephone_proprietaire" className="pl-9" placeholder="04xx/xx.xx.xx" {...register("telephone_proprietaire")} />
                    </div>
                    {errors.telephone_proprietaire && <p className="text-sm text-red-600">{errors.telephone_proprietaire.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email_proprietaire">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <Input id="email_proprietaire" className="pl-9" type="email" placeholder="email@exemple.be" {...register("email_proprietaire")} />
                    </div>
                    {errors.email_proprietaire && <p className="text-sm text-red-600">{errors.email_proprietaire.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={isSubmitting || submitMutation.isPending}
              className="w-full h-12 bg-[#D4AF37] hover:bg-[#F0E68C] text-[#001a3d] font-bold text-base shadow-lg"
            >
              {submitMutation.isPending ? "Envoi en cours..." : "Soumettre mon annonce gratuitement"}
            </Button>

            <p className="text-center text-blue-200 text-sm">
              En soumettant, vous acceptez que Synergie Dour publie votre annonce sur son site et ses réseaux sociaux.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
