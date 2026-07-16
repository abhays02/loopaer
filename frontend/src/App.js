import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Landing from "./pages/Landing";
import Runtime from "./pages/Runtime";
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
      <CustomCursor />
      <Toaster theme="dark" position="bottom-center" toastOptions={{ style: { background: "rgba(15,15,15,0.95)", color: "white", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "JetBrains Mono, monospace" } }} />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/runtime/:sid" element={<Runtime />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
