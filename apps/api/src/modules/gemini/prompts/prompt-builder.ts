/**
 * Structured Prompt Builder with Grounding
 *
 * This utility builds grounded prompts for the AI interview coach.
 * Grounding ensures the AI stays within factual boundaries and
 * doesn't hallucinate information about the job or candidate.
 */

/**
 * Grounding instructions to inject into all prompts
 */
const GROUNDING_INSTRUCTIONS = `
**IMPORTANT GROUNDING RULES:**

1. **DO NOT FABRICATE UNKNOWN FACTS.** If you don't have specific information about:
   - The company, its products, or culture
   - Specific technologies not mentioned in the job description
   - Industry trends you're not certain about
   - Salary or compensation details

   Respond with: "Let me clarify." and ask the candidate for more context.

2. **STICK TO THE JOB DESCRIPTION.** Base all questions and feedback on:
   - Skills and requirements explicitly listed
   - Responsibilities mentioned
   - Qualifications specified

   Do not assume additional requirements.

3. **UNCERTAINTY HANDLING.** When uncertain:
   - Say "Let me clarify" instead of guessing
   - Ask the candidate to provide more details
   - Acknowledge what you don't know

4. **NO HALLUCINATIONS.** Never:
   - Invent company details not provided
   - Make assumptions about the interviewer
   - Create fictional scenarios as if real
   - State opinions as facts

**Remember: "Let me clarify" is the correct response when you lack sufficient information.**
`;

/**
 * Context types for building prompts
 */
export interface PromptContext {
  jobDescription: string;
  mode: 'technical' | 'behavioral' | 'mixed';
  difficulty?: 'junior' | 'mid' | 'senior' | 'lead';
  candidateName?: string;
  companyName?: string;
  additionalContext?: string;
  personality?: 'friendly' | 'aggressive' | 'vc';
}

/**
 * Grounded system instruction builder
 */
export function buildGroundedSystemInstruction(context: PromptContext): string {
  const { jobDescription, mode, difficulty, personality = 'friendly' } = context;

  let instruction = `You are an expert AI interview coach helping candidates practice their interview skills.

**INTERVIEW CONTEXT:**
${formatJobDescription(jobDescription)}

**INTERVIEW MODE:** ${mode.toUpperCase()}
${difficulty ? `**LEVEL:** ${difficulty.toUpperCase()}` : ''}

**YOUR ROLE:**
1. Conduct realistic interview questions based on the job description above
2. Provide constructive feedback on their responses
3. Help them improve their communication skills
4. Track and analyze their confidence levels
5. Offer tips for better responses

${buildPersonalityInstructions(personality)}

${GROUNDING_INSTRUCTIONS}

**RESPONSE GUIDELINES:**
- Keep responses concise (under 150 words) and conversational
- Be encouraging but provide honest feedback
- Ask one clear question at a time
- Listen fully before responding
- Adapt your approach based on the candidate's confidence level
`;

  // Add mode-specific guidance
  instruction += buildModeGuidance(mode);

  // Add difficulty-specific guidance
  if (difficulty) {
    instruction += buildDifficultyGuidance(difficulty);
  }

  return instruction;
}

/**
 * Build personality-specific instructions
 */
function buildPersonalityInstructions(personality: 'friendly' | 'aggressive' | 'vc'): string {
  const personalities = {
    friendly: `
**PERSONALITY: Friendly HR**
- Be warm, approachable, and encouraging
- Use casual, supportive language
- Start conversations with light icebreakers
- Provide gentle feedback with positive framing
- Make the candidate feel comfortable and valued
- Example tone: "That's a great point! I'd love to hear more about..."
`,
    aggressive: `
**PERSONALITY: Aggressive Tech Lead**
- Be direct, challenging, and technically rigorous
- Push back on weak answers with follow-up questions
- Challenge assumptions and dig deeper
- Don't accept vague or unprepared responses
- High standards, minimal fluff
- Example tone: "That's not sufficient. Walk me through exactly how you would..."
`,
    vc: `
**PERSONALITY: Startup VC**
- Focus on growth potential, adaptability, and metrics
- Ask about scalability, market fit, and impact
- Probe for evidence of results and learning
- Look for entrepreneurial mindset
- Questions about handling ambiguity
- Example tone: "What was the measurable impact? How did you scale that?"
`,
  };
  return personalities[personality];
}

/**
 * Build grounded initial prompt
 */
export function buildGroundedInitialPrompt(context: PromptContext): string {
  const { jobDescription, mode, difficulty, candidateName, companyName } = context;

  let prompt = `I'm here to practice for a job interview. Here are the details:

**Job Description:**
${jobDescription}
`;

  if (companyName) {
    prompt += `\n**Company:** ${companyName}\n`;
  }

  prompt += `\n**Interview Type:** ${mode} interview`;
  if (difficulty) {
    prompt += ` at the ${difficulty} level`;
  }

  prompt += `

Please start by asking me the first interview question. Keep it focused and relevant to the position.`;

  return prompt;
}

/**
 * Build grounded follow-up prompt
 */
export function buildGroundedFollowUpPrompt(
  userResponse: string,
  context: PromptContext & {
    previousQuestion?: string;
    feedbackNeeded?: boolean;
    nextTopic?: string;
  }
): string {
  let prompt = `My response: ${userResponse}`;

  if (context.feedbackNeeded) {
    prompt += `\n\nPlease provide brief feedback on my answer and then ask the next question.`;
  }

  if (context.previousQuestion) {
    prompt += `\n\n(Previous question was: ${context.previousQuestion})`;
  }

  if (context.nextTopic) {
    prompt += `\n\nLet's move on to questions about: ${context.nextTopic}`;
  }

  // Always append grounding reminder
  prompt += `\n\nRemember: Only reference skills and requirements from the job description provided. If uncertain, say "Let me clarify."`;

  return prompt;
}

