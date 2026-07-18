import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { ArrowRight, ArrowLeft } from "lucide-react";

/** Sign in / Sign up — Apple-clean, in-house JWT (no OAuth). */
export default function AuthPage({ mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { signup, login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      if (mode === "signup") await signup(email, password, name);
      else await login(email, password);
      toast.success(mode === "signup" ? "Welcome to Loopaer" : "Signed in");
      nav("/");
    } catch (err) {
      toast.error(err.message || "failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ivory)] flex items-center justify-center px-6 relative">
      <div className="fixed inset-0 grain pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(217,255,77,0.06), transparent 60%)" }} />

      <div className="relative w-full max-w-[420px]">
        <Link to="/" className="text-[var(--ivory)]/50 hover:text-[var(--ivory)] transition-colors inline-flex items-center gap-1.5 text-[13px] font-display mb-10">
          <ArrowLeft size={14} /> back
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="label-tag mb-4">{mode === "signup" ? "CREATE ACCOUNT" : "WELCOME BACK"}</div>
          <h1 className="display-hero text-[var(--ivory)] leading-[0.98]" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
            {mode === "signup" ? (<>Join <em className="font-serif italic text-[var(--ivory)]/60">Loopaer.</em></>) : (<>Sign in.</>)}
          </h1>
          <p className="mt-4 text-[14px] text-[var(--ivory)]/55 font-display">
            {mode === "signup" ? "Every session, every skill, every reasoning tree — yours." : "Pick up where your cognition left off."}
          </p>
        </motion.div>

        <form onSubmit={submit} className="mt-10 space-y-3">
          {mode === "signup" && (
            <Input label="Name" value={name} onChange={setName} placeholder="How should we call you?" testid="auth-name" />
          )}
          <Input label="Email" type="email" value={email} onChange={setEmail} placeholder={"you" + String.fromCharCode(64) + "domain.com"} testid="auth-email" />
          <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="min. 6 characters" testid="auth-password" />

          <motion.button
            type="submit" disabled={busy || !email || !password}
            data-testid="auth-submit"
            whileTap={{ scale: 0.98 }}
            className="btn-primary w-full mt-6 disabled:opacity-40 inline-flex items-center justify-center gap-2 text-[14px] py-3"
          >
            {busy ? "…" : (<>{mode === "signup" ? "Create account" : "Sign in"}<ArrowRight size={15} /></>)}
          </motion.button>
        </form>

        <div className="mt-8 text-center text-[13px] text-[var(--ivory)]/50 font-display">
          {mode === "signup" ? (<>Already have an account? <Link to="/signin" className="text-[var(--acid)] hover:underline">Sign in</Link></>)
                             : (<>New to Loopaer? <Link to="/signup" className="text-[var(--acid)] hover:underline">Create an account</Link></>)}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", testid }) {
  return (
    <label className="block">
      <div className="label-tag mb-2">{label}</div>
      <input
        data-testid={testid}
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full glass rounded-2xl px-5 py-3.5 text-[15px] text-[var(--ivory)] font-display outline-none focus:border-[var(--acid)]/50 placeholder:text-[var(--ivory)]/25"
      />
    </label>
  );
}
