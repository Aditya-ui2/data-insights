import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
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
import BusinessReports from "@/pages/business-reports";
import SharedBusinessReport from "@/pages/shared-business-report";
import DynamicHealthAudit from "@/components/DynamicHealthAudit";
import BusinessOnboarding from "@/pages/business-onboarding";
import RunnerFieldTrackingPage from "@/pages/runner-field-tracking";
import AdminFieldTrackingPage from "@/pages/admin-field-tracking";
import BusinessTasksPage from "@/pages/business-tasks";
import TrackingTemplatesPage from "@/pages/tracking-templates";
import EmployeeDailyTrackingPage from "@/pages/employee-daily-tracking";

// Fetches the business profile returning null for 404 (no profile yet),
// but re-throws on 5xx or network errors so backend issues aren't silently hidden.
async function fetchBusinessProfileOrNull(): Promise<{ id: string } | null> {
  const token = await getIdToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch("/api/business/profile", { credentials: "include", headers });
  if (res.status === 404) return null;
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Unexpected error fetching business profile: ${res.status}`);
  return res.json();
}

// Smart default route: authenticated users with a Business Suite profile go to /business;
// pure analytics users stay on the Analytics home.
// Accessing /home always shows Analytics regardless of Business Suite.
function DefaultHome({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { data: bizProfile, isLoading } = useQuery<{ id: string } | null>({
    queryKey: ["/api/business/profile"],
    enabled: isAuthenticated,
    retry: false,
    queryFn: fetchBusinessProfileOrNull,
  });

  if (!isAuthenticated) return <Landing />;
  if (isLoading) return null;
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
          {auth.isAuthenticated ? <Redirect to="/" /> : <Login />}
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

        <Route path="/business/verticals">
          {auth.isLoading ? null : auth.isAuthenticated ? <Redirect to="/business" /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessHome /> : <Redirect to="/login" />}
        </Route>

        {/* /home always shows Analytics (no business suite redirect) */}
        <Route path="/home">
          {auth.isLoading ? null : auth.isAuthenticated ? <Home /> : <Redirect to="/login" />}
        </Route>

        {/* Dedicated Data Import page */}
        <Route path="/data-import">
          {auth.isLoading ? null : auth.isAuthenticated ? <DataImportPage /> : <Redirect to="/login" />}
        </Route>

        {/* Business-style dedicated Data Import Suite page */}
        <Route path="/data-import-suite">
          {auth.isLoading ? null : auth.isAuthenticated ? <DataImportSuitePage /> : <Redirect to="/login" />}
        </Route>

        {/* Default route: redirect business-linked users to /business */}
        <Route path="/">
          {auth.isLoading ? <Landing /> : <DefaultHome isAuthenticated={auth.isAuthenticated} />}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
