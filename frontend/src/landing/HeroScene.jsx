import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/*
 * Orbiting pipeline ring — the desktop hero centerpiece.
 * Lazy-loaded after first paint; pauses when the tab is hidden.
 */
export default function HeroScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.6, 6.4);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    group.rotation.x = 0.42;
    scene.add(group);

    const makeRing = (radius, color, count, size) => {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        const a = (i / count) * Math.PI * 2;
        positions[i * 3] = Math.cos(a) * radius;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = Math.sin(a) * radius;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9, sizeAttenuation: true });
      return new THREE.Points(geo, mat);
    };

    const outer = makeRing(2.4, 0xd4ff00, 160, 0.035);
    const inner = makeRing(1.7, 0x00e5ff, 120, 0.028);
    inner.material.opacity = 0.45;
    group.add(outer, inner);

    const circleGeo = (radius) => {
      const pts = [];
      for (let i = 0; i <= 128; i += 1) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      return new THREE.BufferGeometry().setFromPoints(pts);
    };
    const outerLine = new THREE.Line(circleGeo(2.4), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 }));
    const innerLine = new THREE.Line(circleGeo(1.7), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 }));
    group.add(outerLine, innerLine);

    const stageDots = [];
    const STAGES = 6;
    for (let i = 0; i < STAGES; i += 1) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(i === 0 ? 0.07 : 0.045, 16, 16),
        new THREE.MeshBasicMaterial({ color: i === 0 ? 0xd4ff00 : 0xffffff, transparent: true, opacity: i === 0 ? 1 : 0.5 })
      );
      dot.userData.angle = (i / STAGES) * Math.PI * 2;
      group.add(dot);
      stageDots.push(dot);
    }

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    let running = true;
    const clock = new THREE.Clock();
    const tick = () => {
      if (!running) return;
      const t = clock.getElapsedTime();
      outer.rotation.y = t * 0.12;
      inner.rotation.y = -t * 0.09;
      stageDots.forEach((dot, i) => {
        const a = dot.userData.angle + t * 0.12;
        dot.position.set(Math.cos(a) * 2.4, 0, Math.sin(a) * 2.4);
        if (i === 0) dot.material.opacity = 0.7 + Math.sin(t * 2.4) * 0.3;
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        clock.getDelta();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" aria-hidden="true" />;
}
