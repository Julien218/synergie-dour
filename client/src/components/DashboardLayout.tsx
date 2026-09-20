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
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Building2,
  Calendar,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileEdit,
  FileText,
  Image,
  Inbox,
  LayoutDashboard,
  LogOut,
  Megaphone,
  PanelLeft,
  Rocket,
  Share2,
  Store,
  UserCheck,
  Users,
  Vote,
  Wrench,
  Zap,
} from "lucide-react";
import { CSSProperties, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

type MenuItem = {
  icon: any;
  label: string;
  path: string;
};

type MenuGroup = {
  key: string;
  label: string;
  icon: any;
  items: MenuItem[];
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const { loading, user } = useAuth();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-white rounded-xl shadow-xl">
          <img src="/logo.png" alt="Synergie Dour" className="h-24 w-24 object-contain" />
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold text-blue-900 text-center">Accès Réservé</h1>
            <p className="text-sm text-gray-600 text-center">Veuillez vous connecter pour accéder à votre espace Synergie Dour.</p>
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
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth: _setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const { data: boardAccess } = trpc.board.myAccess.useQuery(undefined, { enabled: !isAdmin });
  const hasBoardAccess = !!boardAccess?.isBoardMember && !!(boardAccess?.canCalendar || boardAccess?.canVotes || boardAccess?.canMinutes);

  const dashboardItem: MenuItem = { icon: LayoutDashboard, label: "Tableau de bord", path: "/dashboard" };
  const billingItem: MenuItem = { icon: CreditCard, label: "Facturation", path: "/dashboard/facturation" };

  const adminGroups: MenuGroup[] = [
    {
      key: "crm",
      label: "CRM & Membres",
      icon: Users,
      items: [
        { icon: Store, label: "Commerçants", path: "/dashboard/merchants" },
        { icon: Users, label: "Liste clients", path: "/dashboard/clients" },
        { icon: Inbox, label: "Boîte de réception", path: "/dashboard/inbox" },
        { icon: ClipboardList, label: "Demandes", path: "/dashboard/requests" },
        { icon: UserCheck, label: "Adhésions", path: "/dashboard/membership-requests" },
        { icon: Vote, label: "Conseil & Votes", path: "/dashboard/board" },
      ],
    },
    {
      key: "communication",
      label: "Communication",
      icon: Megaphone,
      items: [
        { icon: FileText, label: "Actualités", path: "/dashboard/news" },
        { icon: Calendar, label: "Événements", path: "/dashboard/events" },
        { icon: Share2, label: "Réseaux sociaux", path: "/dashboard/social" },
        { icon: FileEdit, label: "Posts à publier", path: "/dashboard/posts" },
        { icon: Rocket, label: "AutoPublish", path: "/dashboard/autopublish" },
      ],
    },
    {
      key: "tools",
      label: "Outils",
      icon: Wrench,
      items: [
        { icon: Building2, label: "Locaux à louer", path: "/dashboard/locaux" },
        { icon: Zap, label: "LeadFinder Pro", path: "/dashboard/leadfinder" },
      ],
    },
  ];

  const merchantMenuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "Mon profil", path: "/dashboard" },
    { icon: Image, label: "Ma galerie", path: "/dashboard/gallery" },
    ...(hasBoardAccess ? [{ icon: Vote, label: "Conseil & Votes", path: "/dashboard/board" }] : []),
  ];

  const allAdminItems = useMemo(
    () => [dashboardItem, billingItem, ...adminGroups.flatMap((group) => group.items)],
    [],
  );
  const activeMenuItem = (isAdmin ? allAdminItems : merchantMenuItems).find((item) => location === item.path);

  const initialOpen = useMemo(() => {
    const match = adminGroups.find((group) => group.items.some((item) => item.path === location));
    return match?.key || "";
  }, []);
  const [openGroup, setOpenGroup] = useState(initialOpen);

  const navigate = (path: string) => setLocation(path);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-amber-100 bg-white">
          <SidebarHeader className="h-20 justify-center border-b border-amber-50">
            <div className="flex items-center gap-3 px-2 w-full">
              <button onClick={toggleSidebar} className="h-8 w-8 flex items-center justify-center hover:bg-amber-50 rounded-lg shrink-0">
                <PanelLeft className="h-5 w-5 text-blue-900" />
              </button>
              {!isCollapsed && <span className="font-bold text-blue-900 truncate">Espace {isAdmin ? "Admin" : "Pro"}</span>}
            </div>
          </SidebarHeader>

          <SidebarContent className="py-4">
            {isAdmin ? (
              <SidebarMenu className="px-3 gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location === dashboardItem.path}
                    onClick={() => navigate(dashboardItem.path)}
                    tooltip={dashboardItem.label}
                    className={`h-11 transition-all ${location === dashboardItem.path ? "bg-amber-100 text-blue-900" : "text-gray-600 hover:bg-amber-50"}`}
                  >
                    <LayoutDashboard className={`h-5 w-5 ${location === dashboardItem.path ? "text-amber-600" : ""}`} />
                    <span className="font-medium">{dashboardItem.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {adminGroups.map((group) => {
                  const GroupIcon = group.icon;
                  const containsActive = group.items.some((item) => item.path === location);
                  const isOpen = openGroup === group.key;
                  return (
                    <div key={group.key} className="space-y-1">
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={containsActive}
                          onClick={() => setOpenGroup(isOpen ? "" : group.key)}
                          tooltip={group.label}
                          className={`h-11 transition-all ${containsActive ? "bg-blue-50 text-blue-900" : "text-gray-600 hover:bg-amber-50"}`}
                        >
                          <GroupIcon className={`h-5 w-5 ${containsActive ? "text-amber-600" : ""}`} />
                          <span className="font-medium flex-1">{group.label}</span>
                          {!isCollapsed && <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />}
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {isOpen && !isCollapsed && (
                        <div className="ml-5 pl-3 border-l border-amber-100 space-y-1">
                          {group.items.map((item) => {
                            const ItemIcon = item.icon;
                            const isActive = location === item.path;
                            return (
                              <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors ${isActive ? "bg-amber-100 text-blue-900 font-semibold" : "text-gray-600 hover:bg-amber-50"}`}
                              >
                                <ItemIcon className="w-4 h-4 shrink-0" />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                <SidebarMenuItem className="pt-1">
                  <SidebarMenuButton
                    isActive={location === billingItem.path}
                    onClick={() => navigate(billingItem.path)}
                    tooltip={billingItem.label}
                    className={`h-11 transition-all ${location === billingItem.path ? "bg-amber-100 text-blue-900" : "text-gray-600 hover:bg-amber-50"}`}
                  >
                    <CreditCard className={`h-5 w-5 ${location === billingItem.path ? "text-amber-600" : ""}`} />
                    <span className="font-medium">Facturation</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <SidebarMenu className="px-3 gap-1">
                {merchantMenuItems.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = location === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => navigate(item.path)}
                        tooltip={item.label}
                        className={`h-11 transition-all ${isActive ? "bg-amber-100 text-blue-900" : "text-gray-600 hover:bg-amber-50"}`}
                      >
                        <ItemIcon className={`h-5 w-5 ${isActive ? "text-amber-600" : ""}`} />
                        <span className="font-medium">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-amber-50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg p-1 hover:bg-amber-50 transition-all w-full text-left">
                  <Avatar className="h-10 w-10 border-2 border-amber-200 shrink-0">
                    <AvatarFallback className="bg-blue-900 text-white font-bold">{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
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
                <DropdownMenuItem onClick={() => setLocation("/")} className="cursor-pointer">Retour au site</DropdownMenuItem>
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
        <main className="p-6 md:p-10 max-w-7xl mx-auto w-full">{children}</main>
      </SidebarInset>
    </>
  );
}
