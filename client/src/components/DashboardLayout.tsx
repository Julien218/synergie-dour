import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, UserCheck,
  LogOut, 
  PanelLeft, 
  Users, 
  Store, 
  FileText, 
  Calendar, 
  ClipboardList,
  Image,
  Building2,
  Share2, FileEdit, Zap, Rocket,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const { loading, user } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-white rounded-xl shadow-xl">
          <img src="/logo.png" alt="Synergie Dour" className="h-24 w-24 object-contain" />
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold text-blue-900 text-center">
              Accès Réservé
            </h1>
            <p className="text-sm text-gray-600 text-center">
              Veuillez vous connecter pour accéder à votre espace Synergie Dour.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full bg-amber-500 hover:bg-amber-600 text-blue-900 font-bold shadow-md"
          >
            Se Connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const adminMenuItems = [
    { icon: LayoutDashboard, label: "Tableau de Bord", path: "/dashboard" },
    { icon: Store, label: "Commerçants", path: "/dashboard/merchants" },
    { icon: ClipboardList, label: "Demandes", path: "/dashboard/requests" },
    { icon: UserCheck, label: "Adhésions", path: "/dashboard/membership-requests" },
    { icon: FileText, label: "Actualités", path: "/dashboard/news" },
    { icon: Calendar, label: "Événements", path: "/dashboard/events" },
    { icon: Building2, label: "Locaux à Louer", path: "/dashboard/locaux" },
    { icon: Share2, label: "Réseaux Sociaux", path: "/dashboard/social" },
    { icon: FileEdit, label: "Posts à publier", path: "/dashboard/posts" },
    { icon: Rocket, label: "Synergie AutoPublish", path: "/dashboard/autopublish" },
    { icon: Users, label: "Membres CA", path: "/dashboard/members" },
  { icon: Zap, label: "LeadFinder Pro", path: "/dashboard/leadfinder" },
  { icon: Users, label: "Liste Clients", path: "/dashboard/clients" },
  ];

  const merchantMenuItems = [
    { icon: LayoutDashboard, label: "Mon Profil", path: "/dashboard" },
    { icon: Image, label: "Ma Galerie", path: "/dashboard/gallery" },
  ];

  const menuItems = isAdmin ? adminMenuItems : merchantMenuItems;
  const activeMenuItem = menuItems.find(item => location === item.path);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-amber-100 bg-white">
          <SidebarHeader className="h-20 justify-center border-b border-amber-50">
            <div className="flex items-center gap-3 px-2 w-full">
              <button onClick={toggleSidebar} className="h-8 w-8 flex items-center justify-center hover:bg-amber-50 rounded-lg shrink-0">
                <PanelLeft className="h-5 w-5 text-blue-900" />
              </button>
              {!isCollapsed && (
                <span className="font-bold text-blue-900 truncate">Espace {isAdmin ? 'Admin' : 'Pro'}</span>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="py-4">
            <SidebarMenu className="px-3 gap-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-11 transition-all ${isActive ? "bg-amber-100 text-blue-900" : "text-gray-600 hover:bg-amber-50"}`}
                    >
                      <item.icon className={`h-5 w-5 ${isActive ? "text-amber-600" : ""}`} />
                      <span className="font-medium">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-amber-50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg p-1 hover:bg-amber-50 transition-all w-full text-left">
                  <Avatar className="h-10 w-10 border-2 border-amber-200 shrink-0">
                    <AvatarFallback className="bg-blue-900 text-white font-bold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-blue-900 truncate">{user?.name}</p>
                      <p className="text-xs text-amber-600 truncate">{user?.role}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2">
                <DropdownMenuItem onClick={() => setLocation("/")} className="cursor-pointer">
                  Retour au site
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-700">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
      </div>

      <SidebarInset className="bg-slate-50">
        {isMobile && (
          <div className="flex border-b bg-white h-16 items-center px-4 sticky top-0 z-40">
            <SidebarTrigger className="h-10 w-10 text-blue-900" />
            <span className="ml-4 font-bold text-blue-900">{activeMenuItem?.label ?? "Synergie Dour"}</span>
          </div>
        )}
        <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
