import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PublicLayout } from "@/components/PublicLayout";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Eagerly loaded pages
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";

// Lazy loaded public pages
const Merchants = lazy(() => import("@/pages/Merchants"));
const News = lazy(() => import("@/pages/News"));
const Events = lazy(() => import("@/pages/Events"));
const Contact = lazy(() => import("@/pages/Contact"));
const Membership = lazy(() => import("@/pages/Membership"));
const MembershipSuccess = lazy(() => import("@/pages/MembershipSuccess"));
const MembershipCancelled = lazy(() => import("@/pages/MembershipCancelled"));
const Resources = lazy(() => import("@/pages/Resources"));
const Resource = lazy(() => import("@/pages/Resource"));
const About = lazy(() => import("@/pages/About"));
const Legal = lazy(() => import("@/pages/Legal"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Login = lazy(() => import("@/pages/Login"));
const NewsDetail = lazy(() => import("@/pages/NewsDetail"));
const SoumettreLocal = lazy(() => import("@/pages/SoumettreLocal"));
const LocauxCommerciaux = lazy(() => import("@/pages/LocauxCommerciaux"));
const LocalDetail = lazy(() => import("@/pages/LocalDetail"));

// Lazy loaded dashboard routes
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const InboxPage = lazy(() => import("@/pages/InboxPage"));
const ManageNews = lazy(() => import("@/pages/ManageNews"));
const ManageEvents = lazy(() => import("@/pages/ManageEvents"));
const ManageMerchants = lazy(() => import("@/pages/ManageMerchants"));
const ManageRequests = lazy(() => import("@/pages/ManageRequests"));
const MembershipRequestsAdmin = lazy(() => import("@/pages/MembershipRequestsAdmin"));
const AgentModuleComingSoon = lazy(() => import("@/pages/AgentModuleComingSoon"));
const ManageLocaux = lazy(() => import("@/pages/ManageLocaux"));
const ManagePosts = lazy(() => import("@/pages/ManagePosts"));
const SocialMediaPage = lazy(() => import("@/pages/SocialMediaPage"));
const AutopublishPage = lazy(() => import("@/pages/AutopublishPage"));
const SuperAdminBrand = lazy(() => import("@/pages/SuperAdminBrand"));
const MemberDashboard = lazy(() => import("@/pages/MemberDashboard"));
const LeadFinderPage = lazy(() => import("@/pages/LeadFinderPage"));
const ListeClients = lazy(() => import("@/pages/ListeClients"));

// Lazy loaded gallery and AI/Agent routes
const GalleryPage = lazy(() => import("@/pages/GalleryPage"));
const Knowledge = lazy(() => import("@/pages/Knowledge"));
const AiContext = lazy(() => import("@/pages/AiContext"));
// Lazy loaded billing routes
const BillingDashboard = lazy(() => import("@/pages/billing/BillingDashboard"));
const BillingClients = lazy(() => import("@/pages/billing/BillingClients"));
const BillingCatalogue = lazy(() => import("@/pages/billing/BillingCatalogue"));
const BillingQuotes = lazy(() => import("@/pages/billing/BillingQuotes"));
const BillingInvoices = lazy(() => import("@/pages/billing/BillingInvoices"));
const BillingSettings = lazy(() => import("@/pages/billing/BillingSettings"));
const DocumentPortal = lazy(() => import("@/pages/billing/DocumentPortal"));
const PostsPage = lazy(() => import("@/pages/PostsPage"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
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
          {() => <AgentModuleComingSoon />}
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
        <Route path="/dashboard/autopublish">
          {() => <AutopublishPage />}
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

        {/* Billing routes */}
        <Route path="/dashboard/billing">
          {() => <BillingDashboard />}
        </Route>
        <Route path="/dashboard/billing/clients">
          {() => <BillingClients />}
        </Route>
        <Route path="/dashboard/billing/catalogue">
          {() => <BillingCatalogue />}
        </Route>
        <Route path="/dashboard/billing/quotes">
          {() => <BillingQuotes />}
        </Route>
        <Route path="/dashboard/billing/invoices">
          {() => <BillingInvoices />}
        </Route>
        <Route path="/dashboard/billing/settings">
          {() => <BillingSettings />}
        </Route>
        <Route path="/documents/:token">
          {(params) => <DocumentPortal token={params.token} />}
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
    </Suspense>
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
