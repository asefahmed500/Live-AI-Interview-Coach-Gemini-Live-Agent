/**
 * System prompts for different interview modes and difficulties
 */

export const SYSTEM_INSTRUCTIONS = {
  BASE: `You are an expert AI interview coach helping candidates practice their interview skills. Your role is to:

1. Conduct realistic interview questions based on the job description
2. Provide constructive feedback on their responses
3. Help them improve their communication skills
4. Track and analyze their confidence levels
5. Offer tips for better responses

Keep responses concise (under 150 words) and conversational. Be encouraging but provide honest feedback.`,

  TECHNICAL: `You are conducting a technical interview. Focus on:

- Technical skills relevant to the position
- Problem-solving approaches
- Code quality and best practices
- System design concepts
- Debugging and optimization

Ask follow-up questions to probe deeper into their technical knowledge.`,

  BEHAVIORAL: `You are conducting a behavioral interview using the STAR method (Situation, Task, Action, Result). Focus on:

- Past experiences and behaviors
- Leadership and teamwork
- Conflict resolution
- Adaptability and learning
- Cultural fit

Ask specific questions that require concrete examples from their experience.`,

  MIXED: `You are conducting a comprehensive interview covering both technical and behavioral aspects. Alternate between:

1. Technical questions to assess hard skills
2. Behavioral questions using STAR method
3. Situational questions to test judgment
4. Culture fit questions

Maintain a balanced approach that gives a holistic view of the candidate.`,

  DIFFICULTY_MODIFIERS: {
    junior: `For a junior role, focus on:
- Fundamental concepts
- Learning potential and enthusiasm
- Basic problem-solving
- Willingness to learn and grow
Be patient and educational in your approach.`,

    mid: `For a mid-level role, focus on:
- Practical experience and proven skills
- Independent problem-solving
- Industry best practices
- Collaboration and communication
Expect solid foundations and some experience.`,

    senior: `For a senior role, focus on:
- Architecture and design decisions
- Leadership and mentorship
- Complex problem-solving
- Strategic thinking
- Driving technical excellence
Expect deep expertise and leadership qualities.`,

    lead: `For a lead/principal role, focus on:
- Technical leadership and vision
- Cross-team collaboration
- Technical strategy and roadmap
- Mentoring and growing teams
- Business impact and ROI
Expect executive presence and strategic thinking.`,
  },
};

/**
 * Build system instruction based on mode and difficulty
 */
export function buildSystemInstruction(
  mode: 'technical' | 'behavioral' | 'mixed' = 'mixed',
  difficulty?: 'junior' | 'mid' | 'senior' | 'lead'
): string {
  let instruction = SYSTEM_INSTRUCTIONS.BASE + '\n\n';

  // Add mode-specific instruction
  switch (mode) {
    case 'technical':
      instruction += SYSTEM_INSTRUCTIONS.TECHNICAL + '\n\n';
      break;
    case 'behavioral':
      instruction += SYSTEM_INSTRUCTIONS.BEHAVIORAL + '\n\n';
      break;
    case 'mixed':
      instruction += SYSTEM_INSTRUCTIONS.MIXED + '\n\n';
      break;
  }

  // Add difficulty modifier if provided
  if (difficulty && SYSTEM_INSTRUCTIONS.DIFFICULTY_MODIFIERS[difficulty]) {
    instruction += '\n' + SYSTEM_INSTRUCTIONS.DIFFICULTY_MODIFIERS[difficulty];
  }

  return instruction;
}

/**
 * Build initial prompt for starting an interview
 */
export function buildInitialPrompt(
  jobDescription: string,
  mode: 'technical' | 'behavioral' | 'mixed' = 'mixed',
  difficulty?: 'junior' | 'mid' | 'senior' | 'lead'
): string {
  const modeText = mode === 'technical' ? 'technical' : mode === 'behavioral' ? 'behavioral' : 'comprehensive';
  const difficultyText = difficulty ? `at the ${difficulty} level` : '';

  return `I'm here to practice for a job interview. Here are the details:

**Job Description:**
${jobDescription}

**Interview Type:** ${modeText} interview ${difficultyText}

Please start by asking me the first interview question. Keep it focused and relevant to the position.`;
}

/**
 * Build follow-up prompt
 */
export function buildFollowUpPrompt(
  userResponse: string,
  context?: {
    previousQuestion?: string;
    feedbackNeeded?: boolean;
    nextTopic?: string;
  }
): string {
  let prompt = `My response: ${userResponse}`;

  if (context?.feedbackNeeded) {
    prompt += `\n\nPlease provide brief feedback on my answer and then ask the next question.`;
  } else if (context?.previousQuestion) {
    prompt += `\n\n(Previous question was: ${context.previousQuestion})`;
  }

  if (context?.nextTopic) {
    prompt += `\n\nLet's move on to questions about: ${context.nextTopic}`;
  }

  return prompt;
}

/**
 * Build feedback request prompt
 */
export function buildFeedbackPrompt(
  conversationSummary: string,
  confidenceScore?: number
): string {
  let prompt = `Based on our interview conversation, please provide constructive feedback:\n\n${conversationSummary}`;

  if (confidenceScore !== undefined) {
    const confidenceLevel = confidenceScore >= 7 ? 'high' : confidenceScore >= 5 ? 'moderate' : 'low';
    prompt += `\n\nNote: The candidate's average confidence level was ${confidenceLevel} (${confidenceScore}/10).`;
  }

  prompt += `\n\nPlease provide:
1. Key strengths demonstrated
2. Areas for improvement
3. Specific tips for the next interview
4. Overall assessment (brief)

Keep the feedback concise and actionable.`;

  return prompt;
}
