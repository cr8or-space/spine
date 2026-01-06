/**
 * Prompt templates for content analysis
 *
 * These prompts instruct the LLM to analyze content for various quality metrics.
 * All prompts expect JSON responses for structured parsing.
 */

import type { AnalysisInput } from './types';

/**
 * Format bible context for analysis prompts
 */
function formatBibleContext(input: AnalysisInput): string {
  const { bible } = input;
  const sections: string[] = [];

  // Characters
  if (bible.characters.length > 0) {
    const characterList = bible.characters
      .map((c) => {
        const aliases = c.aliases.length > 0 ? ` (${c.aliases.join(', ')})` : '';
        return `- ${c.name}${aliases}: ${c.description.slice(0, 100)}... [${c.role}, ${c.status}]`;
      })
      .join('\n');
    sections.push(`## Characters\n${characterList}`);
  }

  // Locations
  if (bible.locations.length > 0) {
    const locationList = bible.locations
      .map((l) => `- ${l.name}: ${l.description.slice(0, 100)}... [${l.type}]`)
      .join('\n');
    sections.push(`## Locations\n${locationList}`);
  }

  // World Rules
  if (bible.worldRules.length > 0) {
    const ruleList = bible.worldRules
      .filter((r) => r.established)
      .map((r) => `- ${r.name}: ${r.rule}`)
      .join('\n');
    if (ruleList) {
      sections.push(`## Established World Rules\n${ruleList}`);
    }
  }

  return sections.join('\n\n');
}

/**
 * Format structure context for analysis prompts
 */
function formatStructureContext(input: AnalysisInput): string {
  const { structure } = input;
  const lines: string[] = [];

  lines.push(`## Structure`);
  lines.push(`Type: ${structure.type}`);
  lines.push(`Title: ${structure.title}`);
  if (structure.summary) {
    lines.push(`Summary: ${structure.summary}`);
  }
  if (structure.tensionTarget !== undefined) {
    lines.push(`Tension Target: ${structure.tensionTarget}/100`);
  }
  if (structure.chapterType) {
    lines.push(`Chapter Type: ${structure.chapterType}`);
  }
  if (structure.hook) {
    lines.push(`Expected Hook: ${structure.hook.type} - ${structure.hook.description}`);
  }

  return lines.join('\n');
}

/**
 * Format recent content for continuity context
 */
function formatRecentContent(input: AnalysisInput): string {
  if (!input.recentContent || input.recentContent.length === 0) {
    return '';
  }

  const summaries = input.recentContent
    .map((c) => `- ${c.title}: ${c.summary}`)
    .join('\n');

  return `## Recent Chapters\n${summaries}`;
}

/**
 * Build the tension analysis prompt
 */
export function buildTensionPrompt(input: AnalysisInput): string {
  const bibleContext = formatBibleContext(input);
  const structureContext = formatStructureContext(input);

  return `You are a professional fiction editor analyzing narrative tension in a piece of creative writing.

${structureContext}

${bibleContext}

## Content to Analyze
${input.content.text}

## Task
Analyze the narrative tension in this content. Consider:
- Conflict (interpersonal, internal, external)
- Stakes and consequences
- Suspense and uncertainty
- Emotional intensity
- Pacing of tension buildup and release

Provide your analysis as JSON with this structure:
{
  "score": {
    "score": <0-100>,
    "explanation": "<2-3 sentences explaining the score>",
    "factors": [
      { "name": "<factor name>", "impact": <-20 to +20>, "detail": "<brief detail>" }
    ]
  },
  "tensionMoments": [
    {
      "description": "<what happens>",
      "position": <0-100 position in text>,
      "type": "<conflict|suspense|emotional|mystery|action>",
      "intensity": <0-100>
    }
  ]
}

${input.structure.tensionTarget !== undefined ? `Note: The target tension level is ${input.structure.tensionTarget}/100. Factor this into your analysis.` : ''}

Respond with only valid JSON.`;
}

/**
 * Build the hook strength analysis prompt
 */
export function buildHookPrompt(input: AnalysisInput): string {
  const bibleContext = formatBibleContext(input);
  const structureContext = formatStructureContext(input);

  return `You are a professional fiction editor specializing in web serial format, analyzing chapter endings.

${structureContext}

${bibleContext}

## Content to Analyze
${input.content.text}

## Task
Analyze the chapter ending (hook) of this content. A strong hook compels readers to continue to the next chapter.

Hook Types:
- revelation: New information that changes understanding
- decision: Character faces a critical choice
- cliffhanger: Action or danger left unresolved
- emotional: Powerful emotional moment
- question: Mystery or question raised
- twist: Unexpected turn of events
- promise: Setup for something exciting
- none: No clear hook

Provide your analysis as JSON:
{
  "score": {
    "score": <0-100>,
    "explanation": "<2-3 sentences on hook effectiveness>",
    "factors": [
      { "name": "<factor>", "impact": <-20 to +20>, "detail": "<detail>" }
    ]
  },
  "hookType": "<revelation|decision|cliffhanger|emotional|question|twist|promise|none>",
  "improvements": ["<suggestion 1>", "<suggestion 2>"]
}

Respond with only valid JSON.`;
}

