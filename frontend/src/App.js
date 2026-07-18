import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Landing from "./pages/Landing";
import Runtime from "./pages/Runtime";
import Diff from "./pages/Diff";
import Snapshot from "./pages/Snapshot";
import AuthPage from "./pages/AuthPage";
import { AuthProvider } from "./lib/auth";
import "./App.css";

function CustomCursor() {
  const [pos, setPos] = useState({ x: -20, y: -20 });
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const mv = (e) => setPos({ x: e.clientX, y: e.clientY });
    const over = (e) => {
      const t = e.target;
      const interactive = t.closest && t.closest("button, a, input, textarea, [role=button], [data-hover]");
      setHovered(!!interactive);
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseover", over);
    return () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseover", over);
    };
  }, []);
  return (
    <div
      className="cursor-dot"
      style={{
        transform: `translate(${pos.x - 4}px, ${pos.y - 4}px) scale(${hovered ? 3.6 : 1})`,
        opacity: hovered ? 0.6 : 1,
      }}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CustomCursor />
        <Toaster theme="dark" position="bottom-center" toastOptions={{ style: { background: "rgba(15,15,15,0.95)", color: "white", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "-apple-system, SF Pro Display, Inter, sans-serif" } }} />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<AuthPage mode="signin" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />
            <Route path="/runtime/:sid" element={<Runtime />} />
            <Route path="/diff/:sid1/:sid2" element={<Diff />} />
            <Route path="/snapshot/:snapId" element={<Snapshot />} />
          </Routes>
        </AnimatePresence>
      </AuthProvider>
    </BrowserRouter>
  );
}
