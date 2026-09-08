import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Spinner from "./components/ui/Spinner";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Apply from "./pages/Apply";
import OcrTest from "./pages/OcrTest";
import AboutDevelopers from "./pages/AboutDevelopers";
import Status from "./pages/Status";
import BankDashboard from "./pages/BankDashboard";
import NotFound from "./pages/NotFound";

// Network page pulls in three.js — lazy-loaded so it doesn't bloat the main bundle.
const Network = lazy(() => import("./pages/Network"));

function PageFallback() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-24 flex items-center gap-3 text-paper-muted font-mono text-sm">
      <Spinner /> Loading…
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
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
                path="/ocr-scanner"
                element={
                  <ProtectedRoute>
                    <OcrTest />
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
              <Route
                path="/network"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Network />
                  </Suspense>
                }
              />
              <Route path="/team" element={<AboutDevelopers />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}