/**
 * Build the pacing analysis prompt
 */
export function buildPacingPrompt(input: AnalysisInput): string {
  const structureContext = formatStructureContext(input);

  return `You are a professional fiction editor analyzing pacing and flow in creative writing.

${structureContext}

## Content to Analyze
${input.content.text}

## Task
Analyze the pacing of this content. Consider:
- Balance of action, dialogue, description, and introspection
- Sentence length and rhythm variation
- Scene transitions
- Reader engagement and attention

Provide your analysis as JSON:
{
  "score": {
    "score": <0-100>,
    "explanation": "<2-3 sentences on overall pacing quality>",
    "factors": [
      { "name": "<factor>", "impact": <-20 to +20>, "detail": "<detail>" }
    ]
  },
  "segments": [
    {
      "startPosition": <0-100>,
      "endPosition": <0-100>,
      "type": "<action|dialogue|description|introspection|transition>",
      "speed": "<fast|moderate|slow>"
    }
  ],
  "profile": "<fast|moderate|slow|varied>"
}

Respond with only valid JSON.`;
}

/**
 * Build the continuity checking prompt
 */
export function buildContinuityPrompt(input: AnalysisInput): string {
  const bibleContext = formatBibleContext(input);
  const recentContent = formatRecentContent(input);

  // Build character reference for ID mapping
  const characterMap = input.bible.characters.map((c) => ({
    id: c.id,
    name: c.name,
    aliases: c.aliases,
    role: c.role,
    status: c.status,
    traits: c.traits.slice(0, 3).map((t) => t.name),
    voiceSamples: c.voiceSamples.slice(0, 2),
  }));

  // Build location reference for ID mapping
  const locationMap = input.bible.locations.map((l) => ({
    id: l.id,
    name: l.name,
    aliases: l.aliases,
    type: l.type,
  }));

  // Build world rules reference
  const rulesRef = input.bible.worldRules
    .filter((r) => r.established)
    .map((r) => ({
      id: r.id,
      name: r.name,
      rule: r.rule,
      category: r.category,
    }));

  return `You are a professional fiction editor checking for continuity errors and inconsistencies.

${bibleContext}

${recentContent}

## Character Reference (with IDs for your response)
${JSON.stringify(characterMap, null, 2)}

## Location Reference (with IDs for your response)
${JSON.stringify(locationMap, null, 2)}

## World Rules Reference (with IDs for your response)
${JSON.stringify(rulesRef, null, 2)}

## Content to Analyze
${input.content.text}

## Task
Check this content for continuity issues:
1. Character inconsistencies (wrong traits, behavior out of character, incorrect relationships)
2. Location errors (wrong details, impossible geography)
3. Timeline conflicts (events in wrong order, impossible timing)
4. Fact contradictions (contradicting established facts)
5. World rule violations (breaking established rules)
6. Character voice (does dialogue match character's voice samples?)

Provide your analysis as JSON:
{
  "issues": [
    {
      "type": "<character-inconsistency|location-error|timeline-conflict|fact-contradiction|world-rule-violation|character-voice|relationship-error|other>",
      "severity": "<critical|major|minor|nitpick>",
      "description": "<what's wrong>",
      "conflictsWith": {
        "type": "<character|location|world-rule|content|timeline-event>",
        "id": "<entity ID from reference>",
        "detail": "<what it conflicts with>"
      },
      "suggestion": "<how to fix>"
    }
  ],
  "characterMentions": [
    {
      "characterId": "<ID from reference>",
      "characterName": "<name>",
      "appearanceType": "<mention|scene|pov>",
      "dialogueLines": <count>,
      "consistent": <true|false>,
      "issues": ["<issue if any>"]
    }
  ],
  "locationMentions": [
    {
      "locationId": "<ID from reference>",
      "locationName": "<name>",
      "consistent": <true|false>,
      "issues": ["<issue if any>"]
    }
  ],
  "relevantRules": ["<rule ID>"],
  "score": <0-100 overall continuity score>
}

Only report genuine issues, not stylistic preferences. Be thorough but not overly pedantic.

Respond with only valid JSON.`;
}

/**
 * System prompt for analysis tasks
 */
export const ANALYSIS_SYSTEM_PROMPT = `You are an expert fiction editor with deep knowledge of narrative craft, pacing, tension, and continuity.

Your role is to provide objective, constructive analysis of creative writing. You:
- Give honest assessments backed by specific examples
- Focus on craft elements, not personal taste
- Provide actionable feedback
- Consider the story's context and established world
- Always respond in valid JSON format as specified

When scoring:
- 0-20: Severe issues requiring major revision
- 21-40: Significant problems that should be addressed
- 41-60: Adequate but room for improvement
- 61-80: Good quality with minor issues
- 81-100: Excellent, professional quality`;
