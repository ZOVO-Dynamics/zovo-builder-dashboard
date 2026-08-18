'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

type Particle = {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
  opacity: number;
};

/**
 * Particules dorees flottant lentement vers le haut, en arriere-plan fixe
 * (visible derriere toute la page pendant le defilement). Rendu via canvas
 * + requestAnimationFrame pour rester fluide, y compris sur mobile.
 */
export const AmbientParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = window.innerWidth;
    let height = window.innerHeight;
    let particles: Particle[] = [];
    let rafId = 0;

    const makeParticles = () => {
      const count = Math.min(50, Math.max(18, Math.floor(width / 32)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.4 + 0.5,
        speed: Math.random() * 0.22 + 0.06,
        drift: Math.random() * 0.4 - 0.2,
        phase: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.15 + 0.1,
      }));
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeParticles();
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.y -= p.speed;
          p.x += Math.sin(p.phase + p.y * 0.01) * p.drift * 0.05;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
        ctx.fill();
      }
      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
};

/**
 * Halo lumineux dore/ambre en mouvement lent et circulaire, a ancrer
 * localement derriere une section (positionnement via className).
 */
export const AmbientHalo = ({ className = '' }: { className?: string }) => (
  <motion.div
    aria-hidden="true"
    className={`absolute -z-10 rounded-full bg-amber-500/10 blur-3xl pointer-events-none ${className}`}
    animate={{
      x: [0, 40, 0, -40, 0],
      y: [0, -30, 0, 30, 0],
    }}
    transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
  />
);
