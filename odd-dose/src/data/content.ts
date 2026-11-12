/** ODD DOSE — flavor content for the Desk: senders, requests, news, mail. */
import type { Rarity } from "../engine/types";

export interface Sender {
  name: string;
  kind: "Customer" | "Private client" | "Company" | "Researcher" | "University" | "Hospital" | "Government" | "Anonymous" | "Organization";
  payoutMult: number;
}

export const SENDERS: Sender[] = [
  { name: "Mrs. Ottoline Pratt", kind: "Customer", payoutMult: 1 },
  { name: "Dev from 4B", kind: "Customer", payoutMult: 0.95 },
  { name: "A Very Tired Dad", kind: "Customer", payoutMult: 1 },
  { name: "Juniper Vale", kind: "Private client", payoutMult: 1.1 },
  { name: "Mr. Castellane", kind: "Private client", payoutMult: 1.15 },
  { name: "Brightline Logistics", kind: "Company", payoutMult: 1.2 },
  { name: "Hollow Oak Coffee Co.", kind: "Company", payoutMult: 1.05 },
  { name: "Mintwell Advertising", kind: "Company", payoutMult: 1.2 },
  { name: "Dr. Imogen Sato", kind: "Researcher", payoutMult: 1.15 },
  { name: "Prof. Lionel Abernathy", kind: "Researcher", payoutMult: 1.1 },
  { name: "Grayford University, Dept. of Feelings", kind: "University", payoutMult: 1.1 },
  { name: "St. Clement's Night Ward", kind: "Hospital", payoutMult: 1.15 },
  { name: "Ministry of Public Mood", kind: "Government", payoutMult: 1.25 },
  { name: "The Weather Office (Morale Div.)", kind: "Government", payoutMult: 1.2 },
  { name: "Society of Very Small Theaters", kind: "Organization", payoutMult: 1.05 },
  { name: "The Midnight Bowling League", kind: "Organization", payoutMult: 1 },
];

export const ANONYMOUS_SENDERS: Sender[] = [
  { name: "— (no name given)", kind: "Anonymous", payoutMult: 1.3 },
  { name: "A Client Who Prefers Discretion", kind: "Anonymous", payoutMult: 1.35 },
  { name: "Room 7, Hotel Lisbeth", kind: "Anonymous", payoutMult: 1.3 },
  { name: "The Gentleman in Gray", kind: "Anonymous", payoutMult: 1.4 },
];

/** Short, memorable order titles keyed by the main requested pill's first Type. */
export const ORDER_TITLES: Record<string, string[]> = {
  happy: ["A Little Happiness", "Sunshine, Please", "Smile Supply", "Good Mood Delivery"],
  sad: ["A Good Cry", "Rainy Day Kit", "For the Blues", "Sad Songs Only"],
  angry: ["Righteous Fury", "Hot Under the Collar", "Grr, Urgently", "Let Off Steam"],
  calm: ["Deep Breath", "Quiet Afternoon", "Slow Down", "Still Waters"],
  fear: ["Spooky Season", "Goosebumps Wanted", "A Little Scared", "Things in the Dark"],
  excited: ["Big Day!", "Let's Gooo", "Party Starter", "Can't Sit Still"],
};

/** One short, characterful line from the requester. No pill lists — the checklist shows those. */
export const ORDER_LINES: Record<Sender["kind"], string[]> = {
  Customer: [
    "It's my birthday tomorrow. I could use some cheering up.",
    "My week has been a lot.",
    "The 7:42 train is unbearable.",
    "My cat has been judging me.",
    "First day at a new job!",
  ],
  "Private client": [
    "I hear you're discreet.",
    "An important dinner is coming up.",
    "Wrap it nicely, please.",
  ],
  Company: [
    "For our team offsite. Mark the box 'NOT SNACKS'.",
    "Morale is low. The memo says 'fix it'.",
    "Quarterly review is Friday.",
  ],
  Researcher: [
    "For a study. Very serious. Mostly.",
    "My hypothesis needs feelings.",
    "Clean samples, please.",
  ],
  University: ["For the spring seminar on feelings.", "The students are restless."],
  Hospital: ["The night ward is running low.", "For the long shifts."],
  Government: ["Under Directive 12-B (Morale).", "For the public holiday."],
  Anonymous: [
    "No questions. Burn this note.",
    "I know what your Machine can do.",
    "Leave it at the usual place.",
  ],
  Organization: ["Our members voted.", "For the big tournament."],
};

