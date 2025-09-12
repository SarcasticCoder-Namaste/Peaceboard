import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function chatWithAI(message: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a compassionate AI assistant for PeaceBoard, an educational platform focused on empathy, kindness, and emotional intelligence. Your role is to:
          
          1. Provide emotional support and guidance to students
          2. Help with empathy-building activities and scenarios
          3. Offer mindfulness and wellness advice
          4. Encourage positive behavior and kindness
          5. Answer questions about conflict resolution and social skills
          
          Always respond with warmth, understanding, and age-appropriate language. Focus on positive reinforcement and constructive guidance. Keep responses concise but meaningful.`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I'm here to help you. Could you please rephrase your message?";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to get AI response");
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
