import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, User, Phone, Building2, MapPin, Clock,
  CheckCheck, Reply, MessageSquare, Users, RefreshCw
} from "lucide-react";

function formatDate(d: string | Date) {
  return new Date(d).toLocaleString("fr-BE", {
    timeZone: "Europe/Brussels",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    new:     { label: "Nouveau",  cls: "bg-red-100 text-red-700 border-red-200" },
    pending: { label: "Nouveau",  cls: "bg-red-100 text-red-700 border-red-200" },
    read:    { label: "Lu",       cls: "bg-blue-100 text-blue-700 border-blue-200" },
    replied: { label: "Répondu",  cls: "bg-green-100 text-green-700 border-green-200" },
    closed:  { label: "Fermé",    cls: "bg-gray-100 text-gray-600 border-gray-200" },
    approved:{ label: "Approuvé", cls: "bg-green-100 text-green-700 border-green-200" },
    rejected:{ label: "Refusé",   cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function InboxPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  if (!isAdmin) { navigate("/dashboard"); return null; }

  const { data: contacts = [], refetch: refetchContacts }       = trpc.contact.listAll.useQuery();
  const { data: memberships = [], refetch: refetchMemberships } = trpc.membership.listAll.useQuery();

  const updateContact    = trpc.contact.update.useMutation({ onSuccess: () => refetchContacts() });
  const updateMembership = trpc.membership.update.useMutation({ onSuccess: () => refetchMemberships() });

  const unreadContacts    = contacts.filter((c: any) => c.status === "new").length;
  const unreadMemberships = memberships.filter((m: any) => m.status === "pending").length;
  const totalUnread       = unreadContacts + unreadMemberships;

  const replyByEmail = (email: string, subject: string) =>
    window.open(`mailto:${email}?subject=RE: ${encodeURIComponent(subject)}`, "_blank");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-900 p-3 rounded-xl">
              <Mail className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-blue-900">Boîte de réception</h1>
              <p className="text-gray-500 text-sm">Messages de contact et demandes d&apos;adhésion</p>
            </div>
            {totalUnread > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                {totalUnread}
              </span>
            )}
          </div>
          <Button variant="outline" size="sm"
            onClick={() => { refetchContacts(); refetchMemberships(); }}
            className="border-blue-200 text-blue-900">
            <RefreshCw className="w-4 h-4 mr-1" /> Actualiser
          </Button>
        </div>

        <Tabs defaultValue="contacts">
          <TabsList className="bg-blue-50 border border-blue-100">
            <TabsTrigger value="contacts"
              className="data-[state=active]:bg-blue-900 data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-1.5" /> Contacts
              {unreadContacts > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {unreadContacts}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="memberships"
              className="data-[state=active]:bg-blue-900 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-1.5" /> Adhésions
              {unreadMemberships > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {unreadMemberships}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* CONTACTS */}
          <TabsContent value="contacts" className="mt-4 space-y-3">
            {contacts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Aucun message de contact</p>
              </div>
            ) : contacts.map((c: any) => (
              <Card key={c.id}
                className={`border transition-all ${c.status === "new" ? "border-red-200 bg-red-50/30 shadow-sm" : "border-gray-200"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <StatusBadge status={c.status} />
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{formatDate(c.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold text-blue-900 text-sm">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-600">{c.email}</span>
                      </div>
                      {c.phone && (
                        <div className="flex items-center gap-2 mb-1">
                          <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-600">{c.phone}</span>
                        </div>
                      )}
                      <div className="mt-2 p-3 bg-white rounded-lg border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 mb-1">{c.subject}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{c.message}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {c.status === "new" && (
                        <Button size="sm" variant="outline"
                          onClick={() => updateContact.mutate({ id: c.id, status: "read" })}
                          className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                          <CheckCheck className="w-3.5 h-3.5 mr-1" /> Lu
                        </Button>
                      )}
                      <Button size="sm"
                        onClick={() => { replyByEmail(c.email, c.subject); updateContact.mutate({ id: c.id, status: "replied" }); }}
                        className="text-xs bg-amber-500 hover:bg-amber-600 text-blue-900 font-semibold">
                        <Reply className="w-3.5 h-3.5 mr-1" /> Répondre
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ADHÉSIONS */}
          <TabsContent value="memberships" className="mt-4 space-y-3">
            {memberships.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Aucune demande d&apos;adhésion</p>
              </div>
            ) : memberships.map((m: any) => (
              <Card key={m.id}
                className={`border transition-all ${m.status === "pending" ? "border-red-200 bg-red-50/30 shadow-sm" : "border-gray-200"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <StatusBadge status={m.status} />
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{formatDate(m.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold text-blue-900 text-sm">{m.businessName}</span>
                        <span className="text-xs text-gray-400">— {m.businessCategory}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-600">{m.contactName}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-600">{m.email}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-600">{m.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-600">{m.address}</span>
                      </div>
                      {m.vatNumber && <p className="text-xs text-gray-400 mt-1">TVA : {m.vatNumber}</p>}
                      {m.sector    && <p className="text-xs text-gray-400">Secteur : {m.sector}</p>}
                      {m.message   && (
                        <div className="mt-2 p-3 bg-white rounded-lg border border-gray-100">
                          <p className="text-sm text-gray-700 leading-relaxed">{m.message}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {m.status === "pending" && (
                        <Button size="sm" variant="outline"
                          onClick={() => updateMembership.mutate({ id: m.id, status: "approved" })}
                          className="text-xs border-green-200 text-green-700 hover:bg-green-50">
                          <CheckCheck className="w-3.5 h-3.5 mr-1" /> Valider
                        </Button>
                      )}
                      <Button size="sm"
                        onClick={() => replyByEmail(m.email, `Votre demande d'adhésion — ${m.businessName}`)}
                        className="text-xs bg-amber-500 hover:bg-amber-600 text-blue-900 font-semibold">
                        <Reply className="w-3.5 h-3.5 mr-1" /> Répondre
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
