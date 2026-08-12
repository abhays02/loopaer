import React, { useEffect, useRef, useState } from "react";
import { m, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

export const EXPO = [0.16, 1, 0.3, 1];
export const INOUT = [0.65, 0, 0.35, 1];
export const SPRING_SNAPPY = { type: "spring", stiffness: 400, damping: 30 };
export const SPRING_STANDARD = { type: "spring", stiffness: 300, damping: 25 };

const REVEAL_VIEWPORT = { once: true, amount: 0.15, margin: "0px 0px -10% 0px" };

export function Reveal({ children, delay = 0, y = 24, className, as = "div", ...rest }) {
  const reduced = useReducedMotion();
  const Tag = m[as] || m.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={REVEAL_VIEWPORT}
      transition={reduced ? { duration: 0.2 } : { duration: 0.6, delay, ease: EXPO }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Stagger({ children, className, step = 0.08, maxTotal = 0.4 }) {
  const items = React.Children.toArray(children);
  const capped = Math.min(step, items.length > 1 ? maxTotal / (items.length - 1) : step);
  return (
    <div className={className}>
      {items.map((child, i) => (
        <Reveal key={child.key ?? i} delay={i * capped}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}

/* Headline masked line reveal: each line rises from inside an overflow-hidden row */
export function MaskedLines({ lines, className, lineClassName, delay = 0, stagger = 0.08, booted = true }) {
  const reduced = useReducedMotion();
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <m.span
            className={`block ${lineClassName || ""}`}
            initial={reduced ? { opacity: 0 } : { y: "104%" }}
            animate={booted ? (reduced ? { opacity: 1 } : { y: "0%" }) : undefined}
            transition={reduced ? { duration: 0.3 } : { duration: 0.7, delay: delay + i * stagger, ease: EXPO }}
          >
            {line}
          </m.span>
        </span>
      ))}
    </span>
  );
}

export function useFinePointer(minWidth = 0) {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const check = () =>
      setFine(window.matchMedia("(pointer: fine)").matches && window.innerWidth >= minWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [minWidth]);
  return fine;
}

/* Magnetic pull for primary targets: up to `strength` px toward the pointer */
export function Magnetic({ children, strength = 6, field = 56, className }) {
  const reduced = useReducedMotion();
  const fine = useFinePointer(1024);
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING_SNAPPY);
  const sy = useSpring(y, SPRING_SNAPPY);

  const active = fine && !reduced;

  const onMove = (e) => {
    if (!active || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > Math.max(rect.width, rect.height) / 2 + field) {
      x.set(0);
      y.set(0);
      return;
    }
    x.set(Math.max(-strength, Math.min(strength, dx * 0.2)));
    y.set(Math.max(-strength, Math.min(strength, dy * 0.2)));
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <m.div
      ref={ref}
      className={`inline-block ${className || ""}`}
      style={active ? { x: sx, y: sy } : undefined}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </m.div>
  );
}

/* Corner brackets — signature HUD detail for key modules */
export function CornerBrackets({ children, className }) {
  return <div className={`lc-brackets ${className || ""}`}>{children}</div>;
}

/* Fixed ambient field: blueprint grid with faint scroll parallax + grain */
export function AmbientField() {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  useEffect(() => {
    if (reduced) return undefined;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (ref.current) ref.current.style.transform = `translate3d(0, ${-window.scrollY * 0.06}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);
  return (
    <>
      <div ref={ref} className="lc-grid-field" aria-hidden="true" />
      <div className="lc-grain" aria-hidden="true" />
    </>
  );
}
