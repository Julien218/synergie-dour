import { useState, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Users, ToggleLeft, ToggleRight, Download, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

export default function ListeClients() {
  const [search, setSearch] = useState("");
  const [filtre, setFiltre] = useState<"tous" | "actifs" | "inactifs">("tous");

  const { data: rawMerchants = [], isLoading, refetch } = trpc.merchants.listAll.useQuery();
  const updateMerchant = trpc.merchants.update.useMutation({
    onSuccess: () => refetch(),
  });

  const clients = useMemo(() =>
    rawMerchants.map((c: any) => ({
      id: c.id,
      nom: c.businessName || "—",
      type: c.businessCategory || "—",
      adresse: c.address || "—",
      localite: "",
      telephone: c.phone || "—",
      email: c.email || "—",
      actif: (c.status || "Actif") !== "Inactif",
      status: c.status || "Actif",
    }))
  , [rawMerchants]);

  const toggle = (id: string | number) => {
    const c = clients.find((x: any) => x.id === id);
    if (!c) return;
    const newStatus = c.actif ? "Inactif" : "Actif";
    updateMerchant.mutate({ id, status: newStatus });
  };

  const toggleAll = (val: boolean) => {
    clients.forEach((c: any) => {
      const newStatus = val ? "Actif" : "Inactif";
      if (c.actif !== val) {
        updateMerchant.mutate({ id: c.id, status: newStatus });
      }
    });
  };

  const filtered = useMemo(() => {
    return clients.filter((c: any) => {
      const matchSearch =
        c.nom.toLowerCase().includes(search.toLowerCase()) ||
        c.type.toLowerCase().includes(search.toLowerCase()) ||
        c.adresse.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      const matchFiltre =
        filtre === "tous" ||
        (filtre === "actifs" && c.actif) ||
        (filtre === "inactifs" && !c.actif);
      return matchSearch && matchFiltre;
    });
  }, [clients, search, filtre]);

  const actifCount = clients.filter((c: any) => c.actif).length;
  const inactifCount = clients.length - actifCount;

  const exportCSV = () => {
    const actifs = clients.filter((c: any) => c.actif);
    const rows = [
      ["ID", "Type", "Nom", "Adresse", "Téléphone", "Email"],
      ...actifs.map((c: any) => [c.id, c.type, c.nom, c.adresse, c.telephone, c.email]),
    ];
    const csv = rows.map((r: any[]) => r.map((v: any) => `"${String(v).replace(/"/g, '\'')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `synergiedour_clients_actifs_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="p-4 w-full">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#001a3d]">Liste Clients</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isLoading ? "Chargement..." : (
                <>{clients.length} commerces · <span className="text-green-600 font-medium">{actifCount} actifs</span> · <span className="text-gray-400">{inactifCount} inactifs</span></>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-blue-700 border-blue-300">
              <RefreshCw className="w-4 h-4 mr-1" /> Actualiser
            </Button>
            <Button variant="outline" size="sm" onClick={() => toggleAll(true)} className="text-green-700 border-green-300">
              <ToggleRight className="w-4 h-4 mr-1" /> Tout activer
            </Button>
            <Button variant="outline" size="sm" onClick={() => toggleAll(false)} className="text-gray-500 border-gray-300">
              <ToggleLeft className="w-4 h-4 mr-1" /> Tout désactiver
            </Button>
            <Button size="sm" onClick={exportCSV} className="bg-[#D4AF37] hover:bg-[#c9a227] text-[#001a3d] font-semibold">
              <Download className="w-4 h-4 mr-1" /> Export CSV actifs
            </Button>
          </div>
        </div>

        {/* Barre recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, type, adresse ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full rounded-md border border-[#D4AF37]/40 bg-[#002366] text-white placeholder-blue-300 py-2 pr-3 text-sm focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <div className="flex gap-2">
            {(["tous", "actifs", "inactifs"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltre(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filtre === f
                    ? "bg-[#001a3d] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tableau */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-900 opacity-40" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 text-center font-semibold text-gray-500 w-12">#</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Nom</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Type</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Adresse</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Téléphone</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 hidden xl:table-cell">Email</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 min-w-[110px]">Diffusion</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c: any, idx: number) => (
                    <tr
                      key={c.id}
                      className={`border-b border-gray-50 hover:bg-amber-50/30 transition-colors ${!c.actif ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#001a3d]">{c.nom}</div>
                        <div className="text-xs text-gray-400 mt-0.5 md:hidden">{c.type}</div>
                        <div className="text-xs text-gray-400 mt-0.5 lg:hidden">{c.adresse}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="outline" className="text-xs font-normal border-[#D4AF37] text-[#8B7316]">
                          {c.type || "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600 text-xs">
                        <div>{c.adresse}</div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600 text-xs">{c.telephone || "—"}</td>
                      <td className="px-4 py-3 hidden xl:table-cell text-gray-600 text-xs">
                        {c.email && c.email.includes("@")
                          ? <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">{c.email}</a>
                          : <span className="text-gray-400 italic">{c.email || "—"}</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={c.actif}
                          onCheckedChange={() => toggle(c.id)}
                          className="data-[state=checked]:bg-green-500"
                          disabled={updateMerchant.isPending}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Aucun résultat{search ? ` pour « ${search} »` : ""}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
