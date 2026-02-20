import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicLayout } from "@/components/PublicLayout";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Membership() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    businessName: "",
    businessCategory: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: categories = [] } = trpc.categories.list.useQuery();

  const submitMembership = trpc.membership.request.useMutation({
    onSuccess: () => {
      toast.success("Votre demande d'adhésion a été envoyée avec succès !");
      setFormData({
        businessName: "",
        businessCategory: "",
        contactName: "",
        email: "",
        phone: "",
        address: "",
        message: "",
      });
      setSubmitted(true);
      setIsSubmitting(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi de la demande");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitMembership.mutateAsync({
        businessName: formData.businessName,
        businessCategory: formData.businessCategory,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        message: formData.message,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="min-h-screen bg-background">
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-12 px-4">
            <div className="container mx-auto max-w-6xl">
              <Button 
                onClick={() => setLocation("/")}
                variant="ghost" 
                className="text-white hover:bg-white/10 mb-6"
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Retour
              </Button>
              <h1 className="text-4xl font-bold mb-2 text-amber-300">Demande d'Adhésion</h1>
            </div>
          </div>

          <div className="py-12 px-4">
            <div className="container mx-auto max-w-2xl">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-12 pb-12 text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-green-900 mb-2">
                    Demande Envoyée avec Succès !
                  </h2>
                  <p className="text-green-700 mb-6">
                    Merci pour votre intérêt envers Synergie Dour. Votre demande d'adhésion a été
                    reçue et sera examinée par notre équipe dans les prochains jours.
                  </p>
                  <p className="text-green-600 mb-8">
                    Vous recevrez une confirmation par email une fois votre demande approuvée.
                  </p>
                  <Button 
                    onClick={() => setLocation("/")}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Retour à l'Accueil
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <Button 
              onClick={() => setLocation("/")}
              variant="ghost" 
              className="text-white hover:bg-white/10 mb-6"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Retour
            </Button>
            <h1 className="text-4xl font-bold mb-2 text-amber-300">Demande d'Adhésion</h1>
            <p className="text-amber-100">Rejoignez Synergie Dour et bénéficiez de nos services</p>
          </div>
        </div>

        {/* Content */}
        <div className="py-12 px-4">
          <div className="container mx-auto max-w-2xl">
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle>Formulaire de Demande d'Adhésion</CardTitle>
                <CardDescription>
                  Complétez le formulaire ci-dessous pour rejoindre notre association
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du Commerce *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={(e) =>
                        setFormData({ ...formData, businessName: e.target.value })
                      }
                      placeholder="Nom de votre commerce"
                      className="border-amber-200 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catégorie *
                    </label>
                    <select
                      required
                      value={formData.businessCategory}
                      onChange={(e) =>
                        setFormData({ ...formData, businessCategory: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-amber-200 rounded-md focus:outline-none focus:border-amber-500 bg-white"
                    >
                      <option value="">Sélectionnez une catégorie</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de Contact *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.contactName}
                      onChange={(e) =>
                        setFormData({ ...formData, contactName: e.target.value })
                      }
                      placeholder="Votre nom"
                      className="border-amber-200 focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="votre@email.com"
                        className="border-amber-200 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Téléphone *
                      </label>
                      <Input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="+32 1 23 45 67 89"
                        className="border-amber-200 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Adresse du commerce"
                      className="border-amber-200 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message (Optionnel)
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      placeholder="Parlez-nous de votre commerce..."
                      rows={4}
                      className="w-full px-3 py-2 border border-amber-200 rounded-md focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900 font-semibold"
                  >
                    {isSubmitting ? "Envoi en cours..." : "Envoyer la Demande"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
