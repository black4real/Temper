// Recall rules, ported from the Ghost Mode Mac app (RecallLibrary). Shown as one rotating
// rule on Today: a new rule every RECALL_DAYS days, keyed to the day of the cycle so it is
// the same all day and on every device. No notifications or schedules (those stay out).

export type RecallCategory = "Self-control" | "Awareness" | "Communication" | "Execution" | "Thinking";

export type RecallRule = {
  id: string;
  title: string;
  category: RecallCategory;
  explanation: string;
  practice: string;
  whyItMatters: string;
};

/** How many days each rule stays up before the next one. */
export const RECALL_DAYS = 3;

export const RECALL_RULES: RecallRule[] = [
  {
    id: "pause-before-react",
    title: "Pause before you react.",
    category: "Self-control",
    explanation:
      "Your first reaction is often automatic. You don't have to act on it immediately. A pause gives you time to decide how you actually want to respond.",
    practice:
      "The next time something triggers an immediate emotional response, wait two full seconds before speaking or typing.",
    whyItMatters:
      "The goal isn't to suppress your reaction. The goal is to create a conscious gap between reaction and action.",
  },
  {
    id: "ask-before-assume",
    title: "Ask before you assume.",
    category: "Communication",
    explanation:
      "Assumptions are stories your brain invents to fill gaps in information. Most misunderstandings occur because people treat assumptions as confirmed facts.",
    practice:
      "Whenever you catch yourself guessing someone's motive or tone, ask a clarifying question before drawing conclusions.",
    whyItMatters: "Clarity eliminates manufactured conflict and preserves emotional energy.",
  },
  {
    id: "do-next-useful-thing",
    title: "Do the next useful thing.",
    category: "Execution",
    explanation:
      "When overwhelmed by the total size of a problem, planning the entire solution is paralyzing. You only ever need to identify and execute the single next step.",
    practice:
      "When feeling stuck, ask: “What is the single most useful action I can complete in the next 5 minutes?” Then do only that.",
    whyItMatters: "Action dissolves anxiety. Momentum is built by stringing tiny useful steps together.",
  },
  {
    id: "make-it-easier",
    title: "Make it easier to do the right thing.",
    category: "Execution",
    explanation:
      "Willpower is a finite resource. If doing the right thing requires high friction, you will eventually stop doing it. Design systems that reduce friction for good habits.",
    practice: "Identify one habit you struggle to keep. Remove two friction steps required to start it.",
    whyItMatters: "Consistency is not about discipline; it is about architecture and environmental design.",
  },
  {
    id: "say-less-notice-more",
    title: "Say less. Notice more.",
    category: "Awareness",
    explanation:
      "When you are constantly thinking about what to say next, you stop observing reality. High-leverage insights come from quiet observation, not constant noise.",
    practice:
      "In your next conversation, let the other person speak without interrupting. Wait 1 second after they finish before speaking.",
    whyItMatters: "You cannot learn anything new while your mouth is moving.",
  },
  {
    id: "slow-down-high-stakes",
    title: "Slow down when the stakes are high.",
    category: "Self-control",
    explanation:
      "Urgency creates tunnel vision. High-stakes moments provoke rushed decisions that feel efficient but lead to catastrophic errors.",
    practice:
      "Whenever a situation feels urgent and tense, deliberately slow down your breathing and speech cadence by 30%.",
    whyItMatters: "Speed without precision is just amplified mistake-making.",
  },
  {
    id: "motion-vs-progress",
    title: "Don't confuse motion with progress.",
    category: "Execution",
    explanation:
      "Motion is being busy: organizing folders, tweaking color themes, endlessly researching. Progress is completing the core deliverable that moves the needle.",
    practice: "Ask yourself: “If this is the only thing I accomplish today, will it actually matter?”",
    whyItMatters:
      "Motion feels comfortable because it has no risk of failure. Progress demands confronting difficult work.",
  },
  {
    id: "clarity-from-action",
    title: "Clarity comes from action.",
    category: "Thinking",
    explanation:
      "You cannot think your way into clarity about a complex problem. You only discover what works by producing output, getting feedback, and adapting.",
    practice: "Build an ugly, imperfect 10-minute prototype before debating whether the idea is good.",
    whyItMatters: "Action generates real data. Thinking only generates speculative models.",
  },
  {
    id: "listen-to-understand",
    title: "Listen to understand, not to reply.",
    category: "Communication",
    explanation:
      "Most people listen only long enough to construct their rebuttal or share their own story. Listening deeply means grasping the other person's mental model.",
    practice: "Repeat back what you understood in your own words before adding your perspective.",
    whyItMatters: "People cooperate when they feel understood, not when they are out-argued.",
  },
  {
    id: "focus-on-controllables",
    title: "Focus only on what you can control.",
    category: "Thinking",
    explanation:
      "Suffering comes from attempting to control outcomes, other people, or luck. Peace and power come from focusing exclusively on your preparation, effort, and attitude.",
    practice:
      "Draw two columns on paper: “Things I can control” and “Things I cannot”. Cross out the second column.",
    whyItMatters:
      "Directing energy into uncontrollables produces helplessness. Directing it into controllables produces agency.",
  },
  {
    id: "environment-does-work",
    title: "Make the environment do the work.",
    category: "Execution",
    explanation:
      "Relying on self-restraint while surrounded by distractions is a losing strategy. Alter physical and digital spaces so focus is default.",
    practice: "Remove one recurring distraction from your line of sight or home screen right now.",
    whyItMatters: "The strongest discipline is never having to fight temptation in the first place.",
  },
  {
    id: "never-attribute-malice",
    title: "Don't attribute to malice what is explained by ignorance.",
    category: "Thinking",
    explanation:
      "When someone hurts or inconveniences you, the human brain defaults to assuming malicious intent. Usually, they were simply distracted, tired, or uninformed.",
    practice: "Adopt Hanlon's Razor: assume benign incompetence or distraction before assuming hostility.",
    whyItMatters: "Assuming goodwill protects your peace of mind and prevents unnecessary retaliation.",
  },
  {
    id: "win-the-morning",
    title: "Win the first hour of your day.",
    category: "Execution",
    explanation:
      "The first hour sets the emotional and cognitive tone for all subsequent hours. Giving it away to social media or email surrenders control of your day.",
    practice: "Keep your first 30 minutes after waking screen-free: hydrate, move, and clarify your 1 primary goal.",
    whyItMatters: "If you control your morning, you control your momentum.",
  },
  {
    id: "accept-reality-first",
    title: "Accept reality before trying to fix it.",
    category: "Awareness",
    explanation:
      "Wishing that something didn't happen wastes precious problem-solving energy. Complete acceptance of the current fact is prerequisite to smart action.",
    practice: "When hit by unexpected bad news, say aloud: “It is what it is. Now what?”",
    whyItMatters: "Denial multiplies pain. Acceptance clears the field for effective action.",
  },
  {
    id: "keep-the-standard",
    title: "How you do anything is how you do everything.",
    category: "Self-control",
    explanation:
      "Small compromises in discipline degrade the overall standard. High performance is not an on-off switch; it is an ingrained standard applied to small and large tasks alike.",
    practice:
      "Take 60 seconds to finish any small task completely and neatly, whether washing a dish or naming a code variable.",
    whyItMatters: "Excellence is an everyday habit, not an occasional act.",
  },
  {
    id: "respond-dont-react",
    title: "Respond thoughtfully instead of reacting impulsively.",
    category: "Self-control",
    explanation:
      "A reaction is emotional, instinctive, and short-sighted. A response is reasoned, guided by your values, and oriented toward long-term outcomes.",
    practice: "When criticized, thank the person for the perspective, sleep on it, and respond the next day.",
    whyItMatters: "Your reputation is built on how you handle friction, not how you handle praise.",
  },
  {
    id: "cut-the-noise",
    title: "Subtract before you add.",
    category: "Thinking",
    explanation:
      "When systems or lives feel cluttered, people mistakenly look for more tools, apps, or habits. True improvement almost always comes from eliminating the non-essential.",
    practice: "Look at your weekly schedule and remove or delegate one low-value recurring commitment.",
    whyItMatters: "Simplicity scales. Complexity fails.",
  },
  {
    id: "default-to-honesty",
    title: "Speak clearly and state the simple truth.",
    category: "Communication",
    explanation:
      "Beating around the bush or offering polite half-truths wastes time and breeds resentment. Direct, kind truth-telling builds deep trust and quick resolution.",
    practice: "Give a direct “No” with polite brevity rather than leading people on with false hope.",
    whyItMatters: "Clear is kind. Unclear is unkind.",
  },
];

/** The rule for a day of the cycle, plus the span of days it covers. */
export function recallForDay(dayNumber: number): { rule: RecallRule; firstDay: number; lastDay: number } {
  const block = Math.floor((Math.max(1, dayNumber) - 1) / RECALL_DAYS);
  const rule = RECALL_RULES[block % RECALL_RULES.length];
  const firstDay = block * RECALL_DAYS + 1;
  return { rule, firstDay, lastDay: firstDay + RECALL_DAYS - 1 };
}
