import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCircuitBreaker, CircuitOpenError } from './circuit-breaker';

describe('circuit-breaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createCircuitBreaker', () => {
    it('starts in closed state', () => {
      const breaker = createCircuitBreaker();
      expect(breaker.getState()).toBe('closed');
      expect(breaker.isAllowed()).toBe(true);
    });

    it('allows calls when closed', async () => {
      const breaker = createCircuitBreaker();
      const fn = vi.fn().mockResolvedValue('success');

      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
    });

    it('opens after threshold failures', async () => {
      const breaker = createCircuitBreaker({ failureThreshold: 3 });
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow('fail');
      }

      expect(breaker.getState()).toBe('open');
      expect(breaker.isAllowed()).toBe(false);
    });

    it('throws CircuitOpenError when circuit is open', async () => {
      const breaker = createCircuitBreaker({ failureThreshold: 1 });
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(breaker.execute(fn)).rejects.toThrow('fail');

      expect(breaker.getState()).toBe('open');

      await expect(breaker.execute(fn)).rejects.toThrow(CircuitOpenError);
    });

    it('transitions to half-open after reset timeout', async () => {
      const breaker = createCircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 5000,
      });
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(breaker.execute(fn)).rejects.toThrow('fail');
      expect(breaker.getState()).toBe('open');

      // Advance time past reset timeout
      vi.advanceTimersByTime(6000);

      // Check state triggers transition
      expect(breaker.isAllowed()).toBe(true);
      expect(breaker.getState()).toBe('half-open');
    });

    it('closes circuit after successful calls in half-open', async () => {
      const breaker = createCircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 5000,
        successThreshold: 2,
      });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const successFn = vi.fn().mockResolvedValue('success');

      // Open the circuit
      await expect(breaker.execute(failFn)).rejects.toThrow('fail');
      expect(breaker.getState()).toBe('open');

      // Wait for half-open
      vi.advanceTimersByTime(6000);
      expect(breaker.isAllowed()).toBe(true);

      // Successful calls should close circuit
      await breaker.execute(successFn);
      expect(breaker.getState()).toBe('half-open');

      await breaker.execute(successFn);
      expect(breaker.getState()).toBe('closed');
    });

    it('reopens circuit on failure in half-open state', async () => {
      const breaker = createCircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 5000,
      });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      await expect(breaker.execute(failFn)).rejects.toThrow('fail');
      expect(breaker.getState()).toBe('open');

      // Wait for half-open
      vi.advanceTimersByTime(6000);
      expect(breaker.isAllowed()).toBe(true);

      // Failure in half-open should reopen
      await expect(breaker.execute(failFn)).rejects.toThrow('fail');
      expect(breaker.getState()).toBe('open');
    });

    it('resets circuit to initial state', async () => {
      const breaker = createCircuitBreaker({ failureThreshold: 1 });
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(breaker.execute(fn)).rejects.toThrow('fail');
      expect(breaker.getState()).toBe('open');

      breaker.reset();

      expect(breaker.getState()).toBe('closed');
      expect(breaker.isAllowed()).toBe(true);
    });

    it('provides accurate stats', async () => {
      const breaker = createCircuitBreaker({ failureThreshold: 3 });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const successFn = vi.fn().mockResolvedValue('success');

      await breaker.execute(successFn);
      await breaker.execute(successFn);
      await expect(breaker.execute(failFn)).rejects.toThrow();
      await expect(breaker.execute(failFn)).rejects.toThrow();

      const stats = breaker.getStats();
      expect(stats.state).toBe('closed');
      expect(stats.recentFailures).toBe(2);
      expect(stats.isHealthy).toBe(true);
    });

    it('clears old failures outside window', async () => {
      const breaker = createCircuitBreaker({
        failureThreshold: 3,
        failureWindow: 5000,
      });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(breaker.execute(failFn)).rejects.toThrow();
      await expect(breaker.execute(failFn)).rejects.toThrow();

      // Advance time past failure window
      vi.advanceTimersByTime(6000);

      // This failure should not open the circuit because old ones expired
      await expect(breaker.execute(failFn)).rejects.toThrow();

      expect(breaker.getState()).toBe('closed');
    });

    it('calculates time until retry correctly', async () => {
      const breaker = createCircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 10000,
      });
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(breaker.execute(failFn)).rejects.toThrow();
      expect(breaker.getState()).toBe('open');

      vi.advanceTimersByTime(3000);

      const timeUntilRetry = breaker.getTimeUntilRetry();
      expect(timeUntilRetry).toBe(7000);
    });
  });
});
