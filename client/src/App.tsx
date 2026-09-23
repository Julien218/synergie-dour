import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Merchants from "@/pages/Merchants";
import News from "@/pages/News";
import Events from "@/pages/Events";
import Contact from "@/pages/Contact";
import Membership from "@/pages/Membership";
import MembershipSuccess from "@/pages/MembershipSuccess";
import MembershipCancelled from "@/pages/MembershipCancelled";
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ManageNews = lazy(() => import("@/pages/ManageNews"));
import NewsDetail from "@/pages/NewsDetail";
const ManageEvents = lazy(() => import("@/pages/ManageEvents"));
const ManageMerchants = lazy(() => import("@/pages/ManageMerchants"));
const ManageRequests = lazy(() => import("@/pages/ManageRequests"));
const MembershipRequestsAdmin = lazy(() => import("@/pages/MembershipRequestsAdmin"));
const AgentModuleComingSoon = lazy(() => import("@/pages/AgentModuleComingSoon"));
const MemberDashboard = lazy(() => import("@/pages/MemberDashboard"));
const LeadFinderPage = lazy(() => import("@/pages/LeadFinderPage"));
const ListeClients = lazy(() => import("@/pages/ListeClients"));
const InboxPage = lazy(() => import("@/pages/InboxPage"));
import Resources from "@/pages/Resources";
import Resource from "@/pages/Resource";
import About from "@/pages/About";
import Legal from "@/pages/Legal";
import Privacy from "@/pages/Privacy";
import Login from "@/pages/Login";
import SoumettreLocal from "@/pages/SoumettreLocal";
const ManageLocaux = lazy(() => import("@/pages/ManageLocaux"));
import LocauxCommerciaux from "@/pages/LocauxCommerciaux";
import LocalDetail from "@/pages/LocalDetail";
const ManagePosts = lazy(() => import("@/pages/ManagePosts"));
const SocialMediaPage = lazy(() => import("@/pages/SocialMediaPage"));
const AutopublishPage = lazy(() => import("@/pages/AutopublishPage"));
const SuperAdminBrand = lazy(() => import("@/pages/SuperAdminBrand"));
const InvoicesPage = lazy(() => import("@/pages/InvoicesPage"));
import { PublicLayout } from "@/components/PublicLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
const GalleryPage = lazy(() => import("@/pages/GalleryPage"));
const BoardVotesPage = lazy(() => import("@/pages/BoardVotesPage"));

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <PublicLayout><Home /></PublicLayout>}</Route>
      <Route path="/merchants">{() => <PublicLayout><Merchants /></PublicLayout>}</Route>
      <Route path="/news/:id">{() => <NewsDetail />}</Route>
      <Route path="/news">{() => <PublicLayout><News /></PublicLayout>}</Route>
      <Route path="/events">{() => <PublicLayout><Events /></PublicLayout>}</Route>
      <Route path="/contact">{() => <Contact />}</Route>
      <Route path="/membership">{() => <Membership />}</Route>
      <Route path="/membership/success">{() => <MembershipSuccess />}</Route>
      <Route path="/membership/cancelled">{() => <MembershipCancelled />}</Route>
      <Route path="/resources/:slug">{() => <PublicLayout><Resource /></PublicLayout>}</Route>
      <Route path="/resources">{() => <PublicLayout><Resources /></PublicLayout>}</Route>
      <Route path="/about">{() => <PublicLayout><About /></PublicLayout>}</Route>
      <Route path="/legal">{() => <Legal />}</Route>
      <Route path="/privacy">{() => <Privacy />}</Route>
      <Route path="/login">{() => <Login />}</Route>

      <Route path="/dashboard">{() => <ProtectedRoute><Dashboard /></ProtectedRoute>}</Route>
      <Route path="/dashboard/facturation">{() => <ProtectedRoute requireAdmin><InvoicesPage /></ProtectedRoute>}</Route>
      <Route path="/dashboard/board">{() => <ProtectedRoute><BoardVotesPage /></ProtectedRoute>}</Route>
      <Route path="/dashboard/inbox">{() => <ProtectedRoute requireAdmin><InboxPage /></ProtectedRoute>}</Route>
      <Route path="/dashboard/news">{() => <ProtectedRoute requireAdmin><ManageNews /></ProtectedRoute>}</Route>
      <Route path="/dashboard/events">{() => <ProtectedRoute requireAdmin><ManageEvents /></ProtectedRoute>}</Route>
      <Route path="/dashboard/merchants">{() => <ProtectedRoute requireAdmin><ManageMerchants /></ProtectedRoute>}</Route>
      <Route path="/dashboard/requests">{() => <ProtectedRoute requireAdmin><ManageRequests /></ProtectedRoute>}</Route>
      <Route path="/dashboard/membership-requests">{() => <ProtectedRoute requireAdmin><MembershipRequestsAdmin /></ProtectedRoute>}</Route>
      <Route path="/dashboard/agent">{() => <ProtectedRoute requireAdmin><AgentModuleComingSoon /></ProtectedRoute>}</Route>
      <Route path="/dashboard/locaux">{() => <ProtectedRoute requireAdmin><ManageLocaux /></ProtectedRoute>}</Route>
      <Route path="/dashboard/posts">{() => <ProtectedRoute requireAdmin><ManagePosts /></ProtectedRoute>}</Route>
      <Route path="/dashboard/social">{() => <ProtectedRoute requireAdmin><SocialMediaPage /></ProtectedRoute>}</Route>
      <Route path="/dashboard/autopublish">{() => <ProtectedRoute requireAdmin><AutopublishPage /></ProtectedRoute>}</Route>
      <Route path="/dashboard/super-admin">{() => <ProtectedRoute requireSuperAdmin><SuperAdminBrand /></ProtectedRoute>}</Route>
      <Route path="/dashboard/members">{() => <ProtectedRoute><MemberDashboard /></ProtectedRoute>}</Route>
      <Route path="/dashboard/gallery">{() => <ProtectedRoute requireAdmin><GalleryPage /></ProtectedRoute>}</Route>
      <Route path="/dashboard/leadfinder">{() => <ProtectedRoute requireAdmin><LeadFinderPage /></ProtectedRoute>}</Route>
      <Route path="/dashboard/clients">{() => <ProtectedRoute requireAdmin><ListeClients /></ProtectedRoute>}</Route>
      <Route path="/dashboard/liste-clients">{() => <ProtectedRoute requireAdmin><ListeClients /></ProtectedRoute>}</Route>

      <Route path="/locaux/:id">{() => <LocalDetail />}</Route>
      <Route path="/locaux"><LocauxCommerciaux /></Route>
      <Route path="/louer-mon-local">{() => <SoumettreLocal />}</Route>
      <Route path="/api/oauth/callback">{() => <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>}</Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function RouteLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" aria-live="polite">
      <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-amber-500" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<RouteLoader />}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
