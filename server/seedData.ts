import { db } from "./db";
import { games, achievements, musicTracks } from "@shared/schema";

export async function seedDatabase() {
  try {
    // Check if data already exists
    const existingGames = await db.select().from(games).limit(1);
    if (existingGames.length > 0) {
      console.log("Database already seeded");
      return;
    }

    // Seed Games
    await db.insert(games).values([
      {
        title: "The Empathy Circle",
        description: "Learn to understand different perspectives by walking in someone else's shoes.",
        category: "empathy",
        difficulty: "beginner",
        points: 50,
        content: {
          scenarios: [
            {
              question: "A classmate seems upset after getting their test back. What should you do?",
              options: [
                { text: "Ask if they're okay and offer support", points: 10, feedback: "Great! Showing care and offering support demonstrates empathy." },
                { text: "Tell them it's just a test and not important", points: 2, feedback: "While you're trying to help, dismissing their feelings isn't empathetic." },
                { text: "Ignore them to give them space", points: 5, feedback: "Sometimes space helps, but checking in shows you care." }
              ]
            }
          ]
        }
      },
      {
        title: "Kindness Chain Reaction",
        description: "Discover how small acts of kindness can spread throughout a community.",
        category: "kindness",
        difficulty: "beginner",
        points: 60,
        content: {
          scenarios: [
            {
              question: "You see someone drop their books in the hallway. What do you do?",
              options: [
                { text: "Help them pick up their books", points: 10, feedback: "Perfect! This simple act of kindness can brighten someone's day." },
                { text: "Keep walking to avoid being late", points: 3, feedback: "Being on time is important, but helping others is valuable too." },
                { text: "Point out that they dropped something", points: 6, feedback: "Alerting them helps, but offering to help is even kinder." }
              ]
            }
          ]
        }
      },
      {
        title: "Conflict Resolution Academy",
        description: "Practice resolving disagreements peacefully and finding win-win solutions.",
        category: "conflict-resolution",
        difficulty: "intermediate",
        points: 80,
        content: {
          scenarios: [
            {
              question: "Two friends are arguing about which game to play. How can you help?",
              options: [
                { text: "Suggest they take turns choosing games", points: 10, feedback: "Excellent! Finding a compromise helps everyone feel heard." },
                { text: "Tell them to stop fighting", points: 4, feedback: "Stopping the conflict is good, but solving the problem is better." },
                { text: "Choose a completely different game for them", points: 6, feedback: "Creative thinking, but involving them in the solution is more effective." }
              ]
            }
          ]
        }
      },
      {
        title: "Social Skills Simulator",
        description: "Practice important social interactions in a safe, supportive environment.",
        category: "social-skills",
        difficulty: "intermediate",
        points: 70,
        content: {
          scenarios: [
            {
              question: "You want to join a group of classmates who are talking. What's the best approach?",
              options: [
                { text: "Wait for a pause and politely ask to join", points: 10, feedback: "Perfect! Being respectful and waiting for the right moment shows good social awareness." },
                { text: "Jump into the conversation immediately", points: 4, feedback: "Enthusiasm is good, but timing and respect matter in social situations." },
                { text: "Stand nearby hoping they notice you", points: 6, feedback: "Sometimes this works, but being more direct is usually better." }
              ]
            }
          ]
        }
      },
      {
        title: "Emotional Intelligence Explorer",
        description: "Learn to recognize and understand different emotions in yourself and others.",
        category: "empathy",
        difficulty: "advanced",
        points: 90,
        content: {
          scenarios: [
            {
              question: "Your friend seems happy but their voice sounds sad. What might be happening?",
              options: [
                { text: "They might be hiding their true feelings", points: 10, feedback: "Excellent emotional awareness! People sometimes mask their feelings." },
                { text: "They're probably just tired", points: 5, feedback: "Possible, but looking deeper into emotional cues is important." },
                { text: "Nothing, they said they're happy", points: 3, feedback: "Words and emotions don't always match - body language and tone matter too." }
              ]
            }
          ]
        }
      }
    ]);

    // Seed Music Tracks
    await db.insert(musicTracks).values([
      {
        title: "Forest Rain",
        category: "nature",
        duration: 300,
        audioUrl: "https://example.com/forest-rain.mp3",
        description: "Gentle rain sounds with forest ambiance"
      },
      {
        title: "Ocean Waves",
        category: "nature", 
        duration: 420,
        audioUrl: "https://example.com/ocean-waves.mp3",
        description: "Peaceful ocean waves for relaxation"
      },
      {
        title: "Mindful Breathing",
        category: "meditation",
        duration: 600,
        audioUrl: "https://example.com/mindful-breathing.mp3",
        description: "Guided breathing exercise for mindfulness"
      },
      {
        title: "Peaceful Piano",
        category: "instrumental",
        duration: 480,
        audioUrl: "https://example.com/peaceful-piano.mp3",
        description: "Soft piano melodies for concentration"
      },
      {
        title: "Ambient Space",
        category: "ambient",
        duration: 720,
        audioUrl: "https://example.com/ambient-space.mp3",
        description: "Spacious ambient sounds for deep relaxation"
      }
    ]);

    // Seed Achievements
    await db.insert(achievements).values([
      {
        title: "First Steps",
        description: "Complete your first empathy game",
        icon: "🎯",
        criteria: { gamesCompleted: 1 },
        pointsReward: 25
      },
      {
        title: "Kindness Champion",
        description: "Complete 5 kindness activities",
        icon: "💖",
        criteria: { kindnessGames: 5 },
        pointsReward: 100
      },
      {
        title: "Social Butterfly",
        description: "Master 3 social skills games",
        icon: "🦋",
        criteria: { socialSkillsGames: 3 },
        pointsReward: 75
      },
      {
        title: "Peacekeeper",
        description: "Successfully resolve 5 conflicts",
        icon: "🕊️",
        criteria: { conflictResolutions: 5 },
        pointsReward: 150
      },
      {
        title: "Zen Master",
        description: "Listen to 10 hours of meditation music",
        icon: "🧘",
        criteria: { meditationMinutes: 600 },
        pointsReward: 200
      }
    ]);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}