import { z } from 'zod';

import { IdSchema, TimestampSchema } from './common';

/**
 * Geographic or logical relationship between locations
 */
export const LocationRelationSchema = z.object({
  targetId: IdSchema,
  type: z.enum(['contains', 'adjacent', 'connected', 'part-of', 'near']),
  description: z.string().optional(),
  /** Travel time/distance if relevant */
  distance: z.string().optional(),
});
export type LocationRelation = z.infer<typeof LocationRelationSchema>;

/**
 * Notable feature of a location
 */
export const LocationFeatureSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  significance: z.enum(['landmark', 'functional', 'atmospheric', 'plot-relevant']),
});
export type LocationFeature = z.infer<typeof LocationFeatureSchema>;

/**
 * Location entity in the story bible
 */
export const LocationSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  aliases: z.array(z.string()),
  description: z.string(),
  /** Type of location */
  type: z.enum([
    'world',
    'continent',
    'country',
    'region',
    'city',
    'district',
    'building',
    'room',
    'natural',
    'virtual',
    'other',
  ]),
  /** Parent location ID if nested */
  parentId: IdSchema.optional(),
  /** Relationships to other locations */
  relations: z.array(LocationRelationSchema),
  /** Notable features */
  features: z.array(LocationFeatureSchema),
  /** Atmospheric description for consistent setting */
  atmosphere: z.string().optional(),
  /** Characters associated with this location */
  associatedCharacters: z.array(IdSchema),
  /** Whether location is currently accessible in the story */
  status: z.enum(['accessible', 'destroyed', 'hidden', 'restricted', 'unknown']),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Location = z.infer<typeof LocationSchema>;

/**
 * Minimal location for context assembly
 */
export const LocationSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  type: LocationSchema.shape.type,
  parentId: IdSchema.optional(),
  brief: z.string(),
});
export type LocationSummary = z.infer<typeof LocationSummarySchema>;
