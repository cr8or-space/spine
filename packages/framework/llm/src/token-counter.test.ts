/**
 * Token counter tests
 */

import { describe, expect, it } from 'vitest';

import type { ChatMessage } from './types';
import {
  calculateTotalTokens,
  countMessageTokens,
  countMessagesTokens,
  countTokens,
  fitsWithinBudget,
  truncateMessages,
} from './token-counter';

describe('token-counter', () => {
  describe('countTokens', () => {
    it('should count tokens in simple text', () => {
      const text = 'Hello world';
      const tokens = countTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('should return 0 for empty string', () => {
      expect(countTokens('')).toBe(0);
    });

    it('should handle long text', () => {
      const text = 'A'.repeat(1000);
      const tokens = countTokens(text);
      expect(tokens).toBeGreaterThan(100);
      expect(tokens).toBeLessThan(400);
    });
  });

  describe('countMessageTokens', () => {
    it('should count tokens in a message', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Hello, how are you?',
      };
      const tokens = countMessageTokens(message);
      expect(tokens).toBeGreaterThan(5);
    });

    it('should include overhead for role and formatting', () => {
      const shortMessage: ChatMessage = {
        role: 'user',
        content: 'Hi',
      };
      const tokens = countMessageTokens(shortMessage);
      // Should be more than just the content tokens due to overhead
      expect(tokens).toBeGreaterThan(4);
    });
  });

  describe('countMessagesTokens', () => {
    it('should count tokens in multiple messages', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi! How can I help?' },
      ];
      const tokens = countMessagesTokens(messages);
      expect(tokens).toBeGreaterThan(20);
    });

    it('should include request overhead', () => {
      const singleMessage: ChatMessage[] = [
        { role: 'user', content: 'Hi' },
      ];
      const singleTokens = countMessageTokens(singleMessage[0]);
      const totalTokens = countMessagesTokens(singleMessage);
      expect(totalTokens).toBeGreaterThan(singleTokens);
    });
  });

  describe('calculateTotalTokens', () => {
    it('should calculate total tokens with defaults', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello!' },
      ];
      const result = calculateTotalTokens(messages);
      expect(result.promptTokens).toBeGreaterThan(0);
      expect(result.maxCompletionTokens).toBe(500);
      expect(result.totalTokens).toBe(result.promptTokens + result.maxCompletionTokens);
    });

    it('should use provided max_tokens', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello!' },
      ];
      const result = calculateTotalTokens(messages, 100);
      expect(result.maxCompletionTokens).toBe(100);
    });
  });

  describe('fitsWithinBudget', () => {
    it('should return true when messages fit budget', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hi' },
      ];
      const fits = fitsWithinBudget(messages, 10000);
      expect(fits).toBe(true);
    });

    it('should return false when messages exceed budget', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'A'.repeat(10000) },
      ];
      const fits = fitsWithinBudget(messages, 100);
      expect(fits).toBe(false);
    });
  });

  describe('truncateMessages', () => {
    it('should not truncate when messages fit budget', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ];
      const truncated = truncateMessages(messages, 10000);
      expect(truncated.length).toBe(messages.length);
    });

    it('should keep system messages', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'A'.repeat(1000) },
        { role: 'assistant', content: 'B'.repeat(1000) },
        { role: 'user', content: 'C'.repeat(1000) },
        { role: 'assistant', content: 'Recent' },
      ];
      const truncated = truncateMessages(messages, 200, 50);

      // Should keep system message
      expect(truncated[0].role).toBe('system');

      // Should keep recent messages
      expect(truncated[truncated.length - 1].content).toBe('Recent');
    });

    it('should keep at least 2 recent messages', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'A'.repeat(1000) },
        { role: 'assistant', content: 'B'.repeat(1000) },
        { role: 'user', content: 'C'.repeat(1000) },
        { role: 'assistant', content: 'D'.repeat(1000) },
        { role: 'user', content: 'Recent 1' },
        { role: 'assistant', content: 'Recent 2' },
      ];
      const truncated = truncateMessages(messages, 200, 50);

      expect(truncated.length).toBeGreaterThanOrEqual(2);
      expect(truncated[truncated.length - 2].content).toBe('Recent 1');
      expect(truncated[truncated.length - 1].content).toBe('Recent 2');
    });
  });
});
