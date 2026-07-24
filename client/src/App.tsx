import { Switch, Route, Redirect } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, useAuthState } from "@/hooks/useAuth";
import { getIdToken } from "@/lib/firebase";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Home from "@/pages/home";
import DataImportPage from "@/pages/data-import";
import DataImportSuitePage from "@/pages/data-import-suite";
import SharedDashboard from "@/pages/shared-dashboard";
import BusinessSetup from "@/pages/business-setup";
import BusinessSettingsPage from "@/pages/business-settings";
import BusinessHome from "@/pages/business-home";
import BusinessJoin from "@/pages/business-join";
import BusinessTeam from "@/pages/business-team";
import EmployeeEod from "@/pages/employee-eod";
import OperationsDashboard from "@/pages/operations-dashboard";
import AiStrategy from "@/pages/ai-strategy";
import AiSuiteHub from "@/pages/ai-suite";
import BusinessReports from "@/pages/business-reports";
import SharedBusinessReport from "@/pages/shared-business-report";
import DynamicHealthAudit from "@/components/DynamicHealthAudit";
import BusinessOnboarding from "@/pages/business-onboarding";
import RunnerFieldTrackingPage from "@/pages/runner-field-tracking";
import AdminFieldTrackingPage from "@/pages/admin-field-tracking";
import BusinessTasksPage from "@/pages/business-tasks";
import TrackingTemplatesPage from "@/pages/tracking-templates";
import EmployeeDailyTrackingPage from "@/pages/employee-daily-tracking";
import BusinessCustomersPage from "@/pages/business-customers";
import BusinessGoalsPage from "@/pages/business-goals";
import BusinessAlertsPage from "@/pages/business-alerts";
import OAuthSimulator from "@/pages/oauth-simulator";
import SheetViewPage from "@/pages/sheet-view";
import TermsOfService from "@/pages/terms";
import PrivacyPolicy from "@/pages/privacy";
import SupportPage from "@/pages/support";
import AddonSidebarPage from "@/pages/addon-sidebar";

// Fetches the business profile returning null for 404 (no profile yet),
// but re-throws on 5xx or network errors so backend issues aren't silently hidden.
async function fetchBusinessProfileOrNull(): Promise<{ id: string; name: string; memberRole?: string } | null> {
  try {
    const res = await apiRequest("GET", "/api/business/profile");
    return await res.json();
  } catch (err: any) {
    if (err.message?.startsWith("404")) {
      return null;
    }
    console.error("Error fetching business profile:", err);
    return null;
  }
}

// Smart default route: authenticated users with a Business Suite profile go to /business;
// pure analytics users stay on the Analytics home.
function DefaultHome({ isAuthenticated, isLoading }: { isAuthenticated: boolean; isLoading: boolean }) {
  const { data: bizProfile, isLoading: bizLoading } = useQuery<{ id: string } | null>({
    queryKey: ["/api/business/profile"],
    enabled: isAuthenticated,
    retry: false,
    queryFn: fetchBusinessProfileOrNull,
  });

  // While auth is still resolving, show nothing (prevents flash redirect to /login)
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (bizLoading) return null;
  if (bizProfile?.id) return <Redirect to="/business" />;
  return <Home />;
}

function Router() {
  const auth = useAuthState();

  return (
    <AuthContext.Provider value={auth}>
      <Switch>
        <Route path="/shared/:token">
          {(params) => <SharedDashboard shareToken={params.token} />}
        </Route>

        <Route path="/login">
          {auth.isLoading ? null : auth.isAuthenticated ? <DefaultHome isAuthenticated={auth.isAuthenticated} isLoading={auth.isLoading} /> : <Login />}
        </Route>

        <Route path="/get-started">
          <BusinessOnboarding />
        </Route>

        <Route path="/business/setup">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessSetup /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/settings">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessSettingsPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/join">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessJoin /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/team">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessTeam /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/eod">
          {auth.isLoading ? null : auth.isAuthenticated ? <EmployeeEod /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/operations">
          {auth.isLoading ? null : auth.isAuthenticated ? <OperationsDashboard /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/ai-strategy">
          {auth.isLoading ? null : auth.isAuthenticated ? <AiStrategy /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/ai-suite/:page">
          {auth.isLoading ? null : auth.isAuthenticated ? <AiSuiteHub /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/ai-suite">
          {auth.isLoading ? null : auth.isAuthenticated ? <Redirect to="/business/ai-suite/next-best-action" /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/reports/shared/:token">
          <SharedBusinessReport />
        </Route>

        <Route path="/business/reports">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessReports /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/health-audit">
          {auth.isLoading ? null : auth.isAuthenticated ? <DynamicHealthAudit /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/field-tracking/runner">
          {auth.isLoading ? null : auth.isAuthenticated ? <RunnerFieldTrackingPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/field-tracking/admin">
          {auth.isLoading ? null : auth.isAuthenticated ? <AdminFieldTrackingPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/field-tracking">
          {auth.isLoading ? null : auth.isAuthenticated ? <AdminFieldTrackingPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/tracking/templates">
          {auth.isLoading ? null : auth.isAuthenticated ? <TrackingTemplatesPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/daily-tracking">
          {auth.isLoading ? null : auth.isAuthenticated ? <EmployeeDailyTrackingPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/tasks">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessTasksPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/customers">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessCustomersPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/goals">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessGoalsPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/alerts">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessAlertsPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/verticals">
          {auth.isLoading ? null : auth.isAuthenticated ? <Redirect to="/business" /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessHome /> : <Redirect to="/login" />}
        </Route>

        {/* /home always shows Analytics (no business suite redirect) */}
        <Route path="/home">
          <Home />
        </Route>

        {/* Dedicated Sheet View page */}
        <Route path="/sheet/:id">
          {auth.isLoading ? null : auth.isAuthenticated ? <SheetViewPage /> : <Redirect to="/login" />}
        </Route>

        {/* Dedicated Data Import page */}
        <Route path="/data-import">
          {auth.isLoading ? null : auth.isAuthenticated ? <DataImportPage /> : <Redirect to="/login" />}
        </Route>

        {/* Sandbox OAuth Simulator */}
        <Route path="/oauth/simulate/:provider" component={OAuthSimulator} />

        {/* Business-style dedicated Data Import Suite page */}
        <Route path="/data-import-suite">
          {auth.isLoading ? null : auth.isAuthenticated ? <DataImportSuitePage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/terms" component={TermsOfService} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/support" component={SupportPage} />
        <Route path="/addon-sidebar" component={AddonSidebarPage} />

        {/* Root route: always show the Landing marketing page */}
        <Route path="/">
          <Landing />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
