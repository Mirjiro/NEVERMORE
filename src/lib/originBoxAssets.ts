import type { Transition } from "framer-motion";

/** Static paths for the Classic Origin Box's lid/base art (see /public/assets/origin-box). */
export const CLASSIC_ORIGIN_BOX_ASSETS = {
  lidSrc: "/assets/origin-box/classic-lid.png",
  baseSrc: "/assets/origin-box/classic-base.png",
};

/**
 * Static paths for the Elite Origin Box's lid/base art. The base (the empty
 * open box) is shared with Classic — same physical box, only the lid design
 * differs per Origin tier.
 */
export const ELITE_ORIGIN_BOX_ASSETS = {
  lidSrc: "/assets/origin-box/elite-lid.png",
  baseSrc: "/assets/origin-box/classic-base.png",
};

/**
 * Shared idle "alive" motion for the Origin box art — a gentle hover bob plus
 * a slight left-right rock (not a full rotation). Used by both the carousel
 * tile (PackFront) and the reveal-stage box (ClassicOriginBoxOpening) so the
 * two stay visually consistent. Durations are deliberately mismatched so the
 * loop reads as organic drifting rather than an obviously-repeating cycle.
 */
export const BOX_IDLE_ANIMATE = {
  y: [0, -3, 0, 3, 0],
  rotate: [0, 2, 0, -2, 0],
};

export const BOX_IDLE_TRANSITION: Transition = {
  y: { duration: 4.4, repeat: Infinity, ease: "easeInOut" },
  rotate: { duration: 6.2, repeat: Infinity, ease: "easeInOut" },
};
