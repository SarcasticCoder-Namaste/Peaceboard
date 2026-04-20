// PeaceBrain — a fully local, "self-trained" assistant.
// No API calls. Runs entirely in the browser.
//
// Approach:
//   1. Normalize the user input.
//   2. Score every intent by keyword overlap + sentiment cues.
//   3. Pick the highest-scoring intent (with a small bias from learned feedback).
//   4. Generate a response from that intent's template pool, flavored by persona.
//   5. Remember light context (name, last mood) and learn from 👍 / 👎.
//
// Designed to feel warm, helpful, and surprisingly capable for an offline bot.

export type Persona = "friend" | "mentor" | "coach" | "guide";

export interface BrainResponse {
  text: string;
  suggestions?: string[];
  intent: string;
  confidence: number; // 0-1
}

// ─── Memory & Learning (localStorage) ─────────────────────────────────────────
const MEM_KEY = "peacebrain_memory_v1";
const LEARN_KEY = "peacebrain_learning_v1";

interface Memory {
  name?: string;
  lastMood?: string;
  recent: { intent: string; at: number }[];
}
interface Learning {
  // map intent -> {up, down} counts. Used to nudge confidence up/down.
  [intent: string]: { up: number; down: number };
}

function loadMem(): Memory {
  try { return { recent: [], ...(JSON.parse(localStorage.getItem(MEM_KEY) || "{}")) }; }
  catch { return { recent: [] }; }
}
function saveMem(m: Memory) {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch {}
}
function loadLearn(): Learning {
  try { return JSON.parse(localStorage.getItem(LEARN_KEY) || "{}"); }
  catch { return {}; }
}
function saveLearn(l: Learning) {
  try { localStorage.setItem(LEARN_KEY, JSON.stringify(l)); } catch {}
}

export function teach(intent: string, helpful: boolean) {
  const l = loadLearn();
  const cur = l[intent] || { up: 0, down: 0 };
  if (helpful) cur.up += 1; else cur.down += 1;
  l[intent] = cur;
  saveLearn(l);
}

export function getMemorySnapshot() {
  return loadMem();
}

export function resetBrain() {
  try {
    localStorage.removeItem(MEM_KEY);
    localStorage.removeItem(LEARN_KEY);
  } catch {}
}

