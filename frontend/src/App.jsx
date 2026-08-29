import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Apply from "./pages/Apply";
import Status from "./pages/Status";
import BankDashboard from "./pages/BankDashboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/apply"
              element={
                <ProtectedRoute>
                  <Apply />
                </ProtectedRoute>
              }
            />
            <Route
              path="/status/:id"
              element={
                <ProtectedRoute>
                  <Status />
                </ProtectedRoute>
              }
            />
            <Route path="/bank" element={<BankDashboard />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}