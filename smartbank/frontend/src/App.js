import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import Layout from "./components/Layout";

function Private({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}
function Public({ children }) {
  const { token } = useAuth();
  return !token ? children : <Navigate to="/dashboard" replace />;
}
function AdminOnly({ children }) {
  const { user } = useAuth();
  return user?.is_admin ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Public><Login /></Public>} />
          <Route path="/signup" element={<Public><Signup /></Public>} />
          <Route path="/" element={<Private><Layout /></Private>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="chat" element={<Chat />} />
            <Route path="admin" element={<AdminOnly><Admin /></AdminOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
