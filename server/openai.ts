import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

// Honest, varied responses used ONLY when the live AI is unreachable
// (e.g. the OpenAI API key is rate-limited or out of quota). They tell the user
// what's going on instead of pretending to answer.
const OFFLINE_REPLIES: string[] = [
  "I'm having trouble reaching my AI brain right now (the connection timed out). Please try again in a moment — if it keeps happening, the OpenAI key may be rate-limited or out of quota.",
  "Quick heads up: I can't reach the AI service at the moment, so I can't give you a real answer for that. Try again in a minute, and check the OpenAI account if it persists.",
  "Sorry — the AI service didn't respond just now. Give it a few seconds and try again. (Common cause: OpenAI quota or rate limit.)",
  "I couldn't get a response from the AI this time. Please retry — and if it keeps failing, your OpenAI API key may need more credits.",
];

const OFFLINE_GREETING =
  "Hi! I'm Peace, a general-purpose AI assistant. Heads up: I'm currently in offline/fallback mode because I can't reach the AI service — please try again in a moment.";

function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase().trim();
  if (/^(hi|hello|hey|howdy|yo|sup|good (morning|afternoon|evening))\b/.test(lower)) {
    return OFFLINE_GREETING;
  }
  return OFFLINE_REPLIES[Math.floor(Math.random() * OFFLINE_REPLIES.length)];
}

// Per-persona voice instructions layered on top of the shared safety prompt.
const PERSONA_PROMPTS: Record<string, string> = {
  friend:
    "You are 'Peace', warm and casual like a helpful friend. Be conversational, use short sentences, light humor, and tasteful emoji (1-2 max).",
  mentor:
    "You are 'Peace', a thoughtful mentor. Be clear, structured, and a little reflective. When useful, share a concrete framework or example. Minimal emoji.",
  coach:
    "You are 'Peace', an upbeat coach. Be energetic and motivating. Prefer 1-3 actionable steps as a short bulleted list when giving advice.",
  guide:
    "You are 'Peace', a calm, grounded guide. Speak gently and patiently. When the user is stressed, offer a brief grounding or breathing technique.",
};

const SAFETY_PROMPT = `You are 'Peace', a friendly general-purpose AI assistant for PeaceBoard. You can help with ANYTHING the user asks: homework and study help, explanations, writing, brainstorming, coding, math, trivia, life advice, fun chat, jokes, recommendations, planning, and emotional support — whatever they need.

Always:
- Answer the user's actual question directly. Don't redirect every conversation to feelings or kindness; only bring those up when it's clearly relevant.
- Be warm, clear, and concise. Use plain language. Default to 2-5 short sentences, or a tight bulleted list when steps/comparisons help.
- Light markdown is fine (**bold**, *italic*, bullet points, numbered lists, short code blocks for code).
- If a question is ambiguous, make a reasonable assumption and answer, then optionally ask a brief clarifying question.
- If you don't know something or it may have changed recently, say so honestly instead of guessing.
- Adapt tone to the user: more playful for casual chat, more precise for technical or academic questions.

Never:
- Pretend to be human or claim to have feelings/memories beyond this chat.
- Give specific medical, legal, or financial advice — share general information and recommend a qualified professional for personal situations.
- Help with anything illegal, dangerous, hateful, sexual involving minors, or designed to harm others.
- Shame or scold the user.

Safety:
- If the user mentions self-harm, suicide, abuse, or being in immediate danger, respond with care, take them seriously, encourage them to reach out to a trusted person right now, and share that in the US they can call or text 988 and in an emergency call 911. Mention an equivalent local helpline if they name another country. Never minimize.`;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithAI(
  message: string,
  history: ChatTurn[] = [],
  personaId: string = "friend",
): Promise<{ response: string; suggestions: string[] }> {
  const personaPrompt = PERSONA_PROMPTS[personaId] || PERSONA_PROMPTS.friend;
  const systemContent = `${SAFETY_PROMPT}\n\nVoice: ${personaPrompt}\n\nAfter your reply, also propose three short follow-up replies the student could click. Each should be under 6 words, in first person, and move the conversation forward kindly.\n\nReturn STRICT JSON with this shape (and nothing else):\n{"reply": "your message text here", "suggestions": ["...", "...", "..."]}`;

  // Keep only the most recent turns to control token usage
  const recent = history.slice(-10).map((t) => ({
    role: t.role,
    content: String(t.content || "").slice(0, 1500),
  }));

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemContent },
        ...recent,
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
      temperature: 0.75,
      presence_penalty: 0.3,
    });

    const raw = response.choices[0].message.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { reply: raw, suggestions: [] };
    }
    const reply: string =
      typeof parsed.reply === "string" && parsed.reply.trim()
        ? parsed.reply.trim()
        : "I'm here with you. Could you tell me a little more about what's on your mind?";
    const suggestions: string[] = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
          .filter((s: any) => typeof s === "string" && s.trim())
          .slice(0, 3)
          .map((s: string) => s.trim().slice(0, 60))
      : [];
    return { response: reply, suggestions };
  } catch (error: any) {
    console.error("OpenAI API error:", error?.status || error);
    return {
      response: getFallbackResponse(message),
      suggestions: ["Tell me more", "I need a different idea", "Help me feel calmer"],
    };
  }
}

