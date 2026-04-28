import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { AppLayout } from "@/components/sentinel/AppLayout";
import { useBackendStatus } from "@/lib/hooks";
import { loadOverrideFromStorage, loadRuntimeConfig } from "@/lib/config";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import Logs from "./pages/Logs";
import Monitoring from "./pages/Monitoring";
import Retraining from "./pages/Retraining";
import Models from "./pages/Models";
import Kibana from "./pages/Kibana";
import Health from "./pages/Health";
import Audit from "./pages/Audit";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ShellRoute({ children }: { children: React.ReactNode }) {
  const { online } = useBackendStatus();
  return <AppLayout online={online}>{children}</AppLayout>;
}

function RootRedirect() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Navigate to="/dashboard" replace />;
}

const App = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadOverrideFromStorage();
    loadRuntimeConfig().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Initializing console…
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner theme="dark" richColors closeButton />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<RootRedirect />} />

              <Route path="/dashboard" element={<ProtectedRoute><ShellRoute><Dashboard /></ShellRoute></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute><ShellRoute><Alerts /></ShellRoute></ProtectedRoute>} />
              <Route path="/logs" element={<ProtectedRoute><ShellRoute><Logs /></ShellRoute></ProtectedRoute>} />
              <Route path="/kibana" element={<ProtectedRoute><ShellRoute><Kibana /></ShellRoute></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><ShellRoute><SettingsPage /></ShellRoute></ProtectedRoute>} />

              {/* Admin only */}
              <Route path="/monitoring" element={<ProtectedRoute roles={["admin"]}><ShellRoute><Monitoring /></ShellRoute></ProtectedRoute>} />
              <Route path="/retraining" element={<ProtectedRoute roles={["admin"]}><ShellRoute><Retraining /></ShellRoute></ProtectedRoute>} />
              <Route path="/models" element={<ProtectedRoute roles={["admin"]}><ShellRoute><Models /></ShellRoute></ProtectedRoute>} />
              <Route path="/health" element={<ProtectedRoute roles={["admin"]}><ShellRoute><Health /></ShellRoute></ProtectedRoute>} />
              <Route path="/audit" element={<ProtectedRoute roles={["admin"]}><ShellRoute><Audit /></ShellRoute></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
