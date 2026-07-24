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
import ShopifyAuthPage from "@/pages/shopify-auth";
import OAuthSuccessPage from "@/pages/oauth-success";

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

function DefaultHome({ isAuthenticated, isLoading }: { isAuthenticated: boolean; isLoading: boolean }) {
  const { data: businessProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["/api/business/profile"],
    queryFn: fetchBusinessProfileOrNull,
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || (isAuthenticated && isProfileLoading)) {
    return null;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  if (businessProfile) {
    return <Redirect to="/business" />;
  }

  return <Home />;
}

function Router() {
  const auth = useAuthState();

  return (
    <AuthContext.Provider value={auth}>
      <Switch>
        <Route path="/login" component={Login} />

        <Route path="/home">
          {auth.isLoading ? null : auth.isAuthenticated ? <Home /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business-setup">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessSetup /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessHome /> : <Redirect to="/login" />}
        </Route>
        
        <Route path="/business/onboarding">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessOnboarding /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/field-tracking">
          {auth.isLoading ? null : auth.isAuthenticated ? <RunnerFieldTrackingPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/field-tracking/admin">
          {auth.isLoading ? null : auth.isAuthenticated ? <AdminFieldTrackingPage /> : <Redirect to="/login" />}
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

        <Route path="/business/tracking-templates">
          {auth.isLoading ? null : auth.isAuthenticated ? <TrackingTemplatesPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/settings">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessSettingsPage /> : <Redirect to="/login" />}
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

        <Route path="/business/ai-suite">
          {auth.isLoading ? null : auth.isAuthenticated ? <AiSuiteHub /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/reports">
          {auth.isLoading ? null : auth.isAuthenticated ? <BusinessReports /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/health-audit">
          {auth.isLoading ? null : auth.isAuthenticated ? <DynamicHealthAudit /> : <Redirect to="/login" />}
        </Route>

        <Route path="/business/join/:code">
          {(params) => (
            auth.isLoading ? null : auth.isAuthenticated ? (
              <BusinessJoin code={params.code} />
            ) : (
              <Redirect to={`/login?redirect=/business/join/${params.code}`} />
            )
          )}
        </Route>

        <Route path="/dashboard/share/:token">
          {(params) => <SharedDashboard token={params.token} />}
        </Route>

        <Route path="/report/share/:token">
          {(params) => <SharedBusinessReport token={params.token} />}
        </Route>

        <Route path="/sheet/:id">
          {auth.isLoading ? null : auth.isAuthenticated ? <SheetViewPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/data-import">
          {auth.isLoading ? null : auth.isAuthenticated ? <DataImportPage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/oauth/simulate/:provider" component={OAuthSimulator} />

        <Route path="/data-import-suite">
          {auth.isLoading ? null : auth.isAuthenticated ? <DataImportSuitePage /> : <Redirect to="/login" />}
        </Route>

        <Route path="/terms" component={TermsOfService} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/support" component={SupportPage} />
        <Route path="/addon-sidebar" component={AddonSidebarPage} />
        <Route path="/shopify-auth" component={ShopifyAuthPage} />
        <Route path="/oauth_attempt" component={OAuthSuccessPage} />

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