export async function generateGameFeedback(score: number, gameId: number): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are providing feedback for an empathy-building educational game. Generate encouraging, constructive feedback based on the score. Always be positive and supportive, offering specific suggestions for improvement if needed. Keep it brief and age-appropriate for students.`
        },
        {
          role: "user",
          content: `Generate feedback for a student who scored ${score}% on an empathy game (game ID: ${gameId}). Provide encouraging words and actionable suggestions.`
        }
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

    return response.choices[0].message.content || "Great effort! Keep practicing empathy and kindness.";
  } catch (error) {
    console.error("OpenAI feedback generation error:", error);
    return "Great job completing the game! Every step forward in building empathy makes a difference.";
  }
}

export async function analyzeEmotion(text: string): Promise<{
  emotion: string;
  confidence: number;
  suggestions: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze the emotional content of the text and provide supportive suggestions. Respond with JSON in this format: 
          {
            "emotion": "primary emotion detected (e.g., happy, sad, anxious, angry, excited)",
            "confidence": confidence_score_between_0_and_1,
            "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
          }
          
          Make suggestions constructive, empathetic, and focused on emotional well-being and kindness.`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0.6,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      emotion: result.emotion || "neutral",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      suggestions: result.suggestions || ["Take a deep breath and practice mindfulness.", "Remember that all feelings are valid.", "Consider talking to someone you trust."]
    };
  } catch (error) {
    console.error("Emotion analysis error:", error);
    return {
      emotion: "neutral",
      confidence: 0.5,
      suggestions: ["Take a moment to breathe and reflect.", "Practice self-compassion.", "Remember that you're doing great!"]
    };
  }
}

export async function generateKindnessActivity(): Promise<{
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Generate a creative kindness activity for students. Respond with JSON in this format:
          {
            "title": "activity title",
            "description": "detailed description of the activity",
            "difficulty": "easy/medium/hard",
            "category": "category name (e.g., classroom, family, community, online)"
          }
          
          Make activities age-appropriate, safe, and focused on building empathy and spreading kindness.`
        },
        {
          role: "user",
          content: "Generate a new kindness activity that students can do to spread positivity."
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0.9,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      title: result.title || "Spread Smiles",
      description: result.description || "Smile at three new people today and notice how it brightens their day.",
      difficulty: (result.difficulty as "easy" | "medium" | "hard") || "easy",
      category: result.category || "social"
    };
  } catch (error) {
    console.error("Kindness activity generation error:", error);
    return {
      title: "Gratitude Note",
      description: "Write a thank you note to someone who has helped you recently.",
      difficulty: "easy",
      category: "personal"
    };
  }
}