// ─── Tokenization & Sentiment ─────────────────────────────────────────────────
function norm(s: string) {
  return s.toLowerCase().replace(/[^\w\s'’?!.-]/g, " ").replace(/\s+/g, " ").trim();
}
function tokens(s: string) {
  return norm(s).split(" ").filter(Boolean);
}

const POSITIVE = new Set([
  "good","great","awesome","amazing","love","happy","excited","wonderful","glad",
  "fantastic","cool","yay","nice","best","perfect","yes","sure","fun","proud",
]);
const NEGATIVE = new Set([
  "bad","sad","awful","terrible","hate","angry","mad","cry","crying","upset",
  "miserable","horrible","worst","no","never","hurt","pain","scared","afraid",
  "anxious","worried","stressed","tired","exhausted","lonely","alone","sick",
]);
function sentiment(text: string): number {
  let s = 0;
  for (const t of tokens(text)) {
    if (POSITIVE.has(t)) s += 1;
    if (NEGATIVE.has(t)) s -= 1;
  }
  return s;
}

// ─── Intents ──────────────────────────────────────────────────────────────────
type Responder = (ctx: { input: string; persona: Persona; mem: Memory }) => string;
interface Intent {
  id: string;
  // groups of synonyms; matching one word from each group adds score
  keywords: string[][];
  // small weight bias (e.g. safety > everything)
  weight?: number;
  respond: Responder;
  suggestions?: string[];
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Persona flavoring helpers
const flavor = (persona: Persona, base: string) => {
  switch (persona) {
    case "friend":
      return base;
    case "mentor":
      return base.replace(/!+/g, ".").replace(/[💙🤗⚡🚀🔥✨]/g, "").trim();
    case "coach":
      return base + " You've got this. 💪";
    case "guide":
      return "🌿 " + base.replace(/[💪🚀⚡]/g, "").trim();
  }
};

// ─── Skill: breathing exercise ────────────────────────────────────────────────
const breathing = () => [
  "Let's do a quick **4-7-8 breath** together.",
  "1) Breathe **in** through your nose for **4 seconds**.",
  "2) **Hold** gently for **7 seconds**.",
  "3) Breathe **out** slowly through your mouth for **8 seconds**.",
  "Repeat 3 times. I'll wait here. 🌬️",
].join("\n");

// ─── Skill: 5-4-3-2-1 grounding ───────────────────────────────────────────────
const grounding = () => [
  "Try the **5-4-3-2-1 grounding** technique with me:",
  "- **5** things you can *see*",
  "- **4** things you can *touch*",
  "- **3** things you can *hear*",
  "- **2** things you can *smell*",
  "- **1** thing you can *taste*",
  "Take your time. You're safe. 🤍",
].join("\n");

// ─── Skill: gratitude prompt ──────────────────────────────────────────────────
const gratitude = () => pick([
  "Name **3 small things** you're grateful for today — they can be tiny, like a warm drink or a kind word.",
  "Try this: finish the sentence *'Today I was lucky because…'* three times.",
  "Think of **one person** who made your day a little better. What did they do?",
]);

// ─── Skill: kindness ideas ────────────────────────────────────────────────────
const KINDNESS_IDEAS = [
  "Send a friend a quick message saying one thing you appreciate about them.",
  "Hold the door open for the next person — and smile.",
  "Write a thank-you note to a teacher or family member.",
  "Compliment someone on something they *did*, not how they look.",
  "Pick up litter you didn't drop.",
  "Sit next to someone who's eating alone.",
  "Tell a parent or guardian one thing you love about them.",
  "Offer to help a classmate with something they're stuck on.",
  "Forgive someone — even if it's just in your head.",
  "Donate clothes or books you don't use anymore.",
];
const kindnessIdea = () => `Here are 3 ideas:\n- ${[pick(KINDNESS_IDEAS), pick(KINDNESS_IDEAS), pick(KINDNESS_IDEAS)].filter((v,i,a) => a.indexOf(v)===i).join("\n- ")}`;

// ─── Skill: affirmations ──────────────────────────────────────────────────────
const AFFIRMATIONS = [
  "You are doing better than you think.",
  "Your feelings are valid — every single one of them.",
  "You don't have to be perfect to be enough.",
  "Small steps still move you forward.",
  "It's okay to rest. Rest is productive too.",
  "You are allowed to take up space.",
  "Mistakes are evidence that you're trying.",
  "You are worthy of kindness — including from yourself.",
  "The hardest moments often grow the strongest people.",
  "You don't have to figure it all out today.",
];
const affirmation = () => `💛 *${pick(AFFIRMATIONS)}*`;

// ─── Skill: jokes ─────────────────────────────────────────────────────────────
const JOKES = [
  "Why don't scientists trust atoms? Because they make up everything! 😄",
  "I told my computer I needed a break, and now it won't stop sending me KitKat ads. 🍫",
  "Why did the math book look sad? It had too many problems. 📘",
  "Parallel lines have so much in common… it's a shame they'll never meet. 📐",
  "I would tell you a UDP joke, but you might not get it. 📡",
  "Why did the bicycle fall over? It was two-tired. 🚲",
];
const joke = () => pick(JOKES);

// ─── Tiny safe math evaluator (for trivial arithmetic) ───────────────────────
function tryMath(s: string): string | null {
  // Accept only digits, spaces, and the basic operators
  const expr = s.replace(/[xX]/g, "*").replace(/÷/g, "/").replace(/[^0-9+\-*/().\s]/g, "");
  if (!/[0-9]/.test(expr) || !/[+\-*/]/.test(expr)) return null;
  // refuse anything weird/long
  if (expr.length > 60) return null;
  try {
    // eslint-disable-next-line no-new-func
    const v = Function(`"use strict"; return (${expr});`)();
    if (typeof v === "number" && isFinite(v)) {
      return `That's **${Math.round(v * 1000) / 1000}**.`;
    }
  } catch {}
  return null;
}

// ─── Intent definitions ───────────────────────────────────────────────────────
const INTENTS: Intent[] = [
  // SAFETY — highest priority
  {
    id: "safety",
    weight: 5,
    keywords: [
      ["suicide","kill","end","die","dying","unalive"],
      ["myself","life","it","everything","alive"],
    ],
    respond: () =>
      "I hear you, and I'm really glad you reached out. What you're feeling sounds heavy, " +
      "and you don't have to carry it alone. Please talk to someone you trust right now — " +
      "a parent, teacher, school counselor, or call/text a crisis line in your country " +
      "(in the US: **988**, in the UK: **116 123**, in India: **iCall 9152987821**). " +
      "Your life matters. Will you reach out to one safe person today? 🤍",
    suggestions: ["I have someone I can talk to", "I don't know who to talk to", "Tell me a calming exercise"],
  },
  {
    id: "self_harm",
    weight: 5,
    keywords: [["hurt","cut","harm"], ["myself","me"]],
    respond: () =>
      "I'm really sorry you're hurting that much. You deserve care, not pain. " +
      "Please tell a trusted adult (parent, teacher, counselor) right now, or contact a helpline " +
      "(US **988**, UK **116 123**, India **iCall 9152987821**). " +
      "While you wait — try holding an ice cube tightly, or take 10 slow breaths with me. " +
      "I'm here. 🤍",
    suggestions: ["Help me do a breathing exercise", "Help me ground myself", "What else can I try?"],
  },

  // GREETINGS
  {
    id: "greeting",
    keywords: [["hi","hello","hey","yo","hiya","sup","heya","howdy","greetings"]],
    respond: ({ persona, mem }) => {
      const name = mem.name ? `, ${mem.name}` : "";
      return flavor(persona, pick([
        `Hey${name}! Lovely to see you. How are you feeling today?`,
        `Hi${name}! 👋 What's on your mind?`,
        `Hello${name}! I'm here whenever you need me — what's up?`,
      ]));
    },
    suggestions: ["I'm doing okay", "I had a rough day", "I want to feel calm"],
  },
  {
    id: "farewell",
    keywords: [["bye","goodbye","cya","later","gotta","ttyl"]],
    respond: ({ persona }) => flavor(persona, pick([
      "Take care of yourself — I'm here whenever you need me. 👋",
      "Bye for now! Be kind to yourself today. 🌿",
      "See you soon. Drink some water and breathe deeply. 💧",
    ])),
  },
  {
    id: "thanks",
    keywords: [["thanks","thank","thx","ty","appreciate"]],
    respond: ({ persona }) => flavor(persona, pick([
      "Anytime. I'm really glad I could help. 💙",
      "Of course! That's what I'm here for.",
      "You're welcome. You did the hard part — showing up. 🌟",
    ])),
  },
  {
    id: "compliment",
    keywords: [["love","like","awesome","best","amazing","cool","favorite"], ["you","bot","peace"]],
    respond: ({ persona }) => flavor(persona, pick([
      "Aw, that means a lot. 💙 You're pretty amazing yourself.",
      "Thank you! Right back at you — you brighten this little corner of the internet.",
      "You're so kind. I'm cheering for you, always.",
    ])),
  },

  // IDENTITY
  {
    id: "identity_self",
    keywords: [["who","what"], ["you","your"], ["are","name"]],
    respond: () =>
      "I'm **Peace** — a friendly assistant built right into PeaceBoard. I run **fully on your device** (no internet AI needed), so our chats stay private. I can listen, share calming exercises, suggest kindness ideas, help with feelings, and more.",
    suggestions: ["What can you do?", "Help me feel calm", "Give me a kindness idea"],
  },
  {
    id: "identity_user",
    keywords: [["my","what"], ["name","i"], ["am","is"]],
    respond: ({ mem }) =>
      mem.name
        ? `You're **${mem.name}** — at least, that's what you told me. Want to update it? Just say *'My name is …'*`
        : "I don't know your name yet. If you want, just say *'My name is …'* and I'll remember it (only on this device).",
  },
  {
    id: "set_name",
    keywords: [["my"], ["name"], ["is"]],
    respond: ({ input, mem }) => {
      const m = norm(input).match(/my name is ([a-z][a-z'’\-]{1,20})/i);
      if (m) {
        mem.name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
        saveMem(mem);
        return `Lovely to meet you, **${mem.name}**! I'll remember that. 💙`;
      }
      return "Tell me again — say *'My name is …'* and I'll remember it.";
    },
  },
  {
    id: "capabilities",
    keywords: [["what","help"], ["can","do","you"]],
    respond: () => [
      "I can help with a lot, all on your device:",
      "- **Listen** when you're sad, anxious, angry, or just need to vent",
      "- Guide a **breathing** or **grounding** exercise",
      "- Share **kindness ideas** for the day",
      "- Offer **affirmations** when you're being hard on yourself",
      "- Talk through **friendship**, **family**, or **school** stuff",
      "- Tell a quick **joke** or do simple **math** 🙂",
      "Just say what's on your mind — or tap a quick reply below.",
    ].join("\n"),
    suggestions: ["I'm feeling anxious", "Give me an affirmation", "Tell me a joke"],
  },

  // FEELINGS
  {
    id: "mood_sad",
    keywords: [["sad","down","blue","depressed","unhappy","miserable","crying","cried","empty","heartbroken","gloomy","low"]],
    respond: ({ persona, mem }) => {
      mem.lastMood = "sad"; saveMem(mem);
      return flavor(persona, pick([
        "I'm really sorry you're feeling this way. Sadness is heavy — and you don't have to push it away. Want to tell me what's behind it, or would you rather we do something gentle together?",
        "That sounds hard. 💙 Whatever happened, your feelings make sense. Would it help to talk it out, or to try a small grounding exercise?",
        "Sitting with sadness takes courage. I'm right here. Do you want to share what's hurting, or just be quiet for a moment together?",
      ]));
    },
    suggestions: ["I want to talk about it", "Help me feel calmer", "Give me an affirmation"],
  },
  {
    id: "mood_anxious",
    keywords: [["anxious","anxiety","nervous","worried","worry","stressed","stress","panic","panicking","overwhelmed","scared","afraid"]],
    respond: ({ persona, mem }) => {
      mem.lastMood = "anxious"; saveMem(mem);
      return flavor(persona, [
        "I hear you. Anxiety can make everything feel bigger than it is. Let's slow it down together.",
        "",
        breathing(),
      ].join("\n"));
    },
    suggestions: ["Try the 5-4-3-2-1 exercise", "Why am I anxious?", "Give me an affirmation"],
  },
  {
    id: "mood_angry",
    keywords: [["angry","mad","furious","pissed","annoyed","frustrated","irritated","rage"]],
    respond: ({ persona, mem }) => {
      mem.lastMood = "angry"; saveMem(mem);
      return flavor(persona, pick([
        "Anger is honest — it usually means something matters. Want to tell me what's behind it? Sometimes naming it shrinks it.",
        "I get it. Frustration deserves space too. Try this: take **3 long exhales**, longer than your inhales. Then tell me what set this off.",
        "That sounds really frustrating. Before we problem-solve, let's let the storm pass a bit. Want to do a quick breath together?",
      ]));
    },
    suggestions: ["Help me cool down", "Someone hurt me", "Tell me a joke"],
  },
  {
    id: "mood_happy",
    keywords: [["happy","excited","joyful","amazing","great","wonderful","fantastic","love it","yay"]],
    respond: ({ persona, mem }) => {
      mem.lastMood = "happy"; saveMem(mem);
      return flavor(persona, pick([
        "Yes!! 🎉 I love hearing this. Tell me — what made today feel good?",
        "That's beautiful. Hold onto this feeling — maybe even write it down. ✨",
        "Amazing! 💙 What do you want to do with this great energy?",
      ]));
    },
    suggestions: ["Tell me what to do with this energy", "Save this in my diary", "Give me a kindness idea"],
  },
  {
    id: "mood_lonely",
    keywords: [["lonely","alone","isolated","no friends","no one","ignored","left out"]],
    respond: ({ persona, mem }) => {
      mem.lastMood = "lonely"; saveMem(mem);
      return flavor(persona, pick([
        "Loneliness is such a quiet kind of heavy. I'm really glad you said something. You're not invisible to me — what's been going on?",
        "Feeling alone doesn't mean you *are* alone. Even reaching out here is a brave little act of connection. Want to tell me more?",
        "That hurts, and it's more common than people admit. Let's start small — is there one person you used to feel close to?",
      ]));
    },
    suggestions: ["Help me make a friend", "Give me an affirmation", "Suggest a kindness I can do"],
  },
  {
    id: "mood_tired",
    keywords: [["tired","exhausted","drained","sleepy","burned out","burnt out","no energy"]],
    respond: ({ persona }) => flavor(persona, [
      "Tiredness is a signal, not a flaw. Your brain and body are asking for kindness. Some ideas:",
      "- Drink a glass of water 💧",
      "- Step outside for 60 seconds of fresh air 🌳",
      "- Stretch your neck and shoulders gently",
      "- Aim to be in bed 30 minutes earlier tonight",
      "What's pulling at your energy lately?",
    ].join("\n")),
    suggestions: ["I can't sleep", "I have too much homework", "Give me an affirmation"],
  },

  // TOPICS
  {
    id: "topic_friend",
    keywords: [["friend","friends","friendship","bestie","buddy"]],
    respond: ({ persona }) => flavor(persona, pick([
      "Friendships are tricky and beautiful. Tell me what's going on — is it about getting closer with someone, a misunderstanding, or feeling left out?",
      "I'd love to help. What's happening with your friend? Sometimes saying it out loud reveals the next step.",
    ])),
    suggestions: ["We had a fight", "I want new friends", "I feel left out"],
  },
  {
    id: "topic_bully",
    keywords: [["bully","bullied","bullying","mean to me","picking on","harass"]],
    respond: () => [
      "I'm really sorry. Bullying is **never your fault**, and you deserve to feel safe. A few things to try:",
      "- Tell a **trusted adult** today — a parent, teacher, or counselor. This is bigger than you should carry alone.",
      "- **Save evidence** if it happens online (screenshots).",
      "- Try not to be alone with the person. Stay near friends or staff.",
      "- Remember: their behavior says everything about *them*, nothing about *you*.",
      "Want help thinking about who to tell?",
    ].join("\n"),
    suggestions: ["Help me decide who to tell", "Give me an affirmation", "It's online bullying"],
  },
  {
    id: "topic_family",
    keywords: [["family","mom","dad","mum","mother","father","parent","sibling","brother","sister"]],
    respond: ({ persona }) => flavor(persona, pick([
      "Family stuff carries a lot of weight. What's happening — a fight, feeling unheard, or something else?",
      "I hear you. Even loving families get tangled. Tell me what's going on, and we'll think it through together.",
    ])),
    suggestions: ["We had an argument", "They don't listen to me", "I feel pressured"],
  },
  {
    id: "topic_school",
    keywords: [["school","class","teacher","homework","exam","test","study","grade","grades","quiz"]],
    respond: ({ persona }) => flavor(persona, pick([
      "School can pile up fast. Tell me what's heaviest — workload, a teacher, a test, or how you're feeling about it?",
      "Got it. Want help breaking the workload into smaller steps, or do you want to vent first?",
    ])),
    suggestions: ["Help me break it into steps", "I'm scared of failing", "I'm tired of school"],
  },
  {
    id: "topic_break",
    keywords: [["break","breaking","steps","plan"], ["into","down","up"]],
    respond: () => [
      "Let's break it down. Try the **2-minute rule**:",
      "1) Pick the **smallest** next thing (e.g. *open the textbook*).",
      "2) Set a timer for **2 minutes** — promise to stop after.",
      "3) Almost always, you'll keep going. If not, that's still progress!",
      "Then chunk the rest into **20-minute blocks** with **5-minute breaks**.",
      "What's the smallest thing you could start with right now?",
    ].join("\n"),
    suggestions: ["I started", "I'm still stuck", "Give me an affirmation"],
  },
  {
    id: "topic_sleep",
    keywords: [["sleep","insomnia","awake","cant sleep","can't sleep","tossing","nightmare"]],
    respond: () => [
      "Sleep struggles are exhausting (literally). A few things that help:",
      "- Put your phone **across the room** 30 min before bed.",
      "- Try a **warm shower** — the cool-down afterward helps you fall asleep.",
      "- Do **box breathing**: in 4, hold 4, out 4, hold 4. Repeat 6 times.",
      "- If your mind is racing, write the thoughts on paper to *park* them.",
      "Want me to walk you through a calming exercise?",
    ].join("\n"),
    suggestions: ["Yes, walk me through one", "My mind is racing", "Try the breathing exercise"],
  },
  {
    id: "topic_self_esteem",
    keywords: [["worthless","ugly","stupid","useless","hate myself","loser","not good enough","failure"]],
    respond: ({ persona }) => flavor(persona, [
      "Hey — please be gentle with yourself. The voice telling you those things is *not* the truth, even when it's loud.",
      "",
      affirmation(),
      "",
      "Try this with me: name **one** small thing you did this week that took effort. Anything counts — getting out of bed, helping someone, finishing a task.",
    ].join("\n")),
    suggestions: ["Give me another affirmation", "Help me see my strengths", "I want to feel calm"],
  },

  // SKILLS (explicitly requested)
  {
    id: "skill_breathing",
    keywords: [["breath","breathing","breathe","calm me","calm down"]],
    respond: () => breathing(),
    suggestions: ["Try grounding instead", "Give me an affirmation", "I feel a bit better"],
  },
  {
    id: "skill_grounding",
    keywords: [["ground","grounding","5 4 3 2 1","panic","overwhelmed"]],
    respond: () => grounding(),
    suggestions: ["Help me with breathing", "Give me an affirmation", "Why does this work?"],
  },
  {
    id: "skill_gratitude",
    keywords: [["grateful","gratitude","thankful","thanks for life"]],
    respond: () => gratitude(),
    suggestions: ["Save this in my diary", "Give me a kindness idea", "I want an affirmation"],
  },
  {
    id: "skill_kindness",
    keywords: [["kind","kindness","help others","good deed","pay it forward","do something nice"]],
    respond: () => kindnessIdea(),
    suggestions: ["Give me 3 more ideas", "An idea for school", "An idea for home"],
  },
  {
    id: "skill_affirmation",
    keywords: [["affirmation","motivate","motivation","encourage","encouragement","boost","pep talk"]],
    respond: () => affirmation(),
    suggestions: ["Another one", "Tell me a joke", "Give me a kindness idea"],
  },
  {
    id: "skill_joke",
    keywords: [["joke","funny","laugh","make me smile"]],
    respond: () => joke(),
    suggestions: ["Another joke", "Give me an affirmation", "I want to feel calm"],
  },

  // UTILITY
  {
    id: "time",
    keywords: [["time","clock","hour"], ["what","whats","what's","tell"]],
    respond: () => `It's **${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}** right now.`,
  },
  {
    id: "date",
    keywords: [["date","day","today"], ["what","whats","what's","is"]],
    respond: () => `Today is **${new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}**.`,
  },
  {
    id: "weather",
    keywords: [["weather","raining","sunny","forecast"]],
    respond: () => "I can't actually check the sky from here 🌥️ — but whatever it's doing out there, what matters is how you feel inside. How's the weather *in your head* today?",
    suggestions: ["Sunny ☀️", "Cloudy ⛅", "Stormy ⛈️"],
  },
];

// ─── Scoring ──────────────────────────────────────────────────────────────────
function scoreIntent(intent: Intent, toks: string[], text: string): number {
  let score = 0;
  let groupsHit = 0;
  for (const group of intent.keywords) {
    let hit = false;
    for (const kw of group) {
      // multi-word keyword?
      if (kw.includes(" ")) {
        if (text.includes(kw)) { score += 2; hit = true; }
      } else if (toks.includes(kw)) {
        score += 1; hit = true;
      }
    }
    if (hit) groupsHit++;
  }
  if (intent.keywords.length > 1 && groupsHit < intent.keywords.length) {
    // require all groups to hit at least once for multi-group intents
    score = score * 0.4;
  }
  if (groupsHit === 0) return 0;
  score *= intent.weight ?? 1;
  return score;
}

// ─── Reflective fallback ──────────────────────────────────────────────────────
function fallback(input: string, persona: Persona, mem: Memory): string {
  const sent = sentiment(input);
  const toks = tokens(input);
  const isQuestion = /\?$/.test(input.trim()) || /^(what|why|how|when|where|who|can|do|does|is|are|will|should)\b/i.test(input);
  const subject =
    toks.find(t => ["work","school","family","friend","mom","dad","life","this","that","everything","day"].includes(t)) ||
    "this";

  if (isQuestion) {
    return flavor(persona, pick([
      `That's a great question. I don't have all the answers, but here's how I'd think about it: what would you tell a friend who asked you the same thing? Sometimes our advice for others *is* our advice for us.`,
      `Hmm — let's unpack it. What about ${subject} feels most uncertain right now?`,
      `Great question. Try this: write down what you already know, what you don't, and what would help you decide. Want me to think through it with you?`,
    ]));
  }
  if (sent <= -2) {
    return flavor(persona, pick([
      `That sounds really heavy. I'm here. Do you want to keep talking about it, or try something to feel a little lighter?`,
      `I'm sorry, ${mem.name || "friend"}. You don't have to fix it all in one moment. What feels like the smallest next step?`,
    ]));
  }
  if (sent >= 2) {
    return flavor(persona, pick([
      `Love that energy! Tell me more — what's making it feel good?`,
      `Yes! 🎉 What do you want to do with this momentum?`,
    ]));
  }
  return flavor(persona, pick([
    `Tell me a bit more — I want to make sure I understand. What's happening with ${subject}?`,
    `I hear you. What would feel most helpful right now: talking it out, a calming exercise, or just being heard?`,
    `Got it. What's the *feeling* underneath that, if you had to name it in one word?`,
  ]));
}

// ─── Main entry ──────────────────────────────────────────────────────────────
export function ask(rawInput: string, opts: { persona: Persona }): BrainResponse {
  const input = rawInput.trim();
  if (!input) {
    return { text: "I'm listening. What's on your mind?", intent: "empty", confidence: 1 };
  }

  // Math shortcut
  const m = tryMath(input);
  if (m) return { text: m, intent: "math", confidence: 1, suggestions: ["Tell me a joke", "Give me an affirmation", "Help me with school"] };

  const mem = loadMem();
  const learn = loadLearn();
  const text = norm(input);
  const toks = tokens(input);

  let best: { intent: Intent; score: number } | null = null;
  for (const it of INTENTS) {
    const raw = scoreIntent(it, toks, text);
    if (raw <= 0) continue;
    const fb = learn[it.id] || { up: 0, down: 0 };
    const bias = 1 + (fb.up * 0.05) - (fb.down * 0.07);
    const score = raw * Math.max(0.4, bias);
    if (!best || score > best.score) best = { intent: it, score };
  }

  // Track recency to avoid repeating same intent
  if (best) {
    const last = mem.recent[mem.recent.length - 1];
    if (last && last.intent === best.intent.id && Date.now() - last.at < 5000) {
      // light decay, but still pick it; we'll vary the response via random pick()
    }
  }

  let intentId: string;
  let text2: string;
  let suggestions: string[] | undefined;
  let confidence: number;

  if (best && best.score >= 1) {
    intentId = best.intent.id;
    text2 = best.intent.respond({ input, persona: opts.persona, mem });
    suggestions = best.intent.suggestions;
    confidence = Math.min(1, best.score / 5);
  } else {
    intentId = "fallback";
    text2 = fallback(input, opts.persona, mem);
    suggestions = ["I'm feeling anxious", "Tell me a joke", "Give me an affirmation"];
    confidence = 0.35;
  }

  // Update memory
  mem.recent = [...mem.recent, { intent: intentId, at: Date.now() }].slice(-12);
  saveMem(mem);

  return { text: text2, intent: intentId, confidence, suggestions };
}
