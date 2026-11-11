/**
 * Final pill artwork registry.
 * Put transparent PNG/WebP files in public/pills/ (e.g. public/pills/happy.png) and map them here:
 *   happy: "pills/happy.png",
 * Any pill without an entry uses the procedural placeholder in src/ui/components/PillArt.tsx.
 */
export const PILL_ART: Partial<Record<string, string>> = {};
