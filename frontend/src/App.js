import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "./lib/auth";
import "./App.css";

const Landing = React.lazy(() => import("./pages/Landing"));
const AuthPage = React.lazy(() => import("./pages/AuthPage"));
const Runtime = React.lazy(() => import("./pages/Runtime"));
const Diff = React.lazy(() => import("./pages/Diff"));
const Snapshot = React.lazy(() => import("./pages/Snapshot"));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster theme="dark" position="bottom-center" toastOptions={{ style: { background: "rgba(15,15,15,0.95)", color: "white", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "-apple-system, SF Pro Display, Inter, sans-serif" } }} />
        <AnimatePresence mode="wait">
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/signin" element={<AuthPage mode="signin" />} />
              <Route path="/signup" element={<AuthPage mode="signup" />} />
              <Route path="/runtime/:sid" element={<Runtime />} />
              <Route path="/diff/:sid1/:sid2" element={<Diff />} />
              <Route path="/snapshot/:snapId" element={<Snapshot />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </AuthProvider>
    </BrowserRouter>
  );
}
