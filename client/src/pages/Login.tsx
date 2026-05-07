import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn } from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse e-mail est requise")
    .email("Adresse e-mail invalide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Connexion réussie ! Bienvenue.");
      setLocation("/dashboard");
    },
    onError: (error) => {
      const message =
        error.message === "Invalid credentials"
          ? "Identifiants incorrects. Vérifiez votre e-mail et mot de passe."
          : "Une erreur est survenue. Veuillez réessayer.";
      toast.error(message);
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    await loginMutation.mutateAsync({ email: data.email, password: data.password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001a3d] to-blue-800 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center gap-3">
          <img
            src="/logo.png"
            alt="Synergie Dour"
            className="h-20 w-20 object-contain drop-shadow-lg"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#D4AF37]">Synergie Dour</h1>
            <p className="text-blue-200 text-sm mt-1">
              Espace membres &amp; administration
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-amber-200/30 bg-white shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-[#001a3d]">Connexion</CardTitle>
            <CardDescription>
              Entrez vos identifiants pour accéder à votre espace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-700">
                  Adresse e-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="votre@email.com"
                  className="border-amber-200 focus:border-amber-500"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-gray-700">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="border-amber-200 focus:border-amber-500 pr-10"
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting || loginMutation.isPending}
                className="w-full bg-amber-500 hover:bg-amber-600 text-[#001a3d] font-semibold h-10"
              >
                <LogIn className="mr-2 w-4 h-4" />
                {isSubmitting || loginMutation.isPending
                  ? "Connexion en cours..."
                  : "Se Connecter"}
              </Button>
            </form>

            {/* Footer links */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-500">
                Pas encore de compte ?{" "}
                <button
                  type="button"
                  onClick={() => setLocation("/membership")}
                  className="text-amber-600 hover:text-amber-700 font-medium underline underline-offset-2 transition-colors"
                >
                  Demander une adhésion
                </button>
              </p>
              <p className="text-sm text-gray-500">
                <button
                  type="button"
                  onClick={() => setLocation("/")}
                  className="text-blue-700 hover:text-blue-900 transition-colors"
                >
                  ← Retour au site
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
