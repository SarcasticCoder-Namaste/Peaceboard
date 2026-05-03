import { db } from "./db";
import { games, musicTracks } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const COMPREHENSIVE_GAMES = [
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
            { text: "Ask if they're okay and offer support", points: 10, feedback: "Great! Showing care and offering support demonstrates true empathy. You noticed their feelings and responded with kindness." },
            { text: "Tell them it's just a test and not important", points: 3, feedback: "While you meant well, dismissing someone's feelings isn't empathetic. Their emotions are valid even if the situation seems small to you." },
            { text: "Ignore them to give them space", points: 5, feedback: "Sometimes space helps, but checking in first shows you care. You can always give space after asking." }
          ]
        },
        {
          question: "Your friend is crying because their pet is sick. You don't have pets, so you don't fully understand. What do you do?",
          options: [
            { text: "Say 'I may not fully understand, but I'm here for you'", points: 10, feedback: "Perfect! Acknowledging your limits while still offering support is genuine empathy. You don't have to experience something to care about it." },
            { text: "Say 'It's just an animal, you'll get over it'", points: 0, feedback: "This minimizes their feelings deeply. Pets are beloved family members to many people, and their grief is very real." },
            { text: "Tell them about a time you were sad too", points: 4, feedback: "Sharing your experience can help, but right now your friend needs to feel heard, not redirected to your feelings." }
          ]
        },
        {
          question: "A new student looks completely lost in the hallway between classes. What do you do?",
          options: [
            { text: "Approach them, introduce yourself, and offer to help", points: 10, feedback: "Excellent! You put yourself in their shoes and took action. Being new is overwhelming, and your kindness will be remembered." },
            { text: "Wait to see if someone else helps them first", points: 4, feedback: "Everyone waiting for someone else to act means nobody acts. Taking the first step is what makes the difference." },
            { text: "Point them in the right direction without stopping", points: 6, feedback: "Helpful, but walking with them or introducing yourself would have made them feel much more welcome." }
          ]
        },
        {
          question: "During a group game, one student is left out and standing on the sidelines. How do you respond?",
          options: [
            { text: "Pause the game and invite them to join", points: 10, feedback: "Wonderful! You recognized exclusion and took concrete action to fix it. This is empathy in its most powerful form." },
            { text: "Feel bad but keep playing since the game is going well", points: 3, feedback: "Feeling empathy is the start, but acting on it is what truly helps. The discomfort of pausing is worth the connection you create." },
            { text: "Ask a friend to go invite them while you keep playing", points: 7, feedback: "Delegating kindness still creates kindness! Though including them yourself would have felt more personal." }
          ]
        },
        {
          question: "Your teammate makes an error that costs your team the game. The team looks frustrated. What do you say?",
          options: [
            { text: "'We play as a team — wins and losses are shared. You did your best.'", points: 10, feedback: "Outstanding! You showed emotional leadership. Mistakes hurt more when we feel alone in them — your words lifted everyone." },
            { text: "'You should have practiced more.'", points: 0, feedback: "This adds shame to an already painful moment. Blame never improves performance — support does." },
            { text: "Say nothing, just give them a supportive nod", points: 6, feedback: "Non-verbal empathy is real empathy! Sometimes a nod speaks louder than words, though verbal support adds even more." }
          ]
        },
        {
          question: "A friend shares exciting news about a hobby you find boring. They're glowing with excitement. How do you respond?",
          options: [
            { text: "Match their enthusiasm and ask questions to learn more", points: 10, feedback: "This is empathy in action! You set aside your own preferences to celebrate what matters to them. This is what deepens friendships." },
            { text: "Say 'Cool' and change the subject", points: 2, feedback: "Your lack of interest deflates their joy. Even if you don't share the passion, you can share in their happiness." },
            { text: "Smile and say 'Tell me more — you seem really happy about this!'", points: 9, feedback: "Nearly perfect! You acknowledged their emotion explicitly, which makes people feel truly seen." }
          ]
        },
        {
          question: "You notice a classmate has been quiet and withdrawn for several days. What do you do?",
          options: [
            { text: "Find a private moment and gently ask if everything is okay", points: 10, feedback: "You paid attention and took caring action. Checking in privately shows real sensitivity — not all struggles are meant for public discussion." },
            { text: "Assume they prefer to be alone and leave them be", points: 4, feedback: "Assumptions can leave people feeling invisible. A gentle check-in respects their choice — they can always say 'I'm fine, thanks.'" },
            { text: "Ask loudly in front of the class if they're alright", points: 2, feedback: "Good intention, but the public setting may embarrass them or make them feel put on the spot. Private conversations work much better." }
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
            { text: "Stop and help them pick up their books", points: 10, feedback: "Perfect! This simple act of kindness can brighten someone's entire day. Your 30 seconds means the world to them." },
            { text: "Keep walking since you don't want to be late", points: 3, feedback: "Being on time matters, but a 30-second kindness is worth it. Most teachers appreciate brief explanations too." },
            { text: "Point out they dropped something but keep walking", points: 5, feedback: "Alerting them helps, but offering to help would have completed the kindness chain. Half-kindness is still kindness though!" }
          ]
        },
        {
          question: "A classmate forgot their lunch and looks embarrassed. You have extra food. What do you do?",
          options: [
            { text: "Quietly offer to share your food with them", points: 10, feedback: "This is kindness at its finest — you noticed a need, acted without making them feel worse, and shared what you had. Beautiful." },
            { text: "Tell the teacher so they can sort it out", points: 6, feedback: "Good thinking to get help! Though offering your own food first would have been faster and more personal." },
            { text: "Ignore it — it's not your problem", points: 0, feedback: "Small moments of unkindness leave real marks. Kindness is always a choice, and you had the power to make a positive one." }
          ]
        },
        {
          question: "You receive a thank-you card from someone you helped weeks ago. What do you do next?",
          options: [
            { text: "Feel inspired and look for someone else to help today", points: 10, feedback: "You just continued the kindness chain! Kindness multiplies when it inspires more kindness. This is exactly how communities transform." },
            { text: "Feel good about yourself and move on", points: 6, feedback: "Feeling good is natural, and kindness shouldn't require thanks. But letting it inspire more action is even more powerful!" },
            { text: "Show the card to everyone to prove you're a good person", points: 2, feedback: "Kindness loses some of its magic when done for recognition. The most powerful kindness asks for nothing in return." }
          ]
        },
        {
          question: "You see trash on the ground right next to a bin. Nobody else is around. What do you do?",
          options: [
            { text: "Pick it up and put it in the bin", points: 10, feedback: "Environmental kindness counts too! You cared for your shared space even when no one was watching — that's true character." },
            { text: "Walk past since you didn't drop it", points: 2, feedback: "We all share this environment. Picking it up takes 5 seconds and makes the world a slightly better place for everyone." },
            { text: "Kick it to see if it rolls closer to the bin", points: 5, feedback: "Creative approach! Though picking it up directly would have been more reliably kind to your community." }
          ]
        },
        {
          question: "Your friend is overwhelmed with a project due tomorrow. You've already finished yours. What do you offer?",
          options: [
            { text: "'I'll help you organize your ideas — let's figure this out together'", points: 10, feedback: "This is generous, collaborative kindness. You're not doing their work — you're supporting their success. That's a true friendship." },
            { text: "Send them a motivational message and wish them luck", points: 7, feedback: "Encouragement is kindness too! Sometimes words are exactly what's needed. Offering hands-on help would have added even more." },
            { text: "Show them your finished project so they have ideas to copy from", points: 2, feedback: "This may seem helpful but could create bigger problems. Helping them genuinely build their own ideas is much kinder long-term." }
          ]
        },
        {
          question: "An elderly neighbor is struggling to carry heavy groceries. You're in a hurry. What do you do?",
          options: [
            { text: "Stop and carry their groceries to their door", points: 10, feedback: "A few extra minutes for you could mean everything to them. This is the kind of kindness that restores people's faith in others." },
            { text: "Offer to help but mention you only have a minute", points: 7, feedback: "Still helpful! Being honest about your time while still trying shows good character. Even partial help matters." },
            { text: "Smile apologetically and rush past", points: 2, feedback: "A momentary discomfort (being late) versus a real impact on someone's wellbeing. Kindness often asks us to reprioritize just briefly." }
          ]
        },
        {
          question: "A classmate is being teased and everyone is laughing. You're not part of the teasing. What do you do?",
          options: [
            { text: "Stand next to the person being teased and say 'Hey, I want to hear about that thing you mentioned earlier'", points: 10, feedback: "Brilliant bystander intervention! You redirected without confrontation, stood physically with the person being teased, and broke the moment. That takes real courage and compassion." },
            { text: "Tell the teasers to stop", points: 8, feedback: "Direct and brave! Calling out unkindness publicly takes courage. You created social change in that moment." },
            { text: "Stay silent so you don't become a target yourself", points: 2, feedback: "Fear of social cost is understandable, but the person being teased needs an ally. Even a small signal of support — a look, a move closer — can help." }
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
          question: "Two friends are arguing about which game to play. You're in the group. How do you help?",
          options: [
            { text: "Suggest they take turns choosing games", points: 10, feedback: "Excellent! A turn-taking system is fair, simple, and gives both people something to look forward to. This is real compromise." },
            { text: "Side with the friend you're closer to", points: 2, feedback: "Taking sides rarely resolves conflict — it usually escalates it. A neutral mediator finds solutions that work for everyone." },
            { text: "Suggest a third game neither mentioned", points: 7, feedback: "Creative conflict resolution! Finding common ground outside the original options is a powerful technique. Well done." }
          ]
        },
        {
          question: "You borrowed a friend's book and accidentally damaged it. They notice when you return it. How do you handle this?",
          options: [
            { text: "Apologize immediately and offer to replace or repair it", points: 10, feedback: "This is integrity in action. Taking responsibility without excuses and offering a concrete solution is exactly how trust is built or rebuilt." },
            { text: "Say 'It was like that when I got it'", points: 0, feedback: "Dishonesty turns a small conflict into a trust crisis. Even if they can't prove it, they'll sense it — and the friendship suffers far more than the book." },
            { text: "Apologize but say you can't afford to replace it right now", points: 7, feedback: "Honest and still accountable. Acknowledging the damage while being transparent about limits is mature conflict resolution." }
          ]
        },
        {
          question: "Your group project has two very different ideas and the team is split. How do you resolve it?",
          options: [
            { text: "Suggest combining elements from both ideas to create something stronger", points: 10, feedback: "This is sophisticated conflict resolution — a synthesis approach. You turned competition into collaboration and probably improved the project." },
            { text: "Take a vote and majority rules", points: 7, feedback: "Democratic and fair! Voting is a valid resolution. The minority might need some acknowledgment of their idea's value too." },
            { text: "Let the loudest voice win to keep the peace", points: 2, feedback: "Avoiding conflict by giving in to pressure isn't resolution — it's capitulation. It builds resentment and doesn't serve the group." }
          ]
        },
        {
          question: "You find out a classmate has been spreading rumors about you. You're hurt and angry. What do you do?",
          options: [
            { text: "Speak to them privately: 'I heard something is being said about me. Can we talk?'", points: 10, feedback: "Confronting it directly but calmly is exactly right. Private conversation prevents public embarrassment and gives them a chance to own their actions." },
            { text: "Spread a rumor about them in return", points: 0, feedback: "This escalates the conflict, lowers you to harmful behavior, and typically spirals. Retaliation rarely ends conflict — it extends it." },
            { text: "Ignore it and hope it goes away on its own", points: 5, feedback: "Sometimes rumors do fade. But they can also grow. Addressing it (at the right time, with the right tone) is usually more effective and empowering." }
          ]
        },
        {
          question: "You and a classmate both feel you did more work on a shared assignment. How do you handle it?",
          options: [
            { text: "Calmly discuss what each person did and figure out a fair split for next time", points: 10, feedback: "Perfect! You focused on the future rather than relitigating the past. This solution-oriented approach is what great teams do." },
            { text: "Report them to the teacher immediately", points: 4, feedback: "Sometimes teacher involvement is needed, but trying to resolve it directly first is a stronger, more mature approach." },
            { text: "Let it slide this time but quietly decide not to work with them again", points: 5, feedback: "Protecting yourself is valid, but unaddressed resentment tends to resurface. A conversation — even an uncomfortable one — usually leads to better outcomes." }
          ]
        },
        {
          question: "Two siblings are fighting over the TV remote. You're watching. What do you suggest?",
          options: [
            { text: "Suggest a schedule: one person's choice for the first hour, then switch", points: 10, feedback: "A structured compromise removes the repeated arguing. This is conflict prevention, not just resolution — even better!" },
            { text: "Turn off the TV to teach them both a lesson", points: 3, feedback: "Bold move! But it doesn't address the underlying dynamic. The next argument will be about something else until they learn to compromise." },
            { text: "Leave the room — it's not your conflict", points: 5, feedback: "Removing yourself from drama is sometimes wise. Though offering one quick suggestion before leaving could have helped without getting entangled." }
          ]
        },
        {
          question: "After a sports game, your teammate blames you loudly in front of others for causing the loss. What do you do?",
          options: [
            { text: "Stay calm and say 'Let's talk about this privately when we've both cooled down'", points: 10, feedback: "Exceptional emotional regulation! You refused to escalate in the heat of the moment and created space for a real conversation. This is leadership." },
            { text: "Argue back and defend yourself right there", points: 4, feedback: "Defending yourself is natural, but public argument rarely ends well. Your points land better when emotions are lower." },
            { text: "Walk away and say nothing", points: 6, feedback: "Walking away prevents escalation — good instinct. Adding a 'let's talk later' gives the situation somewhere productive to go." }
          ]
        },
        {
          question: "You disagree strongly with a rule your teacher set. How do you handle it?",
          options: [
            { text: "Request a private meeting to respectfully explain your concerns and ask questions", points: 10, feedback: "This is mature advocacy. You respected the authority relationship while still using your voice. This approach actually gets rules changed sometimes!" },
            { text: "Refuse to follow the rule and explain why in class", points: 2, feedback: "Public defiance rarely changes minds and usually creates more problems than it solves. Private, respectful challenge is far more effective." },
            { text: "Grumble to friends but follow the rule", points: 5, feedback: "Following rules while disagreeing is sometimes the right call. But if the rule is unfair, speaking up respectfully is also valid and important." }
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
            { text: "Wait for a pause and politely ask to join", points: 10, feedback: "Perfect! Being respectful and waiting for the right moment shows great social awareness. You made joining feel natural." },
            { text: "Jump into the conversation immediately", points: 4, feedback: "Enthusiasm is great, but timing and awareness matter. Interrupting can feel jarring, even when your intentions are good." },
            { text: "Stand nearby hoping they notice you", points: 5, feedback: "Sometimes this works, but taking gentle initiative is usually more effective and gets you into the conversation faster." }
          ]
        },
        {
          question: "You're at a new school event and don't know anyone. How do you start a conversation?",
          options: [
            { text: "Ask someone nearby 'Is this your first time here? I just moved to the area'", points: 10, feedback: "Great opener! You asked a question, shared something about yourself, and gave them an easy way to respond. This is textbook friendly conversation-starting." },
            { text: "Take out your phone and wait for someone to talk to you", points: 2, feedback: "Phones create invisible walls. You signal unavailability, which makes others unlikely to approach. Initiative almost always pays off." },
            { text: "Comment on something happening around you — 'This place is really cool, have you been before?'", points: 9, feedback: "Excellent! Commenting on shared surroundings is one of the easiest, most natural conversation starters. Well done." }
          ]
        },
        {
          question: "A friend keeps inviting you to events you don't enjoy. How do you handle it?",
          options: [
            { text: "Kindly say 'I appreciate you thinking of me, but those events aren't really my thing — can we plan something we both enjoy?'", points: 10, feedback: "Honest, kind, and constructive! You declined without rejecting them and offered an alternative. This strengthens the friendship rather than straining it." },
            { text: "Keep going to events you hate to avoid hurting their feelings", points: 3, feedback: "Short-term kindness, long-term resentment. Being authentic builds better friendships than endless accommodation. Your preferences matter too." },
            { text: "Make up excuses to avoid going each time", points: 2, feedback: "Excuses tend to compound and erode trust. A sincere, kind 'no' is far more respectful and sustainable than a series of invented reasons." }
          ]
        },
        {
          question: "You want to compliment a classmate's project but worry it might seem awkward. What do you do?",
          options: [
            { text: "Give a specific, genuine compliment: 'I really liked how you organized your ideas'", points: 10, feedback: "Specific compliments feel more sincere than general ones and show you actually paid attention. Awkwardness fades fast when the kind intention is clear." },
            { text: "Stay quiet to avoid any awkwardness", points: 3, feedback: "Unexpressed appreciation is a missed opportunity. The worst outcome is a moment of brief awkwardness — the best outcome is brightening someone's day." },
            { text: "Say 'Good job!' and move on quickly", points: 6, feedback: "A compliment given! General praise still counts. Adding a specific detail makes it feel more personal and memorable though." }
          ]
        },
        {
          question: "During a discussion, someone shares an opinion you completely disagree with. How do you respond?",
          options: [
            { text: "'That's interesting — I see it differently. Here's my thinking...'", points: 10, feedback: "Masterful! You validated their perspective, signaled disagreement without dismissal, and opened dialogue. This is how productive conversations happen." },
            { text: "'That's completely wrong, here's why...'", points: 2, feedback: "Even if you're factually correct, leading with 'you're wrong' triggers defensiveness. People rarely change their minds when they feel attacked." },
            { text: "Stay quiet and say nothing", points: 5, feedback: "Choosing your battles is sometimes wise. But in discussions, sharing your perspective (respectfully) enriches the conversation and exercises your voice." }
          ]
        },
        {
          question: "There's an awkward silence in a group conversation and everyone looks uncomfortable. What do you do?",
          options: [
            { text: "Ask a light, open-ended question to restart: 'So what's everyone excited about this weekend?'", points: 10, feedback: "You took social responsibility and rescued the group! Open questions invite everyone in and quickly dissolve awkwardness. Social courage." },
            { text: "Stare at your phone until someone else speaks", points: 2, feedback: "Everyone doing this makes silence permanent. Being the one to break it is a social skill that people appreciate even if they don't say so." },
            { text: "Comment on something amusing in the room", points: 8, feedback: "Humor and observation are great tension-breakers! You used your environment creatively to restart the energy. Good instinct." }
          ]
        },
        {
          question: "You're introducing yourself to a new class. You feel nervous. How do you manage it?",
          options: [
            { text: "Take a breath, smile, share one interesting thing about yourself, and invite a question", points: 10, feedback: "Structured and human! A breath calms nerves, a smile creates connection, and inviting a question turns a monologue into a conversation. Well done." },
            { text: "Rush through it as fast as possible", points: 4, feedback: "Getting it done is something! But rushing signals discomfort and gives others little to connect with. Slowing down (even slightly) makes a big difference." },
            { text: "Just say your name and sit down quickly", points: 4, feedback: "Minimal but safe. Adding one thing people can remember you by (an interest, a fact) gives them something to connect on later." }
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
          question: "Your friend says they're happy but their voice sounds flat and they're avoiding eye contact. What do you notice?",
          options: [
            { text: "They might be hiding their true feelings — their words and body language don't match", points: 10, feedback: "Excellent emotional intelligence! Incongruence between words and non-verbal cues is a key signal that someone needs deeper support. You caught it." },
            { text: "They're probably just tired", points: 5, feedback: "Possible, but the full picture matters. Body language mismatch with words usually signals something more than tiredness. Asking gently would reveal more." },
            { text: "They said they're happy, so they must be happy", points: 2, feedback: "Taking words at face value misses the full emotional picture. Emotional intelligence means reading the whole message — words AND body language." }
          ]
        },
        {
          question: "You feel an intense emotion welling up during a tense situation at school. What's the best first step?",
          options: [
            { text: "Pause, take a deep breath, and name what you're feeling before responding", points: 10, feedback: "This is emotional regulation at its best. Naming emotions ('I feel frustrated') activates the rational brain and reduces the intensity. This is neuroscience in action." },
            { text: "Express exactly how you feel immediately so nothing builds up", points: 4, feedback: "Authenticity is valuable, but emotional flooding often leads to regret. A brief pause ensures your expression is intentional, not reactive." },
            { text: "Push the feeling down and deal with it later", points: 5, feedback: "Delayed processing is sometimes necessary. But feelings that are consistently suppressed tend to leak out sideways. Processing (even briefly) is healthier." }
          ]
        },
        {
          question: "A classmate is hostile and rude to you for no clear reason. How do you interpret this?",
          options: [
            { text: "Consider that they may be dealing with something difficult and their behavior reflects their pain, not your worth", points: 10, feedback: "This is advanced emotional intelligence — reframing another's behavior through the lens of their inner experience rather than taking it personally. Powerful skill." },
            { text: "Decide they're a bad person and avoid them entirely", points: 2, feedback: "Behavior is usually information about someone's state, not their character. People in pain sometimes act out. Curiosity often leads to better outcomes than judgment." },
            { text: "Feel hurt and wonder what you did wrong", points: 5, feedback: "Reflection is valuable, but not every negative behavior is about you. Checking in ('Did I do something to upset you?') can clarify quickly." }
          ]
        },
        {
          question: "You notice you feel a sharp discomfort when a friend succeeds at something you've been struggling with. What is this?",
          options: [
            { text: "Recognize it as jealousy, acknowledge it without acting on it, and work on reframing it as inspiration", points: 10, feedback: "This is exceptional self-awareness! Identifying jealousy, accepting it without shame, and converting it to motivation is emotional intelligence at an advanced level." },
            { text: "Tell yourself you're a bad person for feeling this way", points: 2, feedback: "Emotions — even uncomfortable ones — aren't moral failures. Jealousy is universal. What matters is what you do with it, not that you feel it." },
            { text: "Try to convince yourself you don't really care about that thing anyway", points: 4, feedback: "Rationalization is a defense mechanism. Facing the feeling honestly ('I wanted this too and I'm disappointed') is more accurate and leads to better growth." }
          ]
        },
        {
          question: "Before a big presentation, your heart is racing and your thoughts are scattered. How do you understand what's happening?",
          options: [
            { text: "Recognize this as anxiety, and remind yourself that your body is preparing you, not failing you", points: 10, feedback: "Outstanding reframe! Research shows that interpreting arousal as 'excitement' rather than 'anxiety' actually improves performance. You've accessed a powerful psychological tool." },
            { text: "Think 'I'm going to fail' and spiral into worst-case scenarios", points: 0, feedback: "Catastrophizing amplifies anxiety. Your nervous system's activation is neutral — your interpretation of it determines whether it helps or hurts you." },
            { text: "Try to feel nothing and go blank", points: 3, feedback: "Emotional suppression rarely works and often backfires. Acknowledging and working with your emotions is more effective than trying to shut them down." }
          ]
        },
        {
          question: "You feel genuinely happy for a friend's success, even though you haven't achieved similar things yet. What is this called?",
          options: [
            { text: "Compersion — the ability to feel joy in others' joy, which is a sign of high emotional health", points: 10, feedback: "Exactly right! Compersion is one of the most beautiful human emotional capacities. It means your happiness isn't limited by others' success — there's enough for everyone." },
            { text: "You must secretly be hiding jealousy", points: 3, feedback: "Not necessarily! It is absolutely possible to be genuinely happy for others. Assuming hidden negativity underestimates your emotional health." },
            { text: "Luck — you're just in a good mood today", points: 4, feedback: "It might not be luck! This could be a strength. Recognizing your capacity for others' joy and nurturing it is emotionally intelligent." }
          ]
        }
      ]
    }
  },
  {
    title: "The Listening Challenge",
    description: "Master the art of truly hearing others through active listening techniques.",
    category: "social-skills",
    difficulty: "beginner",
    points: 55,
    content: {
      scenarios: [
        {
          question: "Your friend starts telling you about their difficult day. You're thinking about your own response while they talk. What should you do?",
          options: [
            { text: "Refocus on their words completely — your response can wait until they've finished", points: 10, feedback: "This is active listening! People can sense when you're actually present versus when you're waiting for your turn to speak. Full presence is the gift." },
            { text: "Keep planning your response so you're ready immediately when they stop", points: 3, feedback: "This is listening to respond, not to understand. You'll likely miss what they said most, which matters most. Let their words land first." },
            { text: "Nod periodically to show you're paying attention while thinking ahead", points: 5, feedback: "Nodding helps, but split attention is half listening. Even if you miss the rhythm of their story, you miss some of them." }
          ]
        },
        {
          question: "Your classmate is mid-sentence and you have an important point you're afraid you'll forget. What do you do?",
          options: [
            { text: "Mentally note the key word of your thought and wait for them to finish", points: 10, feedback: "Excellent! You found a way to hold your thought without interrupting. This shows both respect for them and confidence that your point will still be worth making after." },
            { text: "Interrupt immediately so you don't lose the thought", points: 1, feedback: "Interruption signals that your thoughts are more important than their words. Even with the best intention, it feels dismissive and breaks their train of thought." },
            { text: "Forget your point and focus entirely on them", points: 8, feedback: "Genuinely good! Releasing your own agenda to truly hear someone is a high form of listening. If your point was important, it will likely come back." }
          ]
        },
        {
          question: "After someone shares something difficult, the best listening response is:",
          options: [
            { text: "'That sounds really hard. What's been the toughest part for you?'", points: 10, feedback: "This validates their experience AND invites them to go deeper. You're not fixing — you're exploring alongside them. This is what people actually need most." },
            { text: "'You should really try [advice]. That worked for me!'", points: 3, feedback: "Advice jumps over understanding. Most people want to feel heard before they want to be helped. Understanding first, solutions second (if at all)." },
            { text: "'Everything happens for a reason, I'm sure it'll work out'", points: 2, feedback: "While hopeful, this bypasses their current pain. Platitudes can feel dismissive. Sitting with someone in their difficulty is more comforting than fast-forwarding them out of it." }
          ]
        },
        {
          question: "During a conversation, you realize you completely missed what the person just said. What do you do?",
          options: [
            { text: "Admit it honestly: 'I'm sorry, I zoned out for a second — could you repeat that?'", points: 10, feedback: "Honesty is respectful! Pretending you heard when you didn't leads to miscommunication and makes people feel unseen when they realize it. Admitting it shows integrity." },
            { text: "Nod and hope the conversation moves on", points: 2, feedback: "This risks responding inappropriately and, when discovered, feels dishonest. A moment's embarrassment in admitting you missed it is far better." },
            { text: "Ask a vague follow-up question hoping they'll repeat the key info", points: 6, feedback: "Clever workaround! Though a direct 'could you repeat that' is simpler, faster, and more honest. Indirect strategies use up energy that could go toward listening." }
          ]
        },
        {
          question: "A classmate is talking but keeps breaking eye contact and trailing off. What does this signal?",
          options: [
            { text: "They may feel nervous or uncertain — giving patient, encouraging attention helps them feel safe", points: 10, feedback: "Excellent reading of non-verbal cues! Patience and gentle encouragement ('Take your time, I'm listening') creates the safety they need to fully express themselves." },
            { text: "They're probably not that interested in talking", points: 2, feedback: "This is unlikely — they're still talking! Broken eye contact and trailing off usually signals vulnerability or difficulty, not disinterest." },
            { text: "Match their energy and trail off too so they don't feel pressured", points: 4, feedback: "Adapting to others is good instinct, but mirroring discomfort can reinforce it. Steady, warm attention is usually more helpful than mirroring withdrawal." }
          ]
        },
        {
          question: "A friend keeps interrupting your story to share their own similar experiences. You feel unheard. This is an example of:",
          options: [
            { text: "Competitive listening — they may not realize they're redirecting away from you", points: 10, feedback: "Exactly right! Competitive listening is common and often unintentional. People relate through their own experience, but it can derail yours. Gently naming it helps: 'Can I finish my story?'" },
            { text: "They're trying to bond by finding common ground, so it's actually nice", points: 5, feedback: "Partially true — the intention is often good! But impact matters. You still feel unheard, which means something needs to shift in how they listen." },
            { text: "They're just excited — don't read too much into it", points: 4, feedback: "Excitement is often the cause! But repeated interruption, even from excitement, signals they're not fully tracking your experience. Both intentions AND impact matter in listening." }
          ]
        }
      ]
    }
  },
  {
    title: "Gratitude Garden",
    description: "Grow your gratitude practice and discover how appreciation transforms perspective.",
    category: "kindness",
    difficulty: "beginner",
    points: 45,
    content: {
      scenarios: [
        {
          question: "Your teacher stayed late to help you understand a difficult concept. What do you do?",
          options: [
            { text: "Write a short thank-you note or send a message expressing genuine appreciation", points: 10, feedback: "A specific thank-you acknowledging their extra time is meaningful and takes only a minute. Teachers rarely hear this and it genuinely matters to them." },
            { text: "Understand it's their job and move on", points: 3, feedback: "Technically true, but gratitude isn't about obligation — it's about noticing what others do for you. That noticing costs nothing and gives a lot." },
            { text: "Tell a classmate 'Our teacher is really helpful'", points: 6, feedback: "Spreading appreciation is good! Though saying it directly to the teacher would have meant so much more to them personally." }
          ]
        },
        {
          question: "You're having a really bad week and everything feels overwhelming. A friend suggests keeping a gratitude journal. What's your reaction?",
          options: [
            { text: "Try it — even noting three small things each day can shift perspective over time", points: 10, feedback: "Research confirms this! Gratitude journaling activates different neural pathways and genuinely reshapes how we perceive our days. Small starts lead to big shifts." },
            { text: "'That won't help when real problems exist'", points: 3, feedback: "Gratitude doesn't deny problems — it balances them. It's not saying 'everything is fine' — it's saying 'there is also this good thing alongside the hard things.'" },
            { text: "Try it once and decide it doesn't work after one entry", points: 4, feedback: "Gratitude practices build cumulative effect. One entry is a start. The shift happens after consistent small practice, not a single attempt." }
          ]
        },
        {
          question: "You receive a gift from a family member that isn't exactly what you wanted. How do you respond?",
          options: [
            { text: "Thank them genuinely for their thought and effort, regardless of the gift itself", points: 10, feedback: "Gratitude is for the gesture, not just the gift. They thought of you, spent time and resources — that's the real gift. Your genuine thanks honors that." },
            { text: "Fake excitement and feel guilty about it", points: 5, feedback: "You're being kind! Though authentic appreciation (even quieter) is more sustainable than performance. Focus on what's real: they cared enough to give." },
            { text: "Say 'I don't really like this' honestly", points: 3, feedback: "Honesty has its place, but unprompted criticism of a gift focuses on your disappointment over their effort. Gratitude for the intention can coexist with mild disappointment about the item." }
          ]
        },
        {
          question: "You're eating lunch and realize you have food, friends nearby, and a warm classroom in winter. What is this moment?",
          options: [
            { text: "A moment to pause and appreciate — these basics are not available to everyone, and noticing them is gratitude", points: 10, feedback: "This is mindful gratitude — noticing the ordinary as extraordinary. It's one of the most powerful forms of appreciation and takes no time at all." },
            { text: "Just a normal day — nothing special", points: 3, feedback: "That 'normal' is actually a gift for many people. The shift from 'normal' to 'fortunate' is the entire practice of gratitude — and it changes everything." },
            { text: "A moment to wish lunch was better food", points: 2, feedback: "Completely human! But pairing one moment of appreciation with the wish changes the experience. Gratitude doesn't require perfection." }
          ]
        },
        {
          question: "A family member has been going through a hard time. What's the most meaningful expression of gratitude you can offer?",
          options: [
            { text: "Tell them specifically what you appreciate about them: 'You always make me feel safe — thank you for that'", points: 10, feedback: "Specific appreciation is more meaningful than general love. It shows you've paid attention and recognized something particular about them. Incredibly impactful." },
            { text: "Give them a generic 'Thanks for everything'", points: 6, feedback: "Still kind! But 'everything' is vague. Specificity signals that you truly see them. 'Thank you for always listening when I need it' lands so much deeper." },
            { text: "Plan to express it later when things calm down", points: 4, feedback: "Later often becomes never. During hard times especially, people need to know they're appreciated. Now is usually the right time." }
          ]
        },
        {
          question: "You've been working hard on a goal and finally made a small breakthrough. How do you mark this moment?",
          options: [
            { text: "Acknowledge it to yourself, feel proud, and express gratitude for the persistence that got you here", points: 10, feedback: "Self-gratitude is a skill! Thanking yourself for your effort (not just results) builds sustainable motivation and a healthy relationship with your own growth." },
            { text: "Immediately focus on the next goal without pausing", points: 4, feedback: "Achievement-orientation is great, but without acknowledgment, progress feels empty. A moment of recognition actually fuels the next effort rather than delaying it." },
            { text: "Downplay it — it's not a big deal", points: 3, feedback: "Progress is always worth noting. Self-minimization is a habit that erodes confidence over time. You worked hard. That deserves recognition — from yourself most of all." }
          ]
        }
      ]
    }
  },
  {
    title: "Boundary Builders",
    description: "Learn to set and respect healthy boundaries in relationships and social situations.",
    category: "social-skills",
    difficulty: "advanced",
    points: 85,
    content: {
      scenarios: [
        {
          question: "A friend keeps pressuring you to join an activity that makes you uncomfortable. How do you respond?",
          options: [
            { text: "Calmly say 'That's not something I'm comfortable with — I'd love to hang out a different way though'", points: 10, feedback: "This is boundary-setting done right: clear, calm, without lengthy explanation, and followed by an alternative. You respected yourself while preserving the friendship." },
            { text: "Cave in to avoid conflict even though you're uncomfortable", points: 2, feedback: "Repeatedly overriding your own comfort to please others erodes self-trust and can breed resentment. A clear no now saves a bigger problem later." },
            { text: "Make up an excuse to avoid the situation", points: 4, feedback: "Excuses work short-term but require maintenance and don't address the pattern. A direct (but kind) no respects both of you more." }
          ]
        },
        {
          question: "A classmate keeps borrowing your things without asking and returning them late or damaged. What do you do?",
          options: [
            { text: "Have a direct conversation: 'I want to be a good friend, but I need you to ask before borrowing and return things on time'", points: 10, feedback: "This is assertive communication — not aggressive, not passive. You stated your need clearly with a reason attached. This is how boundaries create healthier relationships." },
            { text: "Stop lending anything and give no explanation", points: 5, feedback: "Protecting your things is valid, but the abrupt change without explanation may confuse or hurt them. A brief conversation would address the root issue." },
            { text: "Keep lending and silently feel frustrated", points: 2, feedback: "Unspoken resentment is a slow relationship poison. Your frustration is completely valid — speaking it (kindly) is the respectful choice for both of you." }
          ]
        },
        {
          question: "Someone you don't know well stands very close to you and it makes you uncomfortable. What's appropriate?",
          options: [
            { text: "Take a small step back to reestablish your comfort zone — no explanation needed", points: 10, feedback: "This is an entirely appropriate, non-confrontational way to restore your physical boundary. Body language communicates clearly without the need for words." },
            { text: "Stay put and endure the discomfort to avoid awkwardness", points: 2, feedback: "Your physical comfort is not negotiable. Small, calm adjustments to protect it are always appropriate. Enduring discomfort teaches others that your boundaries don't exist." },
            { text: "Tell them loudly to back off", points: 4, feedback: "Setting the boundary is right! The volume might be disproportionate. A quieter, direct statement or just moving yourself solves it more smoothly." }
          ]
        },
        {
          question: "Your friend wants to talk for hours every night but you need time for homework and sleep. How do you handle it?",
          options: [
            { text: "Set a friendly but clear structure: 'I love talking with you — let's catch up for 30 minutes, then I need to sign off'", points: 10, feedback: "Time boundaries are just as valid as any other kind. You maintained the relationship AND protected your needs. This is a sustainable friendship pattern." },
            { text: "Always stay up late because you don't want to disappoint them", points: 2, feedback: "This burns you out and eventually leads to avoidance. A clear, kind time limit now protects the friendship and your wellbeing. Both matter." },
            { text: "Stop responding after a set time without explanation", points: 5, feedback: "Protecting your time is valid. A heads-up ('I sign off at 9pm on school nights') removes the ambiguity and prevents them from feeling suddenly dropped." }
          ]
        },
        {
          question: "A family member asks probing questions about something personal that you're not ready to share. What do you say?",
          options: [
            { text: "'I appreciate you caring, but I'm not ready to talk about that yet — I'll share when I'm comfortable'", points: 10, feedback: "This is warm but firm. You acknowledged their care, set a clear boundary, and left the door open for future sharing. It's both honest and kind." },
            { text: "Make up a story to avoid the real answer", points: 3, feedback: "Fabrication complicates things and requires maintenance. A clear, kind deflection is more respectful — both to them and to you." },
            { text: "Answer but feel violated about it for days", points: 2, feedback: "Sharing before you're ready and then regretting it is a sign that a boundary was crossed — by yourself. Pausing and saying 'not yet' is always an option." }
          ]
        },
        {
          question: "You realize a friend has crossed a personal boundary without realizing it. How do you bring it up?",
          options: [
            { text: "Choose a calm moment and say 'Hey, I wanted to mention something — when X happened, I felt uncomfortable. I wanted you to know'", points: 10, feedback: "This is courageous and respectful. You used an 'I statement' (not accusatory), gave a specific example, and shared your feeling. This is how boundaries are communicated and relationships are maintained." },
            { text: "Say nothing and gradually pull away from the friendship", points: 2, feedback: "Withdrawal without communication is painful for both people. They don't know what they did, and you lose a friend. A brief, honest conversation is almost always worth the discomfort." },
            { text: "Confront them angrily in front of others", points: 1, feedback: "Public confrontation almost never resolves — it humiliates and escalates. Private, calm conversations have exponentially better outcomes." }
          ]
        }
      ]
    }
  },
  {
    title: "Words That Heal",
    description: "Discover the power of language in building bridges and mending relationships.",
    category: "conflict-resolution",
    difficulty: "intermediate",
    points: 75,
    content: {
      scenarios: [
        {
          question: "You're angry at a friend. Which sentence is most likely to lead to a productive conversation?",
          options: [
            { text: "'When you cancel plans last-minute, I feel hurt and unimportant to you'", points: 10, feedback: "This is an 'I feel' statement — it describes the impact on you without attacking their character. This invites dialogue instead of defensiveness. Powerful communication." },
            { text: "'You always cancel and you clearly don't care about me'", points: 2, feedback: "'Always' and 'clearly' are inflaming words. They trigger defensiveness and rarely match reality exactly. People shut down when they feel globally condemned." },
            { text: "'Whatever, forget it — it doesn't matter'", points: 3, feedback: "Withdrawal protects you from vulnerability in the moment but leaves the issue unresolved. Unspoken hurt tends to grow, not shrink." }
          ]
        },
        {
          question: "You said something that hurt a friend. The most effective apology is:",
          options: [
            { text: "'I'm sorry I said that. I understand it hurt you and that wasn't okay. I'll be more careful with my words'", points: 10, feedback: "A full apology: names the action, acknowledges the impact, takes responsibility, and commits to change. This is the kind of apology that actually heals." },
            { text: "'I'm sorry if you were offended'", points: 2, feedback: "This apologizes for their reaction, not your action. 'If you were offended' implies their feelings may be the problem. It often makes things worse." },
            { text: "'I'm sorry but I was upset and didn't mean it'", points: 5, feedback: "'But' tends to cancel the apology that comes before it. 'I'm sorry AND I was upset' works better. The context can be shared, but not as an excuse." }
          ]
        },
        {
          question: "You need to give honest feedback to a classmate about their work. What approach works best?",
          options: [
            { text: "Share what's strong, then what could be improved, then end with encouragement", points: 10, feedback: "This is the 'sandwich' approach — not because we hide negatives, but because starting and ending with strength puts the person in a better mindset to receive the middle. It's warm and effective." },
            { text: "List every problem you see so they know exactly what to fix", points: 4, feedback: "Thoroughness is good, but without positive framing, criticism can feel overwhelming and discouraging. People learn better when they feel capable, not just corrected." },
            { text: "Only tell them the positive things to keep them feeling good", points: 3, feedback: "This is kind but unhelpful. Real growth requires honest feedback. Delivering it with care is an act of respect — avoiding it is not." }
          ]
        },
        {
          question: "During an argument, the other person says something that really stings. What do you do in that moment?",
          options: [
            { text: "Pause and say 'That really hurt. I need a moment before we continue'", points: 10, feedback: "This is emotionally intelligent communication. You named your state, protected yourself, and kept the door open for conversation. Walking away screaming or shutting down would have done far more damage." },
            { text: "Fire back with something equally hurtful", points: 0, feedback: "Escalation guarantees damage to the relationship, even if it feels satisfying in the moment. Whatever you say in anger tends to outlast the argument itself." },
            { text: "Pretend it didn't bother you and keep arguing", points: 3, feedback: "Suppressing the sting means it builds up. Naming it briefly ('that stung a bit') without dramatic escalation actually moves the conversation to a more honest place." }
          ]
        },
        {
          question: "A classmate is visibly upset about something at school. The most healing thing you can say first is:",
          options: [
            { text: "'That sounds really tough. I'm here if you want to talk — no pressure'", points: 10, feedback: "This validates, offers presence, and removes pressure. Three healing elements in one sentence. This is what people in distress most need to hear before anything else." },
            { text: "'It could be worse — at least...'", points: 1, feedback: "Comparison rarely comforts. It redirects attention from their current pain to an imagined worse scenario. People want to feel their pain acknowledged, not minimized." },
            { text: "'Have you tried talking to a counselor?'", points: 5, feedback: "Suggesting support is caring! Though jumping to solutions before sitting with them briefly can feel like you want to hand them off. Try acknowledging first, then suggesting." }
          ]
        },
        {
          question: "You want to tell someone important what they mean to you, but it feels awkward. What do you do?",
          options: [
            { text: "Say it anyway — write a note if speaking feels too hard", points: 10, feedback: "Vulnerability is courage, and kind words given freely are one of life's greatest gifts. The awkwardness is temporary; the impact lasts. Always say the thing." },
            { text: "Wait for the 'right moment' that never seems to come", points: 3, feedback: "Perfect moments are rare. Most 'I'll say it eventually' intentions become 'I wish I had said it.' The right moment is when you feel it and they can hear it." },
            { text: "Drop hints and hope they figure out how you feel", points: 4, feedback: "People are not mind-readers. Even close ones miss hints. Direct (even briefly awkward) expression is the only reliable way to truly communicate how much someone matters to you." }
          ]
        },
        {
          question: "In a tense class discussion, your opinion differs from most of the group. What's the healthiest way to engage?",
          options: [
            { text: "'I see it a bit differently — here's my thinking. I'm curious what you all think of this angle...'", points: 10, feedback: "You shared your perspective without making it a battle, and invited dialogue rather than demanding agreement. This is confident, respectful intellectual engagement at its best." },
            { text: "Stay quiet because your opinion isn't the majority", points: 3, feedback: "Majority opinion isn't always right, and diverse thinking benefits everyone. Your perspective has value — rooms become echo chambers when minority views go unshared." },
            { text: "'You're all wrong, and here's why'", points: 2, feedback: "Framing it as 'everyone else is wrong' creates defensiveness across the room. Even if your point is excellent, the delivery determines whether it lands or gets dismissed." }
          ]
        }
      ]
    }
  }
];

