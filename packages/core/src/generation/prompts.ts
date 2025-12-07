/**
 * Prompt templates for generation stages
 *
 * Templates for outline, beat expansion, draft, and self-review stages.
 */

import type { PromptTemplate, PromptPlaceholders, GenerationStage } from './types';

/**
 * System prompt for story generation
 */
export const BASE_SYSTEM_PROMPT = `You are an expert fiction writer helping to create a web serial novel.
Your writing should be engaging, consistent with established story elements, and maintain proper pacing.
Always respect the constraints provided and maintain continuity with previous content.`;

/**
 * Outline generation template
 */
export const OUTLINE_TEMPLATE: PromptTemplate = {
  id: 'outline-v1',
  stage: 'outline',
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For outline generation:
- Create a high-level structure for the chapter/scene
- Identify key plot points and character moments
- Consider pacing and tension arc
- Note any hooks or revelations to include
- Keep the outline focused and actionable`,
  userPromptTemplate: `## Story Context
{{context}}

## Current Structure
{{structure}}

{{#if constraints}}
## Constraints
{{constraints}}
{{/if}}

{{#if styleGuidance}}
## Style Guidance
{{styleGuidance}}
{{/if}}

## Task
Generate a detailed outline for this section. Include:
1. Opening hook or transition from previous content
2. Key scenes or moments (3-5 bullet points)
3. Character interactions and developments
4. Plot advancement points
5. Ending hook (type: {{hookRequirements}})
{{#if tensionTarget}}
6. Target tension level: {{tensionTarget}}/100
{{/if}}

Format the outline as a structured list with clear, actionable items.`,
  description: 'Generates a high-level outline for a chapter or scene',
};

/**
 * Beat expansion template
 */
export const BEATS_TEMPLATE: PromptTemplate = {
  id: 'beats-v1',
  stage: 'beats',
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For beat expansion:
- Break down outline points into specific story beats
- Each beat should be a distinct moment or development
- Include emotional beats alongside plot beats
- Ensure smooth transitions between beats
- Assign approximate word counts to maintain pacing`,
  userPromptTemplate: `## Story Context
{{context}}

## Current Structure
{{structure}}

## Outline to Expand
{{beats}}

{{#if constraints}}
## Constraints
{{constraints}}
{{/if}}

## Task
Expand the outline into detailed story beats. For each beat, provide:
1. A brief description of what happens
2. Characters involved
3. Emotional tone
4. Approximate word count (total target: {{targetWordCount}} words)

Format as a numbered list of beats that can be written sequentially.
Each beat should be concrete enough to write directly from.`,
  description: 'Expands an outline into detailed story beats',
};

/**
 * Draft generation template
 */
export const DRAFT_TEMPLATE: PromptTemplate = {
  id: 'draft-v1',
  stage: 'draft',
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For draft generation:
- Write engaging, polished prose
- Show, don't tell where appropriate
- Maintain consistent character voices
- Follow the beat sheet closely
- Hit the target word count
- End with the specified hook type`,
  userPromptTemplate: `## Story Context
{{context}}

## Current Structure
{{structure}}

## Beats to Write
{{beats}}

{{#if constraints}}
## Constraints (MUST follow)
{{constraints}}
{{/if}}

{{#if styleGuidance}}
## Style Guidance
{{styleGuidance}}
{{/if}}

## Task
Write the full prose draft following the beats above.

Requirements:
- Target word count: {{targetWordCount}} words
- Maintain established character voices
- Respect all continuity constraints
- End with a strong {{hookRequirements}} hook
{{#if tensionTarget}}
- Target tension level: {{tensionTarget}}/100
{{/if}}

Write the draft now:`,
  description: 'Generates full prose draft from beats',
};

/**
 * Self-review template
 */
export const SELF_REVIEW_TEMPLATE: PromptTemplate = {
  id: 'self-review-v1',
  stage: 'self-review',
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For self-review:
- Critically evaluate the draft for issues
- Check for continuity errors against the context
- Assess pacing and tension
- Verify character voice consistency
- Evaluate hook strength
- Provide specific, actionable feedback
- Be honest about quality issues`,
  userPromptTemplate: `## Story Context
{{context}}

## Constraints That Must Be Followed
{{constraints}}

## Draft to Review
{{draft}}

## Task
Critically review this draft and provide structured feedback.

Evaluate:
1. **Continuity**: Does it contradict any established facts?
2. **Pacing**: Is the tension appropriate? Are there slow spots?
3. **Voice**: Do characters sound like themselves?
4. **Clarity**: Is the prose clear and engaging?
5. **Hook**: How strong is the ending hook?

Respond in this exact JSON format:
{
  "qualityScore": <0-100>,
  "issues": [
    {
      "type": "<continuity|pacing|voice|clarity|hook|tension|other>",
      "severity": <0-100>,
      "description": "<specific issue>",
      "paragraphIndex": <optional paragraph number>,
      "suggestedFix": "<how to fix>"
    }
  ],
  "suggestions": ["<general improvement suggestion>"],
  "shouldRegenerate": <true if quality < 50 or critical issues>,
  "problematicParagraphs": [<indices of paragraphs needing work>]
}`,
  description: 'Self-reviews generated draft for issues',
};

/**
 * Revision template (for fixing issues found in self-review)
 */
export const REVISION_TEMPLATE: PromptTemplate = {
  id: 'revision-v1',
  stage: 'revision',
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For revision:
- Address specific issues identified in review
- Maintain consistency with unchanged content
- Improve weak areas while preserving strengths
- Focus on the problematic sections`,
  userPromptTemplate: `## Story Context
{{context}}

## Original Draft
{{draft}}

## Issues to Fix
{{#each issues}}
- **{{type}}** (severity: {{severity}}): {{description}}
  {{#if suggestedFix}}Fix: {{suggestedFix}}{{/if}}
{{/each}}

## Suggestions
{{#each suggestions}}
- {{this}}
{{/each}}

## Task
Revise the draft to address the issues above.
Focus particularly on paragraphs: {{problematicParagraphs}}

Write the revised draft:`,
  description: 'Revises draft based on self-review feedback',
};

/**
 * All templates by stage
 */
export const STAGE_TEMPLATES: Record<GenerationStage, PromptTemplate> = {
  outline: OUTLINE_TEMPLATE,
  beats: BEATS_TEMPLATE,
  draft: DRAFT_TEMPLATE,
  'self-review': SELF_REVIEW_TEMPLATE,
  revision: REVISION_TEMPLATE,
};

/**
 * Fill template placeholders
 */
export function fillTemplate(template: string, placeholders: PromptPlaceholders): string {
  let result = template;

  // Simple placeholder replacement
  result = result.replace(/\{\{context\}\}/g, placeholders.context);
  result = result.replace(/\{\{structure\}\}/g, placeholders.structure);
  result = result.replace(/\{\{beats\}\}/g, placeholders.beats || '');
  result = result.replace(/\{\{draft\}\}/g, placeholders.draft || '');
  result = result.replace(/\{\{styleGuidance\}\}/g, placeholders.styleGuidance || '');
  result = result.replace(/\{\{targetWordCount\}\}/g, String(placeholders.targetWordCount || 2000));
  result = result.replace(/\{\{constraints\}\}/g, placeholders.constraints || '');
  result = result.replace(/\{\{hookRequirements\}\}/g, placeholders.hookRequirements || 'engaging');
  result = result.replace(/\{\{tensionTarget\}\}/g, String(placeholders.tensionTarget || 50));

  // Handle conditional blocks {{#if variable}}...{{/if}}
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, variable, content) => {
    const value = placeholders[variable as keyof PromptPlaceholders];
    if (value !== undefined && value !== null && value !== '') {
      return content;
    }
    return '';
  });

  // Handle each blocks {{#each variable}}...{{/each}}
  result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, variable, content) => {
    const value = placeholders[variable as keyof PromptPlaceholders];
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          let itemContent = content;
          if (typeof item === 'object') {
            for (const [key, val] of Object.entries(item)) {
              itemContent = itemContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val));
            }
          } else {
            itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
          }
          return itemContent;
        })
        .join('\n');
    }
    return '';
  });

  // Clean up any remaining empty lines
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

/**
 * Get template for a stage
 */
export function getStageTemplate(stage: GenerationStage): PromptTemplate {
  return STAGE_TEMPLATES[stage];
}

/**
 * Build messages for a generation stage
 */
export function buildStageMessages(
  stage: GenerationStage,
  placeholders: PromptPlaceholders,
  customSystemPrompt?: string
): { role: 'system' | 'user'; content: string }[] {
  const template = getStageTemplate(stage);
  const systemPrompt = customSystemPrompt || template.systemPrompt;
  const userPrompt = fillTemplate(template.userPromptTemplate, placeholders);

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}
