/**
 * CLI Client Management
 *
 * Manages the WebSocket client connection for CLI commands.
 * Provides connection lifecycle and error handling.
 */

import WebSocket from 'ws';
import { createFullClient, type FullClient } from '@repo/framework-client';
import { loadConfig } from './config.js';

// Make WebSocket available globally for the client library
(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;

let clientInstance: FullClient | null = null;

/**
 * Get or create the client connection
 */
export async function getClient(): Promise<FullClient> {
  if (clientInstance && clientInstance.isConnected()) {
    return clientInstance;
  }

  const config = loadConfig();

  clientInstance = createFullClient({
    url: config.serverUrl,
    autoReconnect: false,
    requestTimeout: 30000
  });

  await clientInstance.connect();
  return clientInstance;
}

/**
 * Disconnect the client
 */
export function disconnectClient(): void {
  if (clientInstance) {
    clientInstance.disconnect();
    clientInstance = null;
  }
}

/**
 * Run a command with automatic connection management
 */
export async function withClient<T>(
  fn: (client: FullClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    return await fn(client);
  } finally {
    disconnectClient();
  }
}
