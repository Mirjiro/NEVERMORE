/** Shared layout rhythm for the Realm tab — centralizing these numbers means
 * every panel's edge inset and sizing stays consistent, and the whole scene
 * can be re-tuned from one place once the illustrated Mortal Realm artwork
 * sets the actual safe-composition area (where the ground line falls, how
 * much headroom the sky needs, etc). */
export const REALM_EDGE_INSET_PX = 24;
export const REALM_TOP_GAP_PX = 28;
export const REALM_PET_SIZE_PX = 84;
export const REALM_DOCK_CHIP_SIZE_PX = 56;

/** Consistent drop-shadow for text sitting directly on the scene with no
 * panel behind it — keeps it legible over any background art without
 * resorting to an opaque card. */
export const REALM_TEXT_SHADOW_SM = "0 2px 6px rgba(0,0,0,0.85)";
export const REALM_TEXT_SHADOW_LG = "0 3px 10px rgba(0,0,0,0.9)";
