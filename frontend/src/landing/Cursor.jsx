import React, { useEffect, useState } from "react";
import { m, useMotionValue, useSpring, useReducedMotion, useMotionValueEvent } from "framer-motion";
import { SPRING_STANDARD } from "./shared";

/*
 * Fine-pointer-only custom cursor: an acid dot tracking 1:1 and a hairline
 * ring following on a spring. Never renders on touch devices.
 */
export default function Cursor({ active }) {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState("default"); // default | interactive | text
  const [pressed, setPressed] = useState(false);
  const [idle, setIdle] = useState(false);

  const px = useMotionValue(-100);
  const py = useMotionValue(-100);
  const ringX = useSpring(px, SPRING_STANDARD);
  const ringY = useSpring(py, SPRING_STANDARD);
  const [ringXY, setRingXY] = useState({ x: -100, y: -100 });
  useMotionValueEvent(ringX, "change", (v) => setRingXY((s) => ({ x: v, y: s.y })));
  useMotionValueEvent(ringY, "change", (v) => setRingXY((s) => ({ x: s.x, y: v })));

  useEffect(() => {
    const check = () =>
      setEnabled(
        active &&
          !reduced &&
          window.matchMedia("(pointer: fine)").matches &&
          window.innerWidth >= 1024
      );
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [active, reduced]);

  useEffect(() => {
    if (!enabled) {
      document.body.classList.remove("landing-cursor-none");
      return undefined;
    }
    document.body.classList.add("landing-cursor-none");

    let idleTimer = 0;
    const wake = () => {
      setIdle(false);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setIdle(true), 4000);
    };
    const onMove = (e) => {
      px.set(e.clientX);
      py.set(e.clientY);
      wake();
    };
    const onOver = (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      if (t.closest("button, a, [role=button], input, select, textarea, [data-cursor=interactive]")) {
        setMode("interactive");
      } else if (t.closest("p, h1, h2, h3, h4, span, li")) {
        setMode("text");
      } else {
        setMode("default");
      }
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    wake();

    return () => {
      document.body.classList.remove("landing-cursor-none");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.clearTimeout(idleTimer);
    };
  }, [enabled, px, py]);

  if (!enabled) return null;

  const interactive = mode === "interactive";
  const text = mode === "text";

  return (
    <>
      <m.div
        className="lc-cursor-dot"
        aria-hidden="true"
        style={{ x: px, y: py, translateX: "-50%", translateY: "-50%" }}
        animate={{ opacity: pressed ? 1 : 0.9, scale: pressed ? 1.3 : 1 }}
        transition={{ duration: 0.12 }}
      />
      <m.div
        className="lc-cursor-ring"
        aria-hidden="true"
        style={{ x: ringXY.x, y: ringXY.y, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: text ? 4 : interactive ? 44 : 32,
          height: text ? 20 : interactive ? 44 : 32,
          opacity: idle ? 0.25 : text ? 0.7 : interactive ? 0.9 : 0.5,
          scale: pressed ? 0.8 : 1,
          borderRadius: text ? "2px" : "999px",
        }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      />
    </>
  );
}
