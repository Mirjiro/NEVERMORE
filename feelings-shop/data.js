/*
 * Feelings Shop — all game content and tuning lives here.
 * Tweak freely: game.js reads everything from window.FS_DATA.
 */
window.FS_DATA = {
  shopName: "Feelings Shop",
  saveKey: "feelingsShop.save.v1",

  // Named colors used by pills (half A / half B)
  colors: {
    white: "#ffffff",
    yellow: "#ffd84d",
    blue: "#6fa8ff",
    deepblue: "#3a5bd9",
    mint: "#7fe0c0",
    red: "#ff6b6b",
    orange: "#ffa24d",
    pink: "#ff9ccf",
    softpink: "#ffc9dd",
    graywhite: "#e6e3ee",
    purple: "#b28cff",
    lime: "#b8f05a",
    gold: "#ffc93c",
    gray: "#b9b6c3",
  },

  // ---------------------------------------------------------------- start
  start: {
    coins: 20,
    stock: { happy: 5, sad: 5, calm: 5, angry: 5 },
  },

  config: {
    maxStock: 10,               // per pill (Bigger Shelf raises it)
    trayMax: 3,                 // finished pills the result tray can hold
    lineMax: 4,                 // customers in line (Shop Bell raises it)
    arriveMinSec: 10,           // a new customer every 10–15s while there's room
    arriveMaxSec: 15,
    firstCustomerSec: 2,
    patienceSec: 60,            // generous!
    surpriseChance: 0.1,        // ~1 in 10 customers says "Surprise me!"
    shinyChance: 0.05,          // Lucky Charm raises it
    shinyPriceMult: 3,
    shinyXpMult: 2,             // shiny sales give double XP
    exactTip: 0.5,              // +50% tip on exact match
    wrongPayMult: 0.5,          // wrong feeling pays half, no tip
    wrongXpMult: 0.5,
    discoverXp: 25,             // first time a feeling is made
    discoverShinyXp: 15,        // first time a shiny is made
    newPillGift: 3,             // free pills when a base pill unlocks
    upgradesLevel: 4,           // upgrades shop opens at this level
    reactionSec: 2.6,           // how long a reaction bubble lingers
  },

  // ---------------------------------------------------------------- base pills
  basePills: [
    { id: "happy",   name: "Happy",   colors: ["yellow", "white"], unlockLevel: 1, cost: 2 },
    { id: "sad",     name: "Sad",     colors: ["blue", "white"],   unlockLevel: 1, cost: 2 },
    { id: "calm",    name: "Calm",    colors: ["mint", "white"],   unlockLevel: 1, cost: 2 },
    { id: "angry",   name: "Angry",   colors: ["red", "white"],    unlockLevel: 1, cost: 2 },
    { id: "excited", name: "Excited", colors: ["orange", "white"], unlockLevel: 2, cost: 3 },
    { id: "love",    name: "Love",    colors: ["pink", "white"],   unlockLevel: 3, cost: 3 },
    { id: "brave",   name: "Brave",   colors: ["purple", "white"], unlockLevel: 5, cost: 4 },
    { id: "silly",   name: "Silly",   colors: ["lime", "white"],   unlockLevel: 7, cost: 4 },
  ],

  // ---------------------------------------------------------------- rarities
  rarities: {
    uncommon:  { name: "Uncommon",  price: 10,  xp: 5 },
    rare:      { name: "Rare",      price: 30,  xp: 12 },
    legendary: { name: "Legendary", price: 100, xp: 30 },
  },

  // ---------------------------------------------------------------- recipes
  // Order of the two pills does not matter.
  recipes: [
    { a: "happy",   b: "happy",   id: "giddy",       name: "Giddy",                 rarity: "uncommon",  colors: ["yellow", "orange"] },
    { a: "happy",   b: "sad",     id: "nostalgia",   name: "Nostalgia",             rarity: "uncommon",  colors: ["graywhite", "softpink"] },
    { a: "happy",   b: "calm",    id: "cozy",        name: "Cozy",                  rarity: "uncommon",  colors: ["yellow", "mint"] },
    { a: "happy",   b: "angry",   id: "sassy",       name: "Sassy",                 rarity: "uncommon",  colors: ["yellow", "red"] },
    { a: "sad",     b: "sad",     id: "dramatic",    name: "Dramatic",              rarity: "uncommon",  colors: ["deepblue", "blue"] },
    { a: "sad",     b: "calm",    id: "mellow",      name: "Mellow",                rarity: "uncommon",  colors: ["blue", "mint"] },
    { a: "sad",     b: "angry",   id: "grumpy",      name: "Grumpy",                rarity: "uncommon",  colors: ["blue", "red"] },
    { a: "calm",    b: "calm",    id: "zen",         name: "Zen",                   rarity: "uncommon",  colors: ["mint", "white"] },
    { a: "calm",    b: "angry",   id: "focused",     name: "Focused",               rarity: "uncommon",  colors: ["mint", "red"] },
    { a: "angry",   b: "angry",   id: "firedup",     name: "Fired Up",              rarity: "uncommon",  colors: ["red", "orange"] },
    { a: "happy",   b: "excited", id: "maincharacter", name: "Main Character Energy", rarity: "rare",    colors: ["gold", "orange"] },
    { a: "calm",    b: "love",    id: "sundaymorning", name: "Sunday Morning",      rarity: "rare",      colors: ["mint", "pink"] },
    { a: "excited", b: "love",    id: "butterflies", name: "Butterflies",           rarity: "rare",      colors: ["orange", "pink"] },
    { a: "brave",   b: "excited", id: "unstoppable", name: "Unstoppable",           rarity: "rare",      colors: ["purple", "orange"] },
    { a: "silly",   b: "happy",   id: "gigglefit",   name: "Giggle Fit",            rarity: "rare",      colors: ["lime", "yellow"] },
    { a: "love",    b: "love",    id: "headoverheels", name: "Head Over Heels",     rarity: "legendary", colors: ["pink", "gold"] },
    { a: "excited", b: "excited", id: "lottery",     name: "Just Won the Lottery",  rarity: "legendary", colors: ["gold", "gold"] },
    { a: "brave",   b: "silly",   id: "chaosmode",   name: "Chaos Mode",            rarity: "legendary", colors: ["purple", "lime"] },
  ],

  // Any combo not in the table
  fizzle: { id: "fizzle", name: "Fizzle", colors: ["gray", "gray"] },

  // ---------------------------------------------------------------- levels
  // xp = total XP needed to reach that level
  levels: [
    { level: 1,  xp: 0,    unlocks: [] },
    { level: 2,  xp: 50,   unlocks: ["New pill: Excited!"] },
    { level: 3,  xp: 130,  unlocks: ["New pill: Love!"] },
    { level: 4,  xp: 250,  unlocks: ["The Upgrades shop is open!"] },
    { level: 5,  xp: 420,  unlocks: ["New pill: Brave!"] },
    { level: 6,  xp: 650,  unlocks: ["Rare orders are way more common now."] },
    { level: 7,  xp: 950,  unlocks: ["New pill: Silly!"] },
    { level: 8,  xp: 1350, unlocks: ["Legendary orders show up more often."] },
    { level: 9,  xp: 1850, unlocks: ["Even more Legendary orders!"] },
    { level: 10, xp: 2500, unlocks: ["You earned the Emporium Trophy! It's in your Feelings Book."] },
  ],

  ranks: [
    { minLevel: 1, name: "Corner Counter" },
    { minLevel: 3, name: "Little Pharmacy" },
    { minLevel: 5, name: "Feelings Boutique" },
    { minLevel: 8, name: "Emotion Emporium" },
  ],

  // Order weighting by level (highest matching minLevel wins)
  orderWeights: [
    { minLevel: 1, uncommon: 10, rare: 2,  legendary: 0.4 },
    { minLevel: 6, uncommon: 10, rare: 7,  legendary: 0.8 },
    { minLevel: 8, uncommon: 10, rare: 7,  legendary: 2.5 },
    { minLevel: 9, uncommon: 10, rare: 8,  legendary: 4 },
  ],

  // ---------------------------------------------------------------- upgrades
  upgrades: [
    { id: "shelf", name: "Bigger Shelf",  icon: "🗄️", cost: 60,  desc: "Max stock per pill 10 → 20.",               effect: { maxStock: 20 } },
    { id: "luck",  name: "Lucky Charm",   icon: "🍀", cost: 150, desc: "Shiny chance 5% → 10%.",                    effect: { shinyChance: 0.1 } },
    { id: "bell",  name: "Shop Bell",     icon: "🔔", cost: 100, desc: "Line size 4 → 6, customers arrive faster.", effect: { lineMax: 6, arriveMinSec: 7, arriveMaxSec: 11 } },
    { id: "bulk",  name: "Bulk Discount", icon: "📦", cost: 120, desc: "Restock costs −1 coin per pill (min 1).",   effect: { restockDiscount: 1 } },
  ],

  // ---------------------------------------------------------------- customers
  // Hints, never the feeling's name.
  orderLines: {
    giddy:         ["I want to giggle at absolutely nothing.", "Make me feel like the last day of school!", "Bouncy. I want to be bouncy."],
    nostalgia:     ["I just found my old Game Boy. Help me feel it properly.", "Something that tastes like summers when I was 9.", "I want to look at old photos and go 'awww'."],
    cozy:          ["It's raining and I want a blanket in pill form.", "Fuzzy socks, hot cocoa, no plans. That feeling.", "Make me feel like a cat in a sunbeam."],
    sassy:         ["My group chat needs a comeback. Sharpen me.", "I want to say 'okay, and?' with my whole chest.", "Give me a hair flip in a capsule."],
    dramatic:      ["I want to stare out a rainy window like I'm in a music video.", "Give me something to sigh loudly about.", "I need to say 'fine.' and walk away slowly."],
    mellow:        ["Lo-fi beats, but as a vibe.", "I want to feel like a lazy river.", "Just... a little sleepy hammock feeling, please."],
    grumpy:        ["It's Monday. I'd like to lean into it.", "I want to complain about the weather and mean it.", "Make me a professional grump. Just for today."],
    zen:           ["My inbox has 400 emails. Make me not care.", "I want to become one with a houseplant.", "Turn my brain into a quiet pond."],
    focused:       ["Exam tomorrow. I need laser eyes.", "Help me finish ONE task without opening twelve tabs.", "Tunnel vision, but the good kind."],
    firedup:       ["Gym in 10 minutes. I need to be a menace.", "Big presentation. I want to kick the door down.", "Make me want to yell 'LET'S GO' at a toaster."],
    maincharacter: ["Walking into my ex's party. Make me iconic.", "I want slow-motion hair flips everywhere I go.", "Today the sidewalk is my runway."],
    sundaymorning: ["I want to feel like pancakes and no alarms.", "Sunlight through the curtains, but in my brain.", "Soft. Slow. Coffee. Ahh."],
    butterflies:   ["First date tonight! Make my tummy flutter.", "They texted back. I want to feel it MORE.", "I want to smile at my phone like a goof."],
    unstoppable:   ["Climbing a mountain tomorrow. Well, a big hill.", "Nothing can stop me. Not even stairs.", "I want to run through a wall. Politely."],
    gigglefit:     ["Make me laugh so hard I snort.", "I want to laugh until juice comes out my nose.", "One knock-knock joke and I want to be on the floor."],
    headoverheels: ["I want to write someone a terrible love poem.", "Make me fall in love with the whole world.", "Hearts. In my eyes. Literally, if possible."],
    lottery:       ["I want to scream and run around the parking lot.", "Feel like confetti is falling just for me.", "Make me want to buy everyone in here a donut."],
    chaosmode:     ["I want to rearrange my furniture at 3am.", "Let's put pineapple on EVERYTHING.", "No plan. Only vibes. Maximum vibes."],
  },

  surpriseLines: ["Surprise me!", "Surprise me! Dealer's choice.", "Surprise me! Something fun?", "Surprise me! I trust you."],

  // Exact-match reactions
  exactReactions: {
    giddy:         ["Hee hee! Everything is FUNNY!", "I'm skipping. I'm skipping out of here."],
    nostalgia:     ["Aww, I can smell my grandma's kitchen.", "This is exactly it. *sniff* Good sniff."],
    cozy:          ["I'm basically a burrito now. Thank you.", "Warm. Fuzzy. Perfect."],
    sassy:         ["Oh I am SO ready for that group chat.", "Okay, and? ...Wow, it works!"],
    dramatic:      ["*gazes into the distance* ...Perfect.", "I shall now sigh. Magnificently."],
    mellow:        ["Ahhh. I'm a lazy river now.", "Everything is... nice. So nice."],
    grumpy:        ["Hmph. Excellent. Hmph.", "Finally, someone gets me. Grr."],
    zen:           ["Emails? What emails?", "I am the pond. The pond is me."],
    focused:       ["Laser eyes: activated.", "Zero tabs. One task. Let's go."],
    firedup:       ["I'M GONNA LIFT THE WHOLE GYM!", "LET'S GOOOOO!"],
    maincharacter: ["Cue the slow motion. I'm iconic.", "The camera is following ME now."],
    sundaymorning: ["Is that... pancakes in my soul?", "No alarms. Only sunshine. Perfect."],
    butterflies:   ["My tummy is doing cartwheels!", "Eee! This is exactly it!"],
    unstoppable:   ["OMG I feel UNSTOPPABLE!", "Stairs? I'll take them two at a time."],
    gigglefit:     ["*snort* HAHAHA I can't breathe!", "Why is the floor so FUNNY?!"],
    headoverheels: ["I love you. I love the door. I love that chair.", "Writing a poem about this pill right now."],
    lottery:       ["AAAAAA! CONFETTI FOR EVERYONE!", "I'm buying the whole street a donut!"],
    chaosmode:     ["My couch is going on the ceiling.", "Pineapple pizza for breakfast? YES."],
  },

  surpriseReactions: ["Ooh, what a surprise! Love it.", "Ha! Didn't see that coming. 10/10.", "Mystery pill: delicious."],

  // Wrong-feeling side effects (half pay, no tip)
  wrongReactions: [
    "...why am I crying at a commercial?",
    "I feel weirdly calm about my parking ticket.",
    "Not what I asked for, but I just hugged a lamp.",
    "Hm. I now have strong opinions about spoons.",
    "I wanted something else, but I'm humming anyway.",
    "Close enough? I'm suddenly into birdwatching.",
    "Huh. I just high-fived a pigeon.",
    "I feel... something. Possibly about soup.",
    "Wrong vibe, but my plants seem happier?",
    "Okay this is odd. I want to alphabetize my socks.",
    "Not quite it, but I'm smiling at the ceiling.",
  ],

  leaveLines: ["Eh, I'll come back later!", "No rush, I'll pop back in!", "Gotta run — next time!", "I'll come back tomorrow, bye!"],

  // Feelings Book trophy (Level 10)
  trophy: { name: "Emporium Trophy", desc: "Reached Level 10 — the finest Emotion Emporium in town." },
};