const INTERACTIVE_GAMES = [
  {
    title: "Emotion Memory Match",
    description: "Flip cards to match emotions with real-life situations. Train your brain to recognize feelings fast!",
    category: "empathy",
    difficulty: "beginner",
    points: 80,
    content: {
      gameType: "memory-match",
      pairs: [
        { emotion: "Empathy", situation: "Comforting a crying friend without being asked" },
        { emotion: "Gratitude", situation: "Thanking your teacher after extra help" },
        { emotion: "Courage", situation: "Speaking up when you see someone being bullied" },
        { emotion: "Patience", situation: "Waiting calmly while someone explains slowly" },
        { emotion: "Kindness", situation: "Sharing your lunch with someone who forgot theirs" },
        { emotion: "Respect", situation: "Listening without interrupting when someone talks" },
        { emotion: "Forgiveness", situation: "Letting go of anger after a friend apologizes" },
        { emotion: "Compassion", situation: "Helping an elderly person cross the street" },
      ]
    }
  },
  {
    title: "Kindness Speed Challenge",
    description: "True or False — quick fire! Can you identify kindness and empathy facts before time runs out?",
    category: "kindness",
    difficulty: "intermediate",
    points: 100,
    content: {
      gameType: "speed-round",
      timePerQuestion: 10,
      questions: [
        { statement: "Ignoring someone's feelings is a form of empathy.", correct: false, explanation: "Empathy means actively acknowledging and sharing in someone else's feelings — ignoring them is the opposite." },
        { statement: "A small act of kindness, like smiling at someone, can improve their entire day.", correct: true, explanation: "Research shows that even micro-moments of kindness release oxytocin and boost mood for both giver and receiver." },
        { statement: "You must agree with someone to show them empathy.", correct: false, explanation: "Empathy is about understanding feelings, not necessarily agreeing. You can validate emotions without sharing the opinion." },
        { statement: "Helping someone only when it benefits you is still considered genuine kindness.", correct: false, explanation: "Genuine kindness is unconditional — it's done without expecting reward or benefit in return." },
        { statement: "Bullying someone online is just as harmful as bullying in person.", correct: true, explanation: "Cyberbullying can actually be more harmful because victims can't escape it — it follows them home 24/7." },
        { statement: "Expressing your own feelings honestly is part of healthy social skills.", correct: true, explanation: "Clear, honest emotional expression is the foundation of healthy relationships and self-advocacy." },
        { statement: "Conflict always has a winner and a loser.", correct: false, explanation: "Win-win solutions exist in most conflicts — collaboration and understanding lead to outcomes where everyone benefits." },
        { statement: "Practicing mindfulness can improve how well we empathize with others.", correct: true, explanation: "Mindfulness increases self-awareness and emotional regulation, which are both key components of empathy." },
      ]
    }
  },
  {
    title: "Conflict Resolution Steps",
    description: "Put the steps in the right order to resolve a conflict peacefully. Build real-world social skills!",
    category: "conflict-resolution",
    difficulty: "intermediate",
    points: 90,
    content: {
      gameType: "sequence",
      situation: "You and your friend disagree about a project. They feel their ideas are always ignored and are getting frustrated.",
      steps: [
        { id: 1, text: "Take a deep breath and calm yourself before responding", correctPosition: 1 },
        { id: 2, text: "Ask your friend to share their full perspective without interrupting", correctPosition: 2 },
        { id: 3, text: "Reflect back what you heard: 'So you feel your ideas aren't valued?'", correctPosition: 3 },
        { id: 4, text: "Share your own perspective using 'I feel' statements", correctPosition: 4 },
        { id: 5, text: "Together brainstorm solutions that include both of your ideas", correctPosition: 5 },
        { id: 6, text: "Agree on a specific plan and check in with each other later", correctPosition: 6 },
      ]
    }
  },
  {
    title: "Breathing Bubble",
    description: "Follow the bubble's rhythm with a 4-4-6 breathing pattern. Calm your body and mind in under two minutes.",
    category: "empathy",
    difficulty: "beginner",
    points: 60,
    content: {
      gameType: "breathing-bubble",
      cycles: 5,
      inhaleSec: 4,
      holdSec: 4,
      exhaleSec: 6,
    }
  },
  {
    title: "Kindness Catcher",
    description: "Catch falling acts of kindness — hugs, gifts, smiles — and dodge the meanness. Drag the basket or use the arrow keys!",
    category: "kindness",
    difficulty: "beginner",
    points: 80,
    content: {
      gameType: "kindness-catcher",
      duration: 30,
    }
  },
  {
    title: "Mood Mixer",
    description: "Mix red, green and blue to paint the colour of a feeling. How close can you get to capturing joy, calm, hope and more?",
    category: "empathy",
    difficulty: "intermediate",
    points: 75,
    content: {
      gameType: "mood-mixer",
      rounds: 5,
    }
  },
  {
    title: "Emotion Painter",
    description: "Floating emotion bubbles drift across the screen — pop only the ones matching the current feeling. Build streaks for bonus points!",
    category: "social-skills",
    difficulty: "beginner",
    points: 90,
    content: {
      gameType: "emotion-painter",
      duration: 30,
    }
  }
];

