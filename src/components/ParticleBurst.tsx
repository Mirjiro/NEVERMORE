"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ParticleLevel } from "@/lib/rarityStyles";

const COUNTS: Record<ParticleLevel, number> = {
  none: 0,
  subtle: 10,
  burst: 20,
  storm: 30,
};

interface Particle {
  id: number;
  dx: number;
  dy: number;
  delay: number;
  size: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const distance = 50 + Math.random() * 70;
    return {
      id: i,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      delay: Math.random() * 0.15,
      size: 3 + Math.random() * 5,
    };
  });
}

export default function ParticleBurst({
  level,
  colorClass,
}: {
  level: ParticleLevel;
  colorClass: string;
}) {
  const count = COUNTS[level];
  // Parent remounts this component on every pull (via key), so a lazy
  // initializer is the one-time random layout for this reveal.
  const [particles] = useState<Particle[]>(() => generateParticles(count));

  if (count === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className={`absolute rounded-full bg-current ${colorClass}`}
          style={{ width: p.size, height: p.size }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.9, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
