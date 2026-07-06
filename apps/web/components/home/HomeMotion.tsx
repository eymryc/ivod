"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  fadeUpChild,
  sectionReveal,
  staggerContainer,
  useReducedMotion,
  kenBurnsTransition,
} from "@/lib/motion/premium-motion";

/** Cascade kicker → titre → CTA (hero) */
export function HeroTextCascade({
  children,
  className,
  replayKey,
}: {
  children: ReactNode;
  className?: string;
  replayKey?: string | number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={replayKey}
      className={className}
      variants={staggerContainer(reduced)}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function HeroCascadeItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div variants={fadeUpChild(reduced)} className={className}>
      {children}
    </motion.div>
  );
}

/** Lueur pulsée derrière le titre hero */
export function HeroTitleGlow({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <div className="relative">
      {!reduced && (
        <motion.div
          aria-hidden
          className="absolute -inset-x-4 -inset-y-2 bg-brand-magenta/20 blur-3xl rounded-none pointer-events-none"
          animate={{ opacity: [0.12, 0.28, 0.12] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

/** Ken Burns sur image hero pleine largeur */
export function HeroKenBurnsLayer({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className="absolute inset-0 overflow-hidden" animate={kenBurnsTransition(reduced)}>
      {children}
    </motion.div>
  );
}

/** Section rail / bloc — reveal au scroll */
export function HomeSectionReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      className={className}
      variants={sectionReveal(reduced)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-72px" }}
    >
      {children}
    </motion.section>
  );
}

/** Carte dans un rail — reveal CSS léger (sans framer-motion par carte). */
export function RailCardMotion({
  children,
  className,
}: {
  index?: number;
  children: ReactNode;
  className?: string;
}) {
  return <div className={`rail-card-enter ${className ?? ""}`.trim()}>{children}</div>;
}

/** Pill catégorie avec hover premium */
export function CategoryPillLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div variants={fadeUpChild(reduced)} className="shrink-0 snap-start">
      <motion.div whileHover={reduced ? undefined : { y: -2 }} transition={{ duration: 0.2 }}>
        <Link
          href={href}
          className="home-category-pill group ivod-btn inline-flex items-center gap-2 px-4 py-2.5 text-[13px] text-white/70"
        >
          <Icon
            size={14}
            className="text-brand-magenta shrink-0 group-hover:text-brand-gold transition-colors duration-300"
            strokeWidth={1.75}
          />
          {label}
        </Link>
      </motion.div>
    </motion.div>
  );
}

/** Orbes ambiantes sous le hero (CSS + léger float) */
export function HomeContentAmbient() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <div className="home-content-ambient pointer-events-none" aria-hidden>
      <div className="home-content-ambient__orb home-content-ambient__orb--1" />
      <div className="home-content-ambient__orb home-content-ambient__orb--2" />
    </div>
  );
}
