import { z } from 'zod';
import { JSONRPC_VERSION, MessageIdSchema, RpcErrorSchema, type MessageId, type RpcError } from './types';

/**
 * JSON-RPC 2.0 Response schemas for WebSocket API.
 */

// Success response
export const SuccessResponseSchema = z.object({
  jsonrpc: z.literal(JSONRPC_VERSION),
  id: MessageIdSchema,
  result: z.unknown()
});
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

// Error response
export const ErrorResponseSchema = z.object({
  jsonrpc: z.literal(JSONRPC_VERSION),
  id: MessageIdSchema.nullable(),
  error: RpcErrorSchema
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Combined response type
export const ResponseSchema = z.union([SuccessResponseSchema, ErrorResponseSchema]);
export type Response = z.infer<typeof ResponseSchema>;

// Notification (server → client, no id)
export const NotificationSchema = z.object({
  jsonrpc: z.literal(JSONRPC_VERSION),
  method: z.string(),
  params: z.record(z.unknown())
});
export type Notification = z.infer<typeof NotificationSchema>;

// Helper to create success response
export function createSuccessResponse(id: MessageId, result: unknown): SuccessResponse {
  return {
    jsonrpc: JSONRPC_VERSION,
    id,
    result
  };
}

// Helper to create error response
export function createErrorResponse(id: MessageId | null, error: RpcError): ErrorResponse {
  return {
    jsonrpc: JSONRPC_VERSION,
    id,
    error
  };
}

// Helper to create notification
export function createNotification(method: string, params: Record<string, unknown>): Notification {
  return {
    jsonrpc: JSONRPC_VERSION,
    method,
    params
  };
}

// Common result schemas for type safety
export const SuccessResultSchema = z.object({
  success: z.boolean()
});
export type SuccessResult = z.infer<typeof SuccessResultSchema>;

export const IdResultSchema = z.object({
  id: z.string().uuid()
});
export type IdResult = z.infer<typeof IdResultSchema>;

export const GenerationIdResultSchema = z.object({
  generationId: z.string().uuid()
});
export type GenerationIdResult = z.infer<typeof GenerationIdResultSchema>;

// Generation progress notification params
export const GenerationProgressParamsSchema = z.object({
  generationId: z.string().uuid(),
  stage: z.enum(['outline', 'beats', 'draft', 'review']),
  progress: z.number().min(0).max(100),
  tokens: z.number().optional(),
  chunk: z.string().optional()
});
export type GenerationProgressParams = z.infer<typeof GenerationProgressParamsSchema>;

// Generation complete notification params
export const GenerationCompleteParamsSchema = z.object({
  generationId: z.string().uuid(),
  structureId: z.string().uuid(),
  contentId: z.string().uuid(),
  wordCount: z.number()
});
export type GenerationCompleteParams = z.infer<typeof GenerationCompleteParamsSchema>;

// Generation error notification params
export const GenerationErrorParamsSchema = z.object({
  generationId: z.string().uuid(),
  error: z.string(),
  stage: z.enum(['outline', 'beats', 'draft', 'review']).optional()
});
export type GenerationErrorParams = z.infer<typeof GenerationErrorParamsSchema>;

// Entity updated notification params
export const EntityUpdatedParamsSchema = z.object({
  projectId: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  action: z.enum(['created', 'updated', 'deleted'])
});
export type EntityUpdatedParams = z.infer<typeof EntityUpdatedParamsSchema>;