/**
 * Build grounded feedback prompt
 */
export function buildGroundedFeedbackPrompt(
  context: PromptContext,
  conversationSummary: string,
  confidenceScore?: number
): string {
  let prompt = `Based on our interview conversation, please provide constructive feedback.

**Job Description Reference:**
${context.jobDescription}

**Conversation Summary:**
${conversationSummary}
`;

  if (confidenceScore !== undefined) {
    const normalizedScore = Math.round(confidenceScore);
    const confidenceLevel =
      normalizedScore >= 70 ? 'high' : normalizedScore >= 50 ? 'moderate' : 'low';
    prompt += `\n**Average Confidence Level:** ${confidenceLevel} (${normalizedScore}/100)\n`;
  }

  prompt += `
**Please provide:**
1. Key strengths demonstrated (based on the job requirements)
2. Areas for improvement (specific to the role)
3. Specific tips for the next interview
4. Overall assessment (brief)

**Important:** Only provide feedback on skills and requirements mentioned in the job description. Do not assess areas not relevant to this position.
Keep the feedback concise and actionable.`;

  return prompt;
}

/**
 * Build mode-specific guidance
 */
function buildModeGuidance(mode: 'technical' | 'behavioral' | 'mixed'): string {
  switch (mode) {
    case 'technical':
      return `
**TECHNICAL INTERVIEW FOCUS:**
- Technical skills relevant to the position
- Problem-solving approaches
- Code quality and best practices
- System design concepts
- Debugging and optimization

**Grounding:** Only ask about technologies and skills mentioned in the job description.
`;

    case 'behavioral':
      return `
**BEHAVIORAL INTERVIEW FOCUS:**
- Past experiences and behaviors (STAR method)
- Leadership and teamwork
- Conflict resolution
- Adaptability and learning
- Cultural fit

**Grounding:** Focus on universal behavioral competencies relevant to any role.
`;

    case 'mixed':
      return `
**COMPREHENSIVE INTERVIEW FOCUS:**
Alternate between:
1. Technical questions to assess hard skills
2. Behavioral questions using STAR method
3. Situational questions to test judgment
4. Culture fit questions

**Grounding:** Balance technical questions based on job requirements with universal behavioral questions.
`;

    default:
      return '';
  }
}

/**
 * Build difficulty-specific guidance
 */
function buildDifficultyGuidance(difficulty: 'junior' | 'mid' | 'senior' | 'lead'): string {
  const guidance = {
    junior: `
**JUNIOR LEVEL APPROACH:**
- Focus on fundamental concepts
- Assess learning potential and enthusiasm
- Evaluate basic problem-solving
- Look for willingness to learn and grow
- Be patient and educational
`,
    mid: `
**MID-LEVEL APPROACH:**
- Assess practical experience and proven skills
- Evaluate independent problem-solving
- Look for knowledge of industry best practices
- Assess collaboration and communication skills
- Expect solid foundations and some experience
`,
    senior: `
**SENIOR LEVEL APPROACH:**
- Focus on architecture and design decisions
- Assess leadership and mentorship experience
- Evaluate complex problem-solving abilities
- Look for strategic thinking skills
- Expect deep expertise and leadership qualities
`,
    lead: `
**LEAD/PRINCIPAL LEVEL APPROACH:**
- Assess technical leadership and vision
- Evaluate cross-team collaboration experience
- Look for technical strategy and roadmap thinking
- Assess mentoring and team-building skills
- Expect executive presence and strategic thinking
`,
  };

  return guidance[difficulty] || '';
}

/**
 * Format job description for prompt inclusion
 */
function formatJobDescription(jobDescription: string): string {
  // Clean up and format the job description
  const cleaned = jobDescription.trim();

  // If the job description is too long, truncate it
  const maxLength = 2000;
  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength) + '...\n[Job description truncated for length]';
  }

  return cleaned;
}

/**
 * Validate prompt context
 */
export function validatePromptContext(context: PromptContext): void {
  if (!context.jobDescription || context.jobDescription.trim().length === 0) {
    throw new Error('Job description is required for grounded prompts');
  }

  if (context.jobDescription.length < 50) {
    throw new Error(
      'Job description is too brief. Please provide more details about the position.'
    );
  }

  if (context.jobDescription.length > 10000) {
    throw new Error(
      'Job description is too long. Please provide a concise summary under 10,000 characters.'
    );
  }
}

/**
 * Extract key requirements from job description
 */
export function extractKeyRequirements(jobDescription: string): string[] {
  const requirements: string[] = [];
  const lowerDesc = jobDescription.toLowerCase();

  // Common requirement patterns
  const patterns = [
    /required?\s*:?\s*([^.]+\.)/gi,
    /qualifications?\s*:?\s*([^.]+\.)/gi,
    /skills?\s*:?\s*([^.]+\.)/gi,
    /responsibilities?\s*:?\s*([^.]+\.)/gi,
  ];

  for (const pattern of patterns) {
    const matches = jobDescription.match(pattern);
    if (matches) {
      requirements.push(...matches);
    }
  }

  return requirements.slice(0, 5); // Return top 5 requirement sections
}
