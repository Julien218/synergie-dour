import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicLayout } from "@/components/PublicLayout";
import { useLocation } from "wouter";
import { ArrowLeft, Mail, Phone, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitContact = trpc.contact.submit.useMutation({
    onSuccess: () => {
      toast.success("Votre message a été envoyé avec succès !");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error("Erreur lors de l'envoi du message");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitContact.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
        status: "new",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error(error);
    }
  };

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
            <h1 className="text-4xl font-bold mb-2 text-[#D4AF37]">Nous Contacter</h1>
            <p className="text-[#F0E68C]">Avez-vous des questions ? Contactez-nous directement</p>
          </div>
        </div>

        {/* Content */}
        <div className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Contact Info */}
              <div className="space-y-6">
                <Card className="border-amber-200">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-5 h-5 text-amber-600" />
                      <CardTitle className="text-lg">Email</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <a href="mailto:olivier.trevis@outlook.be" className="text-blue-900 hover:text-amber-600">
                      olivier.trevis@outlook.be
                    </a>
                  </CardContent>
                </Card>

                <Card className="border-amber-200">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-5 h-5 text-amber-600" />
                      <CardTitle className="text-lg">Téléphone</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <a href="tel:+32475426942" className="text-blue-900 hover:text-amber-600">
                      0475/42.69.42
                    </a>
                  </CardContent>
                </Card>

                <Card className="border-amber-200">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-amber-600" />
                      <CardTitle className="text-lg">Adresse</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Dour<br />
                      Belgique
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Form */}
              <div className="md:col-span-2">
                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle>Formulaire de Contact</CardTitle>
                    <CardDescription>
                      Remplissez le formulaire ci-dessous et nous vous répondrons dès que possible
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nom *
                          </label>
                          <Input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="Votre nom"
                            className="border-amber-200 focus:border-amber-500"
                          />
                        </div>
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
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Téléphone
                        </label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          placeholder="0475/42.69.42"
                          className="border-amber-200 focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sujet *
                        </label>
                        <Input
                          type="text"
                          required
                          value={formData.subject}
                          onChange={(e) =>
                            setFormData({ ...formData, subject: e.target.value })
                          }
                          placeholder="Sujet de votre message"
                          className="border-amber-200 focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Message *
                        </label>
                        <textarea
                          required
                          value={formData.message}
                          onChange={(e) =>
                            setFormData({ ...formData, message: e.target.value })
                          }
                          placeholder="Votre message..."
                          rows={6}
                          className="w-full px-3 py-2 border border-amber-200 rounded-md focus:outline-none focus:border-amber-500 resize-none"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900 font-semibold"
                      >
                        <Send className="mr-2 w-4 h-4" />
                        {isSubmitting ? "Envoi en cours..." : "Envoyer le Message"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

