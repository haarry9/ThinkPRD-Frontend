import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider } from '@/context/AuthContext'
import RequireAuth from '@/routes/RequireAuth'
import Profile from '@/pages/Profile'
import WorkspacePage from '@/pages/Workspace'
import { AgentSessionProvider } from '@/context/AgentSessionContext'

const queryClient = new QueryClient();

const App = () => {
  // Force dark theme like Cursor IDE style
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark')
  }
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <AgentSessionProvider>
            <BrowserRouter>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/workspace/:projectId/:chatId"
                element={
                  <RequireAuth>
                    <WorkspacePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AgentSessionProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
