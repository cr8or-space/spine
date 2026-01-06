/**
 * Token counting utilities
 *
 * Provides approximate token counting for text and messages.
 * Uses a simple heuristic (1 token ≈ 4 characters) which works
 * reasonably well for English text.
 */

import type { ChatMessage } from './types';

/**
 * Average characters per token (approximation)
 */
const CHARS_PER_TOKEN = 4;

/**
 * Token overhead per message (role, formatting, etc.)
 */
const MESSAGE_OVERHEAD = 4;

/**
 * Token overhead for the entire request
 */
const REQUEST_OVERHEAD = 3;

/**
 * Count tokens in a text string (approximation)
 */
export function countTokens(text: string): number {
  // Simple heuristic: 1 token ≈ 4 characters
  // This is approximate but works reasonably well for English
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Count tokens in a chat message
 */
export function countMessageTokens(message: ChatMessage): number {
  const contentTokens = countTokens(message.content);
  const roleTokens = countTokens(message.role);
  return contentTokens + roleTokens + MESSAGE_OVERHEAD;
}

/**
 * Count tokens in an array of messages
 */
export function countMessagesTokens(messages: ChatMessage[]): number {
  const messageTokens = messages.reduce((sum, msg) => sum + countMessageTokens(msg), 0);
  return messageTokens + REQUEST_OVERHEAD;
}

/**
 * Estimate completion tokens based on max_tokens parameter
 */
export function estimateCompletionTokens(maxTokens?: number): number {
  // If max_tokens is specified, use it as upper bound
  // Otherwise, assume a reasonable default
  return maxTokens ?? 500;
}

/**
 * Calculate total token budget for a request
 */
export function calculateTotalTokens(
  messages: ChatMessage[],
  maxTokens?: number
): {
  promptTokens: number;
  maxCompletionTokens: number;
  totalTokens: number;
} {
  const promptTokens = countMessagesTokens(messages);
  const maxCompletionTokens = estimateCompletionTokens(maxTokens);

  return {
    promptTokens,
    maxCompletionTokens,
    totalTokens: promptTokens + maxCompletionTokens,
  };
}

/**
 * Check if messages fit within a token budget
 */
export function fitsWithinBudget(
  messages: ChatMessage[],
  budget: number,
  maxTokens?: number
): boolean {
  const { totalTokens } = calculateTotalTokens(messages, maxTokens);
  return totalTokens <= budget;
}

/**
 * Truncate messages to fit within a token budget
 *
 * Removes messages from the middle (keeping system and recent messages)
 * until the total fits within the budget.
 */
export function truncateMessages(
  messages: ChatMessage[],
  budget: number,
  maxTokens?: number
): ChatMessage[] {
  if (fitsWithinBudget(messages, budget, maxTokens)) {
    return messages;
  }

  // Always keep system messages (at the start) and recent messages (at the end)
  const systemMessages = messages.filter((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');

  // Keep at least the last 2 messages
  const keepRecent = 2;
  const recentMessages = nonSystemMessages.slice(-keepRecent);

  // Try to fit middle messages
  const middleMessages: ChatMessage[] = [];
  for (let i = nonSystemMessages.length - keepRecent - 1; i >= 0; i--) {
    const candidate = [...systemMessages, nonSystemMessages[i], ...middleMessages, ...recentMessages];
    if (fitsWithinBudget(candidate, budget, maxTokens)) {
      middleMessages.unshift(nonSystemMessages[i]);
    } else {
      break;
    }
  }

  return [...systemMessages, ...middleMessages, ...recentMessages];
}