const COMPREHENSIVE_MUSIC = [
  { title: "Forest Atmosphere", category: "nature", duration: 300, audioUrl: "https://ia801408.us.archive.org/32/items/ForestAtmosphere/Forest%20Atmosphere.mp3", description: "Gentle forest sounds with birdsong and rustling leaves for deep focus" },
  { title: "Ocean Waves", category: "nature", duration: 420, audioUrl: "https://ia801503.us.archive.org/29/items/ocean-waves-nature-sounds/Ocean%20Waves%20-%20Nature%20Sounds.mp3", description: "Peaceful ocean waves for relaxation and stress relief" },
  { title: "Tibetan Singing Bowls", category: "meditation", duration: 600, audioUrl: "https://ia601402.us.archive.org/2/items/TibetanBellsMeditation/Tibetan%20Bells%20Meditation.mp3", description: "Soothing Tibetan singing bowls for deep meditation and healing" },
  { title: "Gymnopedie No. 1", category: "instrumental", duration: 210, audioUrl: "https://ia601609.us.archive.org/8/items/kevinmacleod-royaltyfreemusic-26/Kevin%20MacLeod%20~%20Gymnopedie%20No%201.mp3", description: "Satie's timeless piano piece — peaceful and deeply reflective" },
  { title: "Meditation Impromptu 01", category: "ambient", duration: 180, audioUrl: "https://ia601305.us.archive.org/25/items/kevinmacleod-royaltyfreemusic-24/Kevin%20MacLeod%20~%20Meditation%20Impromptu%2001.mp3", description: "Calming ambient meditation music for mindful breathing" },
  { title: "Gymnopedie No. 3", category: "instrumental", duration: 225, audioUrl: "https://ia801609.us.archive.org/8/items/kevinmacleod-royaltyfreemusic-26/Kevin%20MacLeod%20~%20Satie%20Gymnopedie%20No%203.mp3", description: "Gentle piano for quiet reflection and calm focus" },
  { title: "Healing", category: "ambient", duration: 240, audioUrl: "https://ia601305.us.archive.org/25/items/kevinmacleod-royaltyfreemusic-24/Kevin%20MacLeod%20~%20Meditation%20Impromptu%2002.mp3", description: "Peaceful ambient tones for emotional healing and rest" },
  { title: "Peaceful Mind", category: "meditation", duration: 360, audioUrl: "https://ia801606.us.archive.org/29/items/freemusicarchive-music-38/Kevin%20MacLeod%20~%20Dreaming.mp3", description: "Gentle meditation soundscape for calm and clarity" },
  { title: "Morning Light", category: "instrumental", duration: 195, audioUrl: "https://ia801609.us.archive.org/8/items/kevinmacleod-royaltyfreemusic-26/Kevin%20MacLeod%20~%20Gymnopedie%20No%201.mp3", description: "Bright, hopeful piano music to start the day with positivity" },
  { title: "Deep Calm", category: "ambient", duration: 480, audioUrl: "https://ia601305.us.archive.org/25/items/kevinmacleod-royaltyfreemusic-24/Kevin%20MacLeod%20~%20Meditation%20Impromptu%2001.mp3", description: "Extended ambient session for deep relaxation and study" },
  { title: "Gentle Rain", category: "nature", duration: 600, audioUrl: "https://ia801408.us.archive.org/32/items/ForestAtmosphere/Forest%20Atmosphere.mp3", description: "Soft nature sounds with gentle rain for sleep and focus" },
  { title: "Inner Peace", category: "meditation", duration: 420, audioUrl: "https://ia601402.us.archive.org/2/items/TibetanBellsMeditation/Tibetan%20Bells%20Meditation.mp3", description: "Bell tones and silence for mindfulness practice and calm" }
];

