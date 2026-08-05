"use client";

import { motion } from "framer-motion";
import type { Transition } from "framer-motion";

/** Not uploaded yet — the Realm tab renders its flat placeholder layer until
 * this points at a real file. Once the illustrated Mortal Realm scene
 * exists, drop it at this path and flip `hasArt` below; nothing else here
 * needs to change. */
const REALM_BACKGROUND_SRC = "/assets/backgrounds/realm-bg.webp";

// Same drift/vignette family as OriginBackground.
const DRIFT_TRANSITION: Transition = { duration: 22, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" };
const VIGNETTE_TRANSITION: Transition = { duration: 14, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" };

/**
 * Full-bleed, cinematic backdrop for the Realm tab — the same architecture
 * as OriginBackground (overscanned drift layer + breathing vignette), so
 * swapping in the illustrated Mortal Realm scene is a drop-in change: point
 * REALM_BACKGROUND_SRC at the real file and flip `hasArt` to true. Until
 * then this renders a flat placeholder in the same position so nothing else
 * in RealmTab has to move when the art lands.
 */
export default function RealmBackground({ hasArt = false }: { hasArt?: boolean }) {
  return (
    // `fixed` (not `absolute`) so this covers the full viewport height, the
    // same way OriginBackground does — the scene reads as one continuous
    // world behind the translucent TabBar dock, not a separate panel.
    <div className="pointer-events-none fixed inset-0 -z-10 mx-auto w-full max-w-md overflow-hidden">
      {hasArt ? (
        <motion.div
          className="absolute"
          style={{ top: -16, bottom: -16, left: -16, right: -16 }}
          animate={{ scale: [1, 1.015], y: [0, -4] }}
          transition={DRIFT_TRANSITION}
        >
          <img
            src={REALM_BACKGROUND_SRC}
            alt=""
            draggable={false}
            className="h-full w-full select-none object-cover"
            style={{ filter: "blur(0.8px) brightness(0.9)" }}
          />
        </motion.div>
      ) : (
        // TEMP flat placeholder — replaced the moment `hasArt` flips.
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black" />
      )}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: [0.45, 0.48] }}
        transition={VIGNETTE_TRANSITION}
        style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 42%, rgba(0,0,0,0.75) 100%)" }}
      />
    </div>
  );
}
