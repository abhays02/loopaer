import React, { useCallback, useEffect, useState } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import "./landing.css";
import { AmbientField } from "./shared";
import Loader from "./Loader";
import Cursor from "./Cursor";
import Header from "./Header";
import Hero from "./Hero";
import PipelineSection from "./PipelineSection";
import Pillars from "./Pillars";
import UseCases from "./UseCases";
import Outcomes from "./Outcomes";
import CtaSection, { Footer } from "./CtaSection";
import { platform, FALLBACK_HEALTH } from "../lib/platform";

export default function LandingPage() {
  const [showLoader, setShowLoader] = useState(true);
  const [booted, setBooted] = useState(false);
  const [health, setHealth] = useState(null);

  const onLift = useCallback(() => setBooted(true), []);
  const onDone = useCallback(() => setShowLoader(false), []);

  useEffect(() => {
    platform
      .health()
      .then(setHealth)
      .catch(() => setHealth(FALLBACK_HEALTH));
  }, []);

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="landing relative min-h-screen overflow-x-clip">
        <AmbientField />
        <Cursor active={booted} />
        {showLoader && <Loader onLift={onLift} onDone={onDone} />}

        <Header booted={booted} />

        <main className="relative z-10">
          <Hero booted={booted} health={health} />
          <PipelineSection />
          <Pillars />
          <UseCases />
          <Outcomes />
          <CtaSection />
        </main>

        <Footer />
      </div>
    </LazyMotion>
  );
}
