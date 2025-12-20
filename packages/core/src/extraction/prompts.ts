/**
 * Prompts for entity extraction from content
 */

import type { Bible, ExtractionSettings } from '@repo/types';

/**
 * Format existing bible context for extraction comparison
 */
function formatExistingEntities(bible: Bible, entityTypes: string[]): string {
  const sections: string[] = [];

  if (entityTypes.includes('character') && bible.characters.length > 0) {
    const list = bible.characters
      .map((c) => {
        const aliases = c.aliases.length > 0 ? ` [aliases: ${c.aliases.join(', ')}]` : '';
        return `- ID:${c.id} "${c.name}"${aliases} (${c.role})`;
      })
      .join('\n');
    sections.push(`## Existing Characters\n${list}`);
  }

  if (entityTypes.includes('location') && bible.locations.length > 0) {
    const list = bible.locations
      .map((l) => {
        const aliases = l.aliases.length > 0 ? ` [aliases: ${l.aliases.join(', ')}]` : '';
        return `- ID:${l.id} "${l.name}"${aliases} (${l.type})`;
      })
      .join('\n');
    sections.push(`## Existing Locations\n${list}`);
  }

  if (entityTypes.includes('faction') && bible.factions.length > 0) {
    const list = bible.factions.map((f) => `- ID:${f.id} "${f.name}" (${f.type})`).join('\n');
    sections.push(`## Existing Factions\n${list}`);
  }

  if (entityTypes.includes('world-rule') && bible.worldRules.length > 0) {
    const list = bible.worldRules.map((r) => `- ID:${r.id} "${r.name}" (${r.category})`).join('\n');
    sections.push(`## Existing World Rules\n${list}`);
  }

  if (entityTypes.includes('plot-thread') && bible.plotThreads.length > 0) {
    const list = bible.plotThreads.map((t) => `- ID:${t.id} "${t.name}" (${t.type}, ${t.status})`).join('\n');
    sections.push(`## Existing Plot Threads\n${list}`);
  }

  return sections.length > 0 ? sections.join('\n\n') : 'No existing entities.';
}

/**
 * Get aggressiveness guidance
 */
function getAggressivenessGuidance(level: ExtractionSettings['aggressiveness']): string {
  switch (level) {
    case 'conservative':
      return `Be CONSERVATIVE: Only suggest entities that are:
- Explicitly named and described in detail
- Clearly significant to the story (appear multiple times or drive plot)
- Definitely not variations of existing entities
For updates, only suggest when there's substantial new information, not minor details.`;
    case 'aggressive':
      return `Be THOROUGH: Suggest entities even when:
- They're only mentioned briefly
- They might be minor background elements
- There's uncertainty about their significance
Better to over-suggest than miss something. Updates should capture any new detail.`;
    case 'moderate':
    default:
      return `Be MODERATE: Suggest entities that are:
- Named and have some description or context
- Seem relevant to the narrative
- Not obvious duplicates of existing entities
For updates, suggest when there's meaningful new information.`;
  }
}

/**
 * Build the entity extraction prompt
 */
export function buildExtractionPrompt(
  content: string,
  structureTitle: string,
  bible: Bible,
  settings: ExtractionSettings,
  entityTypes: string[]
): string {
  const existingContext = formatExistingEntities(bible, entityTypes);
  const aggressiveness = getAggressivenessGuidance(settings.aggressiveness);

  const typeInstructions = entityTypes
    .map((type) => {
      switch (type) {
        case 'character':
          return `- **Characters**: Named individuals with roles in the story. Include name, role (protagonist/antagonist/major/supporting/minor), description, traits, goals.`;
        case 'location':
          return `- **Locations**: Named places. Include name, type (world/continent/country/region/city/district/building/room/natural/virtual/other), description, atmosphere.`;
        case 'faction':
          return `- **Factions**: Organizations, groups, governments. Include name, type (government/military/religious/criminal/corporate/secret-society/guild/family/informal/other), description, goals.`;
        case 'world-rule':
          return `- **World Rules**: Established rules of the world (magic systems, physics, social norms). Include name, category (magic/technology/physics/social/biological/economic/political/metaphysical/other), rule description.`;
        case 'plot-thread':
          return `- **Plot Threads**: Ongoing storylines, mysteries, character arcs. Include name, type (main-plot/subplot/mystery/romance/conflict/character-arc/worldbuilding/other), description.`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n');

  return `You are an expert story analyst extracting narrative entities from fiction content.

## Context: ${structureTitle}

${existingContext}

## Entity Types to Extract
${typeInstructions}

## Extraction Guidance
${aggressiveness}

## Content to Analyze
${content}

## Task
Analyze this content and identify:
1. **NEW entities** not in the existing bible (check carefully for aliases/variations)
2. **UPDATES** to existing entities (new traits, relationships, information revealed)

For each suggestion, provide:
- Whether it's "new" or "update"
- The entity type
- For updates: the existing entity ID
- Evidence: exact quotes from the content
- Confidence: low/medium/high
- Reasoning: why this should be added/updated

Respond with JSON:
{
  "suggestions": [
    {
      "suggestionType": "new",
      "entityType": "character",
      "name": "Entity Name",
      "suggestedData": {
        "name": "...",
        "role": "...",
        "description": "...",
        "traits": ["..."]
      },
      "evidence": [
        { "excerpt": "exact quote from content", "position": 25 }
      ],
      "confidence": "high",
      "reasoning": "Why this entity should be added"
    },
    {
      "suggestionType": "update",
      "entityType": "character",
      "existingEntityId": "char-123",
      "name": "Existing Character Name",
      "fieldUpdates": [
        {
          "field": "traits",
          "currentValue": ["brave"],
          "suggestedValue": ["brave", "cautious"],
          "reason": "New trait revealed in dialogue"
        }
      ],
      "evidence": [
        { "excerpt": "quote showing the new trait", "position": 60 }
      ],
      "confidence": "medium",
      "reasoning": "Evidence supports adding this trait"
    }
  ]
}

Important:
- Only include suggestions for the entity types listed above
- Position is 0-100 representing location in content
- For updates, always reference the existing entity ID
- Be specific with evidence - use actual quotes
- Empty suggestions array is valid if nothing found

Respond with only valid JSON.`;
}

/**
 * System prompt for extraction
 */
export const EXTRACTION_SYSTEM_PROMPT = `You are an expert fiction analyst specializing in identifying and categorizing narrative elements.

Your role is to:
- Carefully read content and identify named entities
- Distinguish between new entities and references to existing ones
- Extract meaningful details about each entity
- Recognize when existing entities have new information revealed
- Provide specific evidence from the text

Be thorough but precise. Avoid:
- Suggesting generic unnamed entities
- Duplicating existing entities under different names
- Over-interpreting minor mentions
- Making assumptions beyond what the text supports

Always respond in valid JSON format.`;
