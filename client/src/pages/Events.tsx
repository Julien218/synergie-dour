import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Calendar, MapPin, Clock, ArrowLeft, ArrowRight } from "lucide-react";

export default function Events() {
  const [, setLocation] = useLocation();
  const { data: events = [], isLoading } = trpc.events.list.useQuery();

  const isEventUpcoming = (startDate: Date) => {
    return new Date(startDate) > new Date();
  };

  return (
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
          <h1 className="text-4xl font-bold mb-2 text-amber-300">Evénements</h1>
          <p className="text-amber-100">Découvrez les événements organisés par Synergie Dour</p>
        </div>
      </div>

      {/* Events List */}
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement des événements...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Aucun événement pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {events.map((event) => {
                const upcoming = isEventUpcoming(event.startDate);
                const eventDate = new Date(event.startDate);

                return (
                  <div key={event.id} onClick={() => setLocation(`/events/${event.id}`)} className="cursor-pointer">
                    <Card className="hover:shadow-lg transition-shadow border-amber-100 overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                        {event.image && (
                          <div className="h-48 md:h-auto bg-gradient-to-br from-amber-200 to-blue-200 overflow-hidden">
                            <img
                              src={event.image}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className={`col-span-1 ${event.image ? "md:col-span-2" : "md:col-span-3"}`}>
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <CardTitle className="text-blue-900 line-clamp-2">{event.title}</CardTitle>
                                {upcoming && (
                                  <Badge className="bg-green-500 text-white mt-2">À venir</Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-gray-600 line-clamp-2">{event.description}</p>

                            <div className="space-y-2 text-sm text-gray-500 border-t border-gray-100 pt-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-amber-600" />
                                <span>
                                  {eventDate.toLocaleDateString("fr-FR", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                              {event.startDate && (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-amber-600" />
                                  <span>
                                    {eventDate.toLocaleTimeString("fr-FR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              )}
                              {event.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-amber-600" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                            </div>

                            <Button
                              variant="outline"
                              className="border-amber-500 text-amber-600 hover:bg-amber-50 w-full"
                            >
                              Voir les détails
                              <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                          </CardContent>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
