import React from "react";
import { Link } from "react-router-dom";
import { Reveal, CornerBrackets, Magnetic } from "./shared";

export default function CtaSection() {
  return (
    <section id="consultation" className="lc-anchor relative py-20 lg:py-32">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <Reveal>
          <CornerBrackets className="mx-auto max-w-[760px] rounded-2xl border border-white/10 bg-[#0A0A0A] px-6 py-14 text-center md:px-14 md:py-20">
            <p className="lc-overline justify-center mb-5">05 — Start the conversation</p>
            <h2 className="lc-section-title">Bring one workflow. Leave with a running pipeline.</h2>
            <p className="lc-intro mx-auto mt-6 text-center">
              In a working session, we take one of your real workflows and walk it through the
              six stages — so you can judge the platform by its behavior, not its slides.
            </p>
            <div className="mt-10 flex justify-center">
              <Magnetic>
                <Link to="/signin" className="lc-btn-primary w-full sm:w-auto !h-14">
                  Start a consultation
                </Link>
              </Magnetic>
            </div>
            <p className="lc-caption mt-6">RESPONSE WITHIN ONE BUSINESS DAY · NO DECK, NO DEMO THEATER</p>
          </CornerBrackets>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-10 md:px-10 md:py-12 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-grotesk font-extrabold text-lg text-white">Loopaer</p>
          <p className="lc-caption mt-2 max-w-[26rem]">
            The command center for enterprise AI transformation. Plan, connect, reason, verify —
            in the open.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-1 lg:justify-end">
          {[
            ["Intelligence", "#intelligence"],
            ["Pillars", "#pillars"],
            ["Use cases", "#use-cases"],
            ["Outcomes", "#outcomes"],
            ["Sign in", "/signin"],
          ].map(([label, href]) =>
            href.startsWith("/") ? (
              <Link key={label} to={href} className="lc-nav-link">
                {label}
              </Link>
            ) : (
              <a key={label} href={href} className="lc-nav-link">
                {label}
              </a>
            )
          )}
        </nav>
      </div>
      <div className="mx-auto max-w-[1200px] px-6 pb-10 md:px-10">
        <p className="lc-caption text-white/25">
          © 2026 LOOPAER · DEMONSTRATION EXPERIENCE · ALL FIGURES INVENTED FOR THIS DEMO
        </p>
      </div>
    </footer>
  );
}