export const FRONTIER_HINT_LINES = [
  "Word is it carries a {types} character.",
  "Supposedly it's made from two pills you already know. Its Types: {types}.",
  "The client says it 'feels {types}'.",
];

export const REACTIONS = {
  thanks: [
    "Arrived in perfect condition. The whole office is in a much better mood. — {sender}",
    "Received with thanks. We will absolutely be ordering again. — {sender}",
    "Exactly as described. Five stars, would feel again. — {sender}",
    "Our results were... unusual, in the best way. Thank you. — {sender}",
  ],
  confidential: [
    "Received. You did not see me. — {sender}",
    "Satisfactory. There may be more work for you soon. — {sender}",
  ],
};

export const NEWSPAPERS = {
  mastheads: ["The Morning Dose", "Evening Pharmacist", "The Grayford Courier", "Weekly Mood Report"],
  ambient: [
    { title: "City reports 14% rise in spontaneous humming", body: "Experts are baffled; local bakeries delighted." },
    { title: "Rainy week drives record demand for Calm", body: "Shops report umbrellas and sage-green tablets selling out together." },
    { title: "Mayor denies taking 'a Pride or two' before speech", body: "The speech was, observers agree, very confident." },
    { title: "Collectors gather for annual Tablet Fair", body: "A ★★ Common reportedly changed hands for an eye-watering sum." },
    { title: "University study: Bittersweet 'best enjoyed at sunset'", body: "Peer review is ongoing, and slightly emotional." },
    { title: "Local cat appears 'unbothered', scientists say", body: "No pills involved. The cat was simply like that." },
    { title: "Opinion: Love is NOT a Common pill and we should stop pretending", body: "The columnist received forty letters. Most agreed." },
    { title: "Rumor: a pill that tastes like absolutely Nothing", body: "Underground traders whisper about it. Nobody can describe it, by definition." },
    { title: "Bowling league wins tournament 'in a Flow state'", body: "Team captain credits 'good shoes and a better pharmacy'." },
  ],
};

export const MAIL_TEMPLATES: { name: string; seller: string; blurb: string; pulls: number; priceEach: number; identified: boolean; odds: Record<Rarity, number> }[] = [
  { name: "Standard Sealed Shipment", seller: "Crestline Pharma Surplus", blurb: "One sealed, labeled tablet from a reputable wholesaler.", pulls: 1, priceEach: 180, identified: true, odds: { common: 60, rare: 25, epic: 10, legendary: 4, secret: 1 } },
  { name: "Triple Seal Crate", seller: "Crestline Pharma Surplus", blurb: "Three sealed, labeled tablets. Slight bulk discount.", pulls: 3, priceEach: 165, identified: true, odds: { common: 60, rare: 25, epic: 10, legendary: 4, secret: 1 } },
  { name: "Clearance Bag", seller: "Mo's Discount Chemist", blurb: "Mostly the basics. Mostly.", pulls: 3, priceEach: 60, identified: true, odds: { common: 85, rare: 14, epic: 1, legendary: 0, secret: 0 } },
  { name: "Collector's Envelope", seller: "Halberd & Finch Auctions", blurb: "A single curated tablet. Better odds, higher price.", pulls: 1, priceEach: 520, identified: true, odds: { common: 25, rare: 40, epic: 25, legendary: 8, secret: 2 } },
  { name: "Unlabeled Parcel", seller: "Sender unknown", blurb: "No label. No return address. Something rattles inside. Contents arrive unidentified (?).", pulls: 2, priceEach: 120, identified: false, odds: { common: 40, rare: 35, epic: 18, legendary: 6, secret: 1 } },
];

export const WELCOME = {
  title: "Welcome to ODD DOSE",
  body:
    "Congratulations on your new company. You have six Common pills, one Machine, and one Copier.\n\n" +
    "• LAB — put two pills in the Machine and press START. Parents come back; you get one new pill.\n" +
    "• VAULT — copy any Known pill in batches with the Copier.\n" +
    "• DESK — open order files, tick the checklist, stamp the sticker, SHIP.\n" +
    "• HQ — spend Cash on Machines, Copier upgrades, the Scanner and more.\n\n" +
    "Your NOTEBOOK collects clues automatically. Good luck. — The Board",
};
