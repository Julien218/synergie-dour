import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { MapPin, Phone, Mail, Globe, Search, Filter, ArrowLeft } from "lucide-react";

export default function Merchants() {
  const [, setLocation] = useLocation();
  const { data: merchants = [], isLoading } = trpc.merchants.list.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const filteredMerchants = useMemo(() => {
    return merchants.filter((merchant) => {
      const matchesSearch =
        merchant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.address?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = !selectedCategory || merchant.businessCategory === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [merchants, searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <Button 
            onClick={() => setLocation("/")}
            variant="ghost" 
            className="text-white hover:bg-white/10 mb-6"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Retour
          </Button>
          <h1 className="text-4xl font-bold mb-2 text-[#D4AF37]">Annuaire des Commerçants</h1>
          <p className="text-[#F0E68C]">Découvrez tous les commerçants et indépendants de Dour</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border-b border-amber-200 py-8 px-4 sticky top-0 z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Rechercher un commerce..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-amber-200 focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-amber-200 rounded-md focus:outline-none focus:border-amber-500 bg-white"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            {filteredMerchants.length} résultat{filteredMerchants.length !== 1 ? "s" : ""} trouvé{filteredMerchants.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Merchants Grid */}
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement des commerçants...</p>
            </div>
          ) : filteredMerchants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Aucun commerce ne correspond à votre recherche.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMerchants.map((merchant) => (
                <div 
                  key={merchant.id} 
                  onClick={() => setLocation(`/merchants/${merchant.id}`)}
                  className="cursor-pointer"
                >
                  <Card className="h-full hover:shadow-lg transition-shadow border-amber-100 overflow-hidden">
                    {merchant.logo && (
                      <div className="h-32 bg-gradient-to-br from-amber-100 to-blue-100 overflow-hidden">
                        <img
                          src={merchant.logo}
                          alt={merchant.businessName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-blue-900">{merchant.businessName}</CardTitle>
                          <CardDescription className="text-amber-600">
                            {merchant.businessCategory}
                          </CardDescription>
                        </div>
                        {merchant.isVerified && (
                          <Badge className="bg-green-500 text-white shrink-0">Vérifié</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-600 line-clamp-2">{merchant.description}</p>

                      <div className="space-y-2 text-sm text-gray-500 border-t border-gray-100 pt-3">
                        {merchant.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{merchant.address}</span>
                          </div>
                        )}
                        {merchant.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-amber-600 shrink-0" />
                            <a href={`tel:${merchant.phone}`} className="hover:text-amber-600">
                              {merchant.phone}
                            </a>
                          </div>
                        )}
                        {merchant.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                            <a href={`mailto:${merchant.email}`} className="hover:text-amber-600 truncate">
                              {merchant.email}
                            </a>
                          </div>
                        )}
                        {merchant.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-amber-600 shrink-0" />
                            <a
                              href={merchant.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-amber-600 truncate"
                            >
                              Visiter le site
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
