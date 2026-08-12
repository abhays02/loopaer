import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import { EXPO } from "./shared";

const NAV = [
  { id: "intelligence", label: "Intelligence" },
  { id: "pillars", label: "Pillars" },
  { id: "use-cases", label: "Use cases" },
  { id: "outcomes", label: "Outcomes" },
];

export default function Header({ booted }) {
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const glass = scrolled || open;

  return (
    <>
      <m.header
        className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
          glass ? "bg-[rgba(10,10,10,0.6)] backdrop-blur-md border-b border-white/[0.06]" : "bg-transparent"
        }`}
        initial={reduced ? { opacity: 0 } : { y: -12, opacity: 0 }}
        animate={booted ? { y: 0, opacity: 1 } : undefined}
        transition={{ duration: 0.5, ease: EXPO }}
      >
        <div className="mx-auto flex h-14 md:h-16 max-w-[1200px] items-center justify-between px-5 md:px-10">
          <a href="#top" className="font-grotesk font-extrabold text-base md:text-lg tracking-tight text-white min-h-[44px] inline-flex items-center">
            Loopaer
          </a>

          <nav className="hidden lg:flex items-center gap-2" aria-label="Sections">
            {NAV.map((item) => (
              <a key={item.id} className="lc-nav-link" href={`#${item.id}`}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link to="/signin" className="lc-btn-ghost !h-10 !text-sm">
              Sign in
            </Link>
            <a href="#consultation" className="lc-btn-primary !h-10 !text-sm">
              Start a consultation
            </a>
          </div>

          <button
            type="button"
            className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white"
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-3 w-5" aria-hidden="true">
              <span
                className={`absolute left-0 top-0 h-px w-5 bg-current transition-transform duration-200 ${
                  open ? "translate-y-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 bottom-0 h-px w-5 bg-current transition-transform duration-200 ${
                  open ? "-translate-y-1.5 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </m.header>

      <AnimatePresence>
        {open && (
          <m.div
            id="landing-menu"
            className="fixed inset-0 z-30 lg:hidden bg-[rgba(10,10,10,0.85)] backdrop-blur-xl pt-24 px-6"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: EXPO }}
          >
            <nav className="flex flex-col" aria-label="Mobile sections">
              {NAV.map((item, i) => (
                <m.a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex min-h-[48px] items-center border-b border-white/[0.08] font-grotesk font-medium text-2xl text-white"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduced ? 0 : 0.05 + i * 0.05, duration: 0.3, ease: EXPO }}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </m.a>
              ))}
            </nav>
            <div className="mt-8 flex flex-col gap-3">
              <a href="#consultation" className="lc-btn-primary w-full !h-14" onClick={() => setOpen(false)}>
                Start a consultation
              </a>
              <Link to="/signin" className="lc-btn-ghost w-full !h-14">
                Sign in
              </Link>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