export async function runMigrations() {
  try {
    console.log("Running content migrations...");
    
    // Check if games need updating (less than 5 scenarios per game on average)
    const existingGames = await db.select().from(games);
    
    let needsUpdate = false;
    if (existingGames.length === 0) {
      needsUpdate = true;
    } else {
      // Check if any game has fewer than 5 scenarios
      for (const game of existingGames) {
        const content = game.content as any;
        if (!content?.scenarios || content.scenarios.length < 5) {
          needsUpdate = true;
          break;
        }
      }
    }

    if (needsUpdate) {
      console.log("Updating game content with comprehensive scenarios...");
      for (const gameData of COMPREHENSIVE_GAMES) {
        const existing = existingGames.find(g => g.title === gameData.title);
        if (existing) {
          await db.update(games)
            .set({ content: gameData.content, points: gameData.points })
            .where(eq(games.id, existing.id));
        } else {
          await db.insert(games).values(gameData);
        }
      }
      console.log("Game content updated successfully.");
    } else {
      console.log("Game content already comprehensive — skipping.");
    }

    // Add interactive game types if not already present
    const allGames = await db.select().from(games);
    for (const gameData of INTERACTIVE_GAMES) {
      const exists = allGames.find(g => g.title === gameData.title);
      if (!exists) {
        await db.insert(games).values(gameData);
        console.log(`Added interactive game: ${gameData.title}`);
      }
    }

    // Update music tracks to ensure full catalog
    const existingMusic = await db.select().from(musicTracks);
    if (existingMusic.length < 10) {
      console.log("Updating music catalog...");
      // Add missing tracks
      for (const track of COMPREHENSIVE_MUSIC) {
        const exists = existingMusic.find(t => t.title === track.title);
        if (!exists) {
          await db.insert(musicTracks).values(track);
        }
      }
      console.log("Music catalog updated.");
    }

    // Ensure new tables exist (added after initial drizzle push)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS compliments (
        id serial PRIMARY KEY,
        sender_id varchar NOT NULL,
        recipient_id varchar NOT NULL,
        message text NOT NULL,
        emoji varchar(8),
        read_at timestamp,
        is_hidden boolean DEFAULT false,
        is_flagged boolean DEFAULT false,
        created_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS compliments_recipient_idx ON compliments (recipient_id, created_at DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS compliments_sender_idx ON compliments (sender_id, created_at DESC)`);

  } catch (error) {
    console.error("Migration error:", error);
  }
}
