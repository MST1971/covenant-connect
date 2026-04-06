import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import MemberDashboard from "./pages/MemberDashboard.tsx";
import RoleManagement from "./pages/RoleManagement.tsx";
import MemberRegistration from "./pages/MemberRegistration.tsx";
import MembersList from "./pages/MembersList.tsx";
import Programs from "./pages/Programs.tsx";
import Departments from "./pages/Departments.tsx";
import ScanAttendance from "./pages/ScanAttendance.tsx";
import AttendanceReports from "./pages/AttendanceReports.tsx";
import Visitors from "./pages/Visitors.tsx";
import GivingManagement from "./pages/GivingManagement.tsx";
import FinancialReports from "./pages/FinancialReports.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/members" element={
              <ProtectedRoute><MembersList /></ProtectedRoute>
            } />
            <Route path="/members/register" element={
              <ProtectedRoute><MemberRegistration /></ProtectedRoute>
            } />
            <Route path="/programs" element={
              <ProtectedRoute><Programs /></ProtectedRoute>
            } />
            <Route path="/departments" element={
              <ProtectedRoute><Departments /></ProtectedRoute>
            } />
            <Route path="/attendance/scan" element={
              <ProtectedRoute><ScanAttendance /></ProtectedRoute>
            } />
            <Route path="/attendance/reports" element={
              <ProtectedRoute><AttendanceReports /></ProtectedRoute>
            } />
            <Route path="/my-dashboard" element={
              <ProtectedRoute><MemberDashboard /></ProtectedRoute>
            } />
            <Route path="/visitors" element={
              <ProtectedRoute><Visitors /></ProtectedRoute>
            } />
            <Route path="/giving" element={
              <ProtectedRoute><GivingManagement /></ProtectedRoute>
            } />
            <Route path="/financial-reports" element={
              <ProtectedRoute><FinancialReports /></ProtectedRoute>
            } />
            <Route path="/roles" element={
              <ProtectedRoute><RoleManagement /></ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
