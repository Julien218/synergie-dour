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
import Dashboard from "@/pages/Dashboard";
import ManageNews from "@/pages/ManageNews";
import NewsDetail from "@/pages/NewsDetail";
import ManageEvents from "@/pages/ManageEvents";
import ManageMerchants from "@/pages/ManageMerchants";
import ManageRequests from "@/pages/ManageRequests";
import MembershipRequestsAdmin from "@/pages/MembershipRequestsAdmin";
import AgentDashboard from "@/pages/AgentDashboard";
import MemberDashboard from "@/pages/MemberDashboard";
import LeadFinderPage from "@/pages/LeadFinderPage";
import ListeClients from "@/pages/ListeClients";
import InboxPage from "@/pages/InboxPage";
import Resources from "@/pages/Resources";
import Resource from "@/pages/Resource";
import About from "@/pages/About";
import Knowledge from "@/pages/Knowledge";
import AiContext from "@/pages/AiContext";
import Legal from "@/pages/Legal";
import Privacy from "@/pages/Privacy";
import Login from "@/pages/Login";
import SoumettreLocal from "@/pages/SoumettreLocal";
import ManageLocaux from "@/pages/ManageLocaux";
import LocauxCommerciaux from "@/pages/LocauxCommerciaux";
import LocalDetail from "@/pages/LocalDetail";
import ManagePosts from "@/pages/ManagePosts";
import SocialMediaPage from "@/pages/SocialMediaPage";
import SuperAdminBrand from "@/pages/SuperAdminBrand";
import { PublicLayout } from "@/components/PublicLayout";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

import PostsPage from "@/pages/PostsPage";
import GalleryPage from "@/pages/GalleryPage";

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => (
          <PublicLayout>
            <Home />
          </PublicLayout>
        )}
      </Route>
      <Route path="/merchants">
        {() => (
          <PublicLayout>
            <Merchants />
          </PublicLayout>
        )}
      </Route>
      <Route path="/news/:id">
        {() => <NewsDetail />}
      </Route>
      <Route path="/news">
        {() => (
          <PublicLayout>
            <News />
          </PublicLayout>
        )}
      </Route>
      <Route path="/events">
        {() => (
          <PublicLayout>
            <Events />
          </PublicLayout>
        )}
      </Route>
      <Route path="/contact">
        {() => <Contact />}
      </Route>
      <Route path="/membership">
        {() => <Membership />}
      </Route>
      <Route path="/membership/success">
        {() => <MembershipSuccess />}
      </Route>
      <Route path="/membership/cancelled">
        {() => <MembershipCancelled />}
      </Route>
      <Route path="/resources/:slug">
        {() => <PublicLayout><Resource /></PublicLayout>}
      </Route>
      <Route path="/resources">
        {() => <PublicLayout><Resources /></PublicLayout>}
      </Route>
      <Route path="/about">
        {() => <PublicLayout><About /></PublicLayout>}
      </Route>
      <Route path="/legal">
        {() => <Legal />}
      </Route>
      <Route path="/privacy">
        {() => <Privacy />}
      </Route>

      {/* Login route */}
      <Route path="/login">
        {() => <Login />}
      </Route>

      {/* Routes Dashboard */}
      <Route path="/dashboard">
        {() => <Dashboard />}
      </Route>
      <Route path="/dashboard/inbox">
        {() => <InboxPage />}
      </Route>
      <Route path="/dashboard/news">
        {() => <ManageNews />}
      </Route>
      <Route path="/dashboard/events">
        {() => <ManageEvents />}
      </Route>
      <Route path="/dashboard/merchants">
        {() => <ManageMerchants />}
      </Route>
      <Route path="/dashboard/requests">
        {() => <ManageRequests />}
      </Route>
      <Route path="/dashboard/membership-requests">
        {() => <MembershipRequestsAdmin />}
      </Route>
      <Route path="/dashboard/agent">
        {() => <AgentDashboard />}
      </Route>
      <Route path="/dashboard/locaux">
        {() => <ManageLocaux />}
      </Route>
      <Route path="/dashboard/posts">
        {() => <ManagePosts />}
      </Route>
      <Route path="/dashboard/social">
        {() => <SocialMediaPage />}
      </Route>
      <Route path="/dashboard/super-admin">
        {() => <SuperAdminBrand />}
      </Route>
      <Route path="/dashboard/members">
        {() => <MemberDashboard />}
      </Route>
      <Route path="/dashboard/gallery">
        {() => <GalleryPage />}
      </Route>
      <Route path="/dashboard/leadfinder">
        {() => <LeadFinderPage />}
      </Route>
      <Route path="/dashboard/clients">
        {() => <ListeClients />}
      </Route>
      <Route path="/dashboard/liste-clients">
        {() => <ListeClients />}
      </Route>

      {/* Page formulaire local commercial */}
      <Route path="/locaux/:id">
        {(params) => <LocalDetail />}
      </Route>
      <Route path="/locaux">
        <LocauxCommerciaux />
      </Route>
      <Route path="/louer-mon-local">
        {() => <SoumettreLocal />}
      </Route>

      <Route path="/api/oauth/callback">
        {() => (
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        )}
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
