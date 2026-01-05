import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { NotesProvider } from "@/context/NotesContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import GoogleAuthSuccess from "./pages/GoogleAuthSuccess";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import NoteEditor from "./pages/NoteEditor";
import AIChat from "./pages/AIChat";
import RecycleBin from "./pages/RecycleBin";
import Subscription from "./pages/Subscription";
import Settings from "./pages/Settings";
import ApiTest from "./pages/ApiTest";
import IntegrationTest from "./pages/IntegrationTest";
import LoginTest from "./pages/LoginTest";
import ThemeTest from "./pages/ThemeTest";
import EditorTest from "./pages/EditorTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <NotesProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
                <Route path="/api-test" element={<ApiTest />} />
                <Route path="/integration-test" element={<IntegrationTest />} />
                <Route path="/login-test" element={<LoginTest />} />
                <Route path="/theme-test" element={<ThemeTest />} />
                <Route path="/editor-test" element={<EditorTest />} />
                
                {/* Protected app routes with layout */}
                <Route element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/notes" element={<Notes />} />
                  <Route path="/notes/:id" element={<NoteEditor />} />
                  <Route path="/ai-chat" element={<AIChat />} />
                  <Route path="/recycle-bin" element={<RecycleBin />} />
                  <Route path="/subscription" element={<Subscription />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/api-test" element={<ApiTest />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </NotesProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
