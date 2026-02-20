import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Merchants from "@/pages/Merchants";
import News from "@/pages/News";
import Events from "@/pages/Events";
import Contact from "@/pages/Contact";
import Membership from "@/pages/Membership";
import Dashboard from "@/pages/Dashboard";
import { PublicLayout } from "@/components/PublicLayout";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

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
      <Route path="/dashboard">
        {() => <Dashboard />}
      </Route>
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
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
