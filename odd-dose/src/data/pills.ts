/**
 * ODD DOSE — the canonical 49-pill catalog and 43 registered recipes.
 * Names, rarities and recipes are canonical. Do not rename or move pills.
 * Types are NOT written by hand: they are inherited through the full recipe ancestry.
 */
import type { EmotionType, PillDef, PillFace, Rarity } from "../engine/types";
import { EMOTION_TYPES } from "../engine/types";

interface RawPill {
  id: string;
  name: string;
  rarity: Rarity;
  parents?: [string, string];
  color: string;
  color2: string;
  face: PillFace;
  flavor: string;
}

const f = (eyes: PillFace["eyes"], mouth: PillFace["mouth"], brows?: PillFace["brows"]): PillFace => ({ eyes, mouth, brows });

const RAW: RawPill[] = [
  // ------------------------------------------------------------ COMMON (6) — the six Types
  { id: "happy", name: "Happy", rarity: "common", color: "#E8B83E", color2: "#C9962A", face: f("happy", "smile"), flavor: "The original sunshine tablet. Pressed with a grin." },
  { id: "sad", name: "Sad", rarity: "common", color: "#7EA2CB", color2: "#5E80A8", face: f("sad", "frown", "worried"), flavor: "Soft blue and a little heavy for its size." },
  { id: "angry", name: "Angry", rarity: "common", color: "#C8553D", color2: "#A23E2A", face: f("angry", "zigzag", "angry"), flavor: "Warm to the touch. Do not shake." },
  { id: "calm", name: "Calm", rarity: "common", color: "#8DB79E", color2: "#6C9880", face: f("closed", "smile"), flavor: "Sage green. Smells faintly of rain on stone." },
  { id: "fear", name: "Fear", rarity: "common", color: "#9C92B8", color2: "#7A7098", face: f("wide", "wave", "worried"), flavor: "Pale lilac. Rattles slightly when nobody is looking." },
  { id: "excited", name: "Excited", rarity: "common", color: "#EC8A3B", color2: "#C96C22", face: f("star", "grin", "raised"), flavor: "Bright orange and impossible to keep in the bottle." },

  // ------------------------------------------------------------ RARE (15)
  { id: "bittersweet", name: "Bittersweet", rarity: "rare", parents: ["happy", "sad"], color: "#D9B98A", color2: "#7EA2CB", face: f("closed", "smirk"), flavor: "Tastes like the last day of summer." },
  { id: "pride", name: "Pride", rarity: "rare", parents: ["happy", "angry"], color: "#D99A3A", color2: "#A6402C", face: f("line", "smirk", "raised"), flavor: "Stands a little taller in the blister pack." },
  { id: "zen", name: "Zen", rarity: "rare", parents: ["happy", "calm"], color: "#C9CF8E", color2: "#8DB79E", face: f("closed", "flat"), flavor: "Perfectly level. Always lands face up." },
  { id: "thrill", name: "Thrill", rarity: "rare", parents: ["happy", "fear"], color: "#E3A86A", color2: "#9C92B8", face: f("wide", "grin"), flavor: "The top of the rollercoaster, compressed." },
  { id: "euphoria", name: "Euphoria", rarity: "rare", parents: ["happy", "excited"], color: "#F2B640", color2: "#EC8A3B", face: f("star", "open"), flavor: "Glows faintly in a dark pocket." },
  { id: "bitter", name: "Bitter", rarity: "rare", parents: ["sad", "angry"], color: "#8A6A78", color2: "#5E4652", face: f("line", "frown", "angry"), flavor: "Holds a grudge against the pill next to it." },
  { id: "melancholy", name: "Melancholy", rarity: "rare", parents: ["sad", "calm"], color: "#7FA6A8", color2: "#5B8486", face: f("closed", "frown"), flavor: "Best taken while looking out a window." },
  { id: "despair", name: "Despair", rarity: "rare", parents: ["sad", "fear"], color: "#5F6E93", color2: "#434E6E", face: f("sad", "o", "worried"), flavor: "Sinks in water. Sinks in everything." },
  { id: "manic", name: "Manic", rarity: "rare", parents: ["sad", "excited"], color: "#C47E9B", color2: "#7EA2CB", face: f("spiral", "teeth"), flavor: "Two moods enter. Both leave very fast." },
  { id: "focus", name: "Focus", rarity: "rare", parents: ["calm", "angry"], color: "#7E9C7A", color2: "#C8553D", face: f("dot", "flat", "angry"), flavor: "Engraved with a face that is clearly busy." },
  { id: "brave", name: "Brave", rarity: "rare", parents: ["fear", "angry"], color: "#B0614E", color2: "#9C92B8", face: f("angry", "smile", "angry"), flavor: "Shaking, but going anyway." },
  { id: "violent", name: "Violent", rarity: "rare", parents: ["excited", "angry"], color: "#D8452E", color2: "#EC8A3B", face: f("x", "teeth", "angry"), flavor: "Shipped in a padded envelope for everyone's safety." },
  { id: "numb", name: "Numb", rarity: "rare", parents: ["calm", "fear"], color: "#A9ADB3", color2: "#8A8F96", face: f("line", "none"), flavor: "Engraving so faint you have to tilt it to the light." },
  { id: "flow", name: "Flow", rarity: "rare", parents: ["calm", "excited"], color: "#6FB7A8", color2: "#EC8A3B", face: f("closed", "grin"), flavor: "Time goes missing around this one." },
  { id: "shock", name: "Shock", rarity: "rare", parents: ["fear", "excited"], color: "#E7D45A", color2: "#9C92B8", face: f("wide", "o", "raised"), flavor: "The engraving is mid-gasp." },

  // ------------------------------------------------------------ EPIC (20)
  { id: "enlightenment", name: "Enlightenment", rarity: "epic", parents: ["zen", "shock"], color: "#F1E6B8", color2: "#D8B44A", face: f("closed", "smile", "raised"), flavor: "A tiny halo is pressed into the rim." },
  { id: "heroism", name: "Heroism", rarity: "epic", parents: ["brave", "flow"], color: "#3E6FB0", color2: "#D8452E", face: f("dot", "smile", "angry"), flavor: "Comes with a very small cape-shaped score line." },
  { id: "awesome", name: "Awesome", rarity: "epic", parents: ["zen", "violent"], color: "#E25F3E", color2: "#C9CF8E", face: f("star", "grin"), flavor: "Calmly, deliberately, extremely loud." },
  { id: "ego", name: "Ego", rarity: "epic", parents: ["pride", "despair"], color: "#B88A3C", color2: "#434E6E", face: f("line", "smirk", "raised"), flavor: "Its engraving is a mirror. It is looking at itself." },
  { id: "trance", name: "Trance", rarity: "epic", parents: ["numb", "euphoria"], color: "#C7A6E0", color2: "#F2B640", face: f("spiral", "flat"), flavor: "Do not stare at the coating for too long." },
  { id: "melodrama", name: "Melodrama", rarity: "epic", parents: ["bittersweet", "violent"], color: "#B23A5A", color2: "#D9B98A", face: f("sad", "open", "worried"), flavor: "Sighs audibly when the bottle is opened." },
  { id: "psycho", name: "Psycho", rarity: "epic", parents: ["manic", "brave"], color: "#9E2F4D", color2: "#E7D45A", face: f("spiral", "teeth", "angry"), flavor: "The engraving changes when you blink. Probably." },
  { id: "nostalgia", name: "Nostalgia", rarity: "epic", parents: ["melancholy", "thrill"], color: "#D6A98C", color2: "#7FA6A8", face: f("closed", "smirk"), flavor: "Smells like a cassette tape and summer camp." },
  { id: "obsession", name: "Obsession", rarity: "epic", parents: ["focus", "despair"], color: "#4E5B4A", color2: "#5F6E93", face: f("wide", "flat", "angry"), flavor: "Has counted every other pill in the vault. Twice." },
  { id: "triumph", name: "Triumph", rarity: "epic", parents: ["pride", "numb"], color: "#D7B24A", color2: "#A9ADB3", face: f("happy", "grin", "raised"), flavor: "Pressed with a laurel wreath around the edge." },
  { id: "epiphany", name: "Epiphany", rarity: "epic", parents: ["focus", "thrill"], color: "#F4D35E", color2: "#7E9C7A", face: f("wide", "open", "raised"), flavor: "A single bright fleck sits in the center." },
  { id: "disgust", name: "Disgust", rarity: "epic", parents: ["bitter", "numb"], color: "#8C9A4A", color2: "#5E4652", face: f("line", "wave", "angry"), flavor: "Turns slightly away from whoever holds it." },
  { id: "mania", name: "Mania", rarity: "epic", parents: ["bitter", "thrill"], color: "#E0483F", color2: "#E3A86A", face: f("spiral", "grin", "raised"), flavor: "Vibrates at a frequency only dogs approve of." },
  { id: "panic", name: "Panic", rarity: "epic", parents: ["shock", "bitter"], color: "#E8E3D3", color2: "#D8452E", face: f("wide", "zigzag", "worried"), flavor: "Packaged with extra cotton. It insisted." },
  { id: "ecstasy", name: "Ecstasy", rarity: "epic", parents: ["euphoria", "melancholy"], color: "#E98DB8", color2: "#7FA6A8", face: f("closed", "open"), flavor: "Pearlescent coating that shifts pink to teal." },
  { id: "love", name: "Love", rarity: "epic", parents: ["flow", "bittersweet"], color: "#E06A86", color2: "#F4C5CF", face: f("heart", "smile"), flavor: "Not a Common pill, no matter what the songs say." },
  { id: "toxic", name: "Toxic", rarity: "epic", parents: ["melancholy", "violent"], color: "#7DBB3C", color2: "#4E2E4A", face: f("x", "smirk"), flavor: "Charming at first. Then the coating starts to fizz." },
  { id: "ruin", name: "Ruin", rarity: "epic", parents: ["despair", "violent"], color: "#5B3A35", color2: "#D8452E", face: f("x", "frown", "angry"), flavor: "Arrives already cracked, and proud of it." },
  { id: "overdrive", name: "Overdrive", rarity: "epic", parents: ["manic", "focus"], color: "#2F8F8A", color2: "#EC8A3B", face: f("dot", "teeth", "raised"), flavor: "Runs warm. Hums at 7,000 RPM." },
  { id: "void", name: "Void", rarity: "epic", parents: ["zen", "despair"], color: "#2A2C3A", color2: "#5F6E93", face: f("void", "none"), flavor: "The engraving goes deeper than the tablet is thick." },

  // ------------------------------------------------------------ LEGENDARY (6)
  { id: "divined", name: "Divined", rarity: "legendary", parents: ["enlightenment", "awesome"], color: "#F6EBC8", color2: "#C9A13B", face: f("star", "smile", "raised"), flavor: "Gilded rim. Seems to know what you want before you do." },
  { id: "ruthless", name: "Ruthless", rarity: "legendary", parents: ["heroism", "triumph"], color: "#24324F", color2: "#C9A13B", face: f("line", "flat", "angry"), flavor: "Navy enamel with a gold edge. Does not negotiate." },
  { id: "nothing", name: "Nothing", rarity: "legendary", parents: ["ruin", "disgust"], color: "#D9D6CF", color2: "#9C9890", face: f("void", "none"), flavor: "Plain, blank, and somehow the heaviest pill in the room." },
  { id: "evil", name: "Evil", rarity: "legendary", parents: ["psycho", "mania"], color: "#5C0F1E", color2: "#C9A13B", face: f("angry", "grin", "angry"), flavor: "Kept in its own little box. With a lock." },
  { id: "nirvana", name: "Nirvana", rarity: "legendary", parents: ["ecstasy", "love"], color: "#F3D9E6", color2: "#9FD7CF", face: f("closed", "smile"), flavor: "Translucent outer shell over a soft rose core." },
  { id: "possessed", name: "Possessed", rarity: "legendary", parents: ["trance", "obsession"], color: "#3B2F5C", color2: "#9AE36B", face: f("spiral", "open", "worried"), flavor: "Something inside the coating moves slowly." },

  // ------------------------------------------------------------ SECRET (2)
  { id: "immortal", name: "Immortal", rarity: "secret", parents: ["divined", "nothing"], color: "#F7F1DE", color2: "#E3B341", face: f("closed", "smirk", "raised"), flavor: "Ivory and gold. Nobody remembers it being made." },
  { id: "oblivion", name: "Oblivion", rarity: "secret", parents: ["nirvana", "ruthless"], color: "#121218", color2: "#8C7CF0", face: f("void", "flat"), flavor: "Absorbs the light around it. Handle with tongs." },
];

