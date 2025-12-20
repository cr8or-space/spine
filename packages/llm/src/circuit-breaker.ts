/**
 * Circuit breaker for LLM API calls
 *
 * Prevents cascading failures when the LLM service is unavailable.
 * Tracks failure rates and opens the circuit to stop making calls
 * when the service is unhealthy.
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms to wait before trying half-open */
  resetTimeout: number;
  /** Number of successful calls in half-open to close the circuit */
  successThreshold: number;
  /** Time window in ms to track failures */
  failureWindow: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  successThreshold: 2,
  failureWindow: 60000, // 1 minute
};

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  recentFailures: number[];
}

export interface CircuitBreakerStats {
  state: CircuitState;
  totalFailures: number;
  recentFailures: number;
  consecutiveSuccesses: number;
  isHealthy: boolean;
  timeUntilRetry: number | null;
}

/**
 * Circuit breaker error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(
    message: string,
    public readonly timeUntilRetry: number
  ) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Create a circuit breaker
 */
export function createCircuitBreaker(config: Partial<CircuitBreakerConfig> = {}) {
  const cfg: CircuitBreakerConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };

  const state: CircuitBreakerState = {
    state: 'closed',
    failures: 0,
    successes: 0,
    lastFailureTime: null,
    lastStateChange: Date.now(),
    recentFailures: [],
  };

  /**
   * Clean up old failure timestamps outside the window
   */
  function cleanupFailures(): void {
    const cutoff = Date.now() - cfg.failureWindow;
    state.recentFailures = state.recentFailures.filter((t) => t > cutoff);
  }

  /**
   * Check if circuit should transition from open to half-open
   */
  function checkOpenTimeout(): void {
    if (state.state === 'open') {
      const elapsed = Date.now() - state.lastStateChange;
      if (elapsed >= cfg.resetTimeout) {
        state.state = 'half-open';
        state.successes = 0;
        state.lastStateChange = Date.now();
      }
    }
  }

  /**
   * Record a successful call
   */
  function recordSuccess(): void {
    state.successes++;

    if (state.state === 'half-open') {
      if (state.successes >= cfg.successThreshold) {
        state.state = 'closed';
        state.failures = 0;
        state.successes = 0;
        state.recentFailures = [];
        state.lastStateChange = Date.now();
      }
    }
  }

  /**
   * Record a failed call
   */
  function recordFailure(): void {
    const now = Date.now();
    state.failures++;
    state.successes = 0;
    state.lastFailureTime = now;
    state.recentFailures.push(now);

    cleanupFailures();

    if (state.state === 'half-open') {
      // Any failure in half-open reopens the circuit
      state.state = 'open';
      state.lastStateChange = now;
    } else if (state.state === 'closed') {
      // Check if we've exceeded threshold in window
      if (state.recentFailures.length >= cfg.failureThreshold) {
        state.state = 'open';
        state.lastStateChange = now;
      }
    }
  }

  /**
   * Check if a call is allowed
   */
  function isAllowed(): boolean {
    checkOpenTimeout();

    if (state.state === 'open') {
      return false;
    }

    // In half-open, allow limited calls
    if (state.state === 'half-open') {
      return true;
    }

    return true;
  }

  /**
   * Get time until retry is allowed (when circuit is open)
   */
  function getTimeUntilRetry(): number | null {
    if (state.state !== 'open') {
      return null;
    }

    const elapsed = Date.now() - state.lastStateChange;
    return Math.max(0, cfg.resetTimeout - elapsed);
  }

  /**
   * Get current stats
   */
  function getStats(): CircuitBreakerStats {
    checkOpenTimeout();
    cleanupFailures();

    return {
      state: state.state,
      totalFailures: state.failures,
      recentFailures: state.recentFailures.length,
      consecutiveSuccesses: state.successes,
      isHealthy: state.state === 'closed',
      timeUntilRetry: getTimeUntilRetry(),
    };
  }

  /**
   * Reset the circuit breaker to initial state
   */
  function reset(): void {
    state.state = 'closed';
    state.failures = 0;
    state.successes = 0;
    state.lastFailureTime = null;
    state.lastStateChange = Date.now();
    state.recentFailures = [];
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async function execute<T>(fn: () => Promise<T>): Promise<T> {
    checkOpenTimeout();

    if (!isAllowed()) {
      const timeUntilRetry = getTimeUntilRetry() || cfg.resetTimeout;
      throw new CircuitOpenError(
        `Circuit breaker is open. LLM service is unavailable. Retry in ${Math.ceil(timeUntilRetry / 1000)} seconds.`,
        timeUntilRetry
      );
    }

    try {
      const result = await fn();
      recordSuccess();
      return result;
    } catch (error) {
      recordFailure();
      throw error;
    }
  }

  return {
    execute,
    recordSuccess,
    recordFailure,
    isAllowed,
    getStats,
    reset,
    getTimeUntilRetry,
    getState: () => state.state,
  };
}

export type CircuitBreaker = ReturnType<typeof createCircuitBreaker>;