// ---------------------------------------------------------------- type inheritance
function computeTypes(raw: RawPill[]): Map<string, EmotionType[]> {
  const byId = new Map(raw.map((p) => [p.id, p]));
  const memo = new Map<string, EmotionType[]>();
  const visit = (id: string, stack: Set<string>): EmotionType[] => {
    const cached = memo.get(id);
    if (cached) return cached;
    const p = byId.get(id);
    if (!p) throw new Error(`Unknown pill in recipe: ${id}`);
    if (stack.has(id)) throw new Error(`Recipe cycle at ${id}`);
    let types: EmotionType[];
    if (!p.parents) {
      if (!EMOTION_TYPES.includes(p.id as EmotionType)) throw new Error(`Base pill ${id} is not a Type`);
      types = [p.id as EmotionType];
    } else {
      stack.add(id);
      const set = new Set<EmotionType>([...visit(p.parents[0], stack), ...visit(p.parents[1], stack)]);
      stack.delete(id);
      types = EMOTION_TYPES.filter((t) => set.has(t)); // canonical order
    }
    memo.set(id, types);
    return types;
  };
  raw.forEach((p) => visit(p.id, new Set()));
  return memo;
}

const TYPES = computeTypes(RAW);

export const PILLS: PillDef[] = RAW.map((p) => ({ ...p, types: TYPES.get(p.id)! }));
export const PILL_BY_ID: Record<string, PillDef> = Object.fromEntries(PILLS.map((p) => [p.id, p]));
export const PILL_IDS = PILLS.map((p) => p.id);
export const COMMON_IDS = PILLS.filter((p) => p.rarity === "common").map((p) => p.id);

export function pillsOfRarity(r: Rarity): PillDef[] {
  return PILLS.filter((p) => p.rarity === r);
}

export const TYPE_LABEL: Record<EmotionType, string> = {
  happy: "Happy", sad: "Sad", angry: "Angry", calm: "Calm", fear: "Fear", excited: "Excited",
};
export const TYPE_COLOR: Record<EmotionType, string> = {
  happy: "#E8B83E", sad: "#7EA2CB", angry: "#C8553D", calm: "#8DB79E", fear: "#9C92B8", excited: "#EC8A3B",
};
export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary", secret: "Secret",
};
