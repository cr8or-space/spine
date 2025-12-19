import { z } from 'zod';
import { JSONRPC_VERSION, MessageIdSchema } from './types';

/**
 * JSON-RPC 2.0 Request schemas for WebSocket API.
 */

// Base request structure
export const BaseRequestSchema = z.object({
  jsonrpc: z.literal(JSONRPC_VERSION),
  id: MessageIdSchema,
  method: z.string(),
  params: z.record(z.unknown()).optional()
});
export type BaseRequest = z.infer<typeof BaseRequestSchema>;

// Project method params
export const ProjectCreateParamsSchema = z.object({
  title: z.string().min(1),
  format: z.enum(['web_serial', 'novel', 'short_story']).default('web_serial'),
  metadata: z
    .object({
      description: z.string().optional(),
      genre: z.string().optional(),
      targetWordCount: z.number().optional()
    })
    .optional()
});
export type ProjectCreateParams = z.infer<typeof ProjectCreateParamsSchema>;

export const ProjectLoadParamsSchema = z.object({
  id: z.string().uuid()
});
export type ProjectLoadParams = z.infer<typeof ProjectLoadParamsSchema>;

export const ProjectDeleteParamsSchema = z.object({
  id: z.string().uuid()
});
export type ProjectDeleteParams = z.infer<typeof ProjectDeleteParamsSchema>;

export const ProjectUpdateSettingsParamsSchema = z.object({
  id: z.string().uuid(),
  settings: z.object({
    llmConfig: z
      .object({
        baseUrl: z.string().optional(),
        apiKey: z.string().optional(),
        model: z.string().optional(),
        maxTokens: z.number().optional()
      })
      .optional(),
    revisionHorizon: z.number().optional(),
    tensionTolerance: z.number().optional()
  })
});
export type ProjectUpdateSettingsParams = z.infer<
  typeof ProjectUpdateSettingsParamsSchema
>;

export const ProjectUpdateMetadataParamsSchema = z.object({
  id: z.string().uuid(),
  metadata: z.object({
    description: z.string().optional(),
    genre: z.string().optional(),
    targetWordCount: z.number().optional()
  })
});
export type ProjectUpdateMetadataParams = z.infer<
  typeof ProjectUpdateMetadataParamsSchema
>;

// Bible method params
export const BibleGetParamsSchema = z.object({
  projectId: z.string().uuid()
});
export type BibleGetParams = z.infer<typeof BibleGetParamsSchema>;

export const BibleEntityListParamsSchema = z.object({
  projectId: z.string().uuid()
});
export type BibleEntityListParams = z.infer<typeof BibleEntityListParamsSchema>;

export const BibleEntityGetParamsSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid()
});
export type BibleEntityGetParams = z.infer<typeof BibleEntityGetParamsSchema>;

export const BibleCharacterCreateParamsSchema = z.object({
  projectId: z.string().uuid(),
  data: z.object({
    name: z.string().min(1),
    role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor']),
    description: z.string().optional(),
    traits: z.array(z.string()).optional(),
    goals: z.array(z.string()).optional(),
    backstory: z.string().optional(),
    voiceNotes: z.string().optional(),
    arcSummary: z.string().optional()
  })
});
export type BibleCharacterCreateParams = z.infer<
  typeof BibleCharacterCreateParamsSchema
>;

export const BibleCharacterUpdateParamsSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  data: z.object({
    name: z.string().min(1).optional(),
    role: z.enum(['protagonist', 'antagonist', 'supporting', 'minor']).optional(),
    description: z.string().optional(),
    traits: z.array(z.string()).optional(),
    goals: z.array(z.string()).optional(),
    backstory: z.string().optional(),
    voiceNotes: z.string().optional(),
    arcSummary: z.string().optional()
  })
});
export type BibleCharacterUpdateParams = z.infer<
  typeof BibleCharacterUpdateParamsSchema
>;

export const BibleEntityDeleteParamsSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid()
});
export type BibleEntityDeleteParams = z.infer<
  typeof BibleEntityDeleteParamsSchema
>;

export const BibleLocationCreateParamsSchema = z.object({
  projectId: z.string().uuid(),
  data: z.object({
    name: z.string().min(1),
    type: z.enum(['city', 'building', 'region', 'landmark', 'other']),
    description: z.string().optional(),
    atmosphere: z.string().optional(),
    significance: z.string().optional(),
    parentLocationId: z.string().uuid().optional()
  })
});
export type BibleLocationCreateParams = z.infer<
  typeof BibleLocationCreateParamsSchema
>;

export const BibleLocationUpdateParamsSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  data: z.object({
    name: z.string().min(1).optional(),
    type: z.enum(['city', 'building', 'region', 'landmark', 'other']).optional(),
    description: z.string().optional(),
    atmosphere: z.string().optional(),
    significance: z.string().optional(),
    parentLocationId: z.string().uuid().nullable().optional()
  })
});
export type BibleLocationUpdateParams = z.infer<
  typeof BibleLocationUpdateParamsSchema
>;

export const BibleFactionCreateParamsSchema = z.object({
  projectId: z.string().uuid(),
  data: z.object({
    name: z.string().min(1),
    type: z.enum([
      'organization',
      'government',
      'religion',
      'criminal',
      'military',
      'other'
    ]),
    description: z.string().optional(),
    goals: z.array(z.string()).optional(),
    values: z.array(z.string()).optional(),
    structure: z.string().optional()
  })
});
export type BibleFactionCreateParams = z.infer<
  typeof BibleFactionCreateParamsSchema
>;

export const BibleFactionUpdateParamsSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  data: z.object({
    name: z.string().min(1).optional(),
    type: z
      .enum([
        'organization',
        'government',
        'religion',
        'criminal',
        'military',
        'other'
      ])
      .optional(),
    description: z.string().optional(),
    goals: z.array(z.string()).optional(),
    values: z.array(z.string()).optional(),
    structure: z.string().optional()
  })
});
export type BibleFactionUpdateParams = z.infer<
  typeof BibleFactionUpdateParamsSchema
>;

export const BibleWorldRuleCreateParamsSchema = z.object({
  projectId: z.string().uuid(),
  data: z.object({
    name: z.string().min(1),
    category: z.enum(['magic', 'physics', 'social', 'economic', 'other']),
    description: z.string().optional(),
    constraints: z.array(z.string()).optional(),
    exceptions: z.array(z.string()).optional()
  })
});
export type BibleWorldRuleCreateParams = z.infer<
  typeof BibleWorldRuleCreateParamsSchema
>;

export const BibleWorldRuleUpdateParamsSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  data: z.object({
    name: z.string().min(1).optional(),
    category: z.enum(['magic', 'physics', 'social', 'economic', 'other']).optional(),
    description: z.string().optional(),
    constraints: z.array(z.string()).optional(),
    exceptions: z.array(z.string()).optional()
  })
});
export type BibleWorldRuleUpdateParams = z.infer<
  typeof BibleWorldRuleUpdateParamsSchema
>;

export const BiblePlotThreadCreateParamsSchema = z.object({
  projectId: z.string().uuid(),
  data: z.object({
    name: z.string().min(1),
    type: z.enum(['main', 'subplot', 'character_arc', 'mystery', 'romance']),
    description: z.string().optional(),
    status: z.enum(['setup', 'active', 'climax', 'resolved']).optional(),
    startChapter: z.number().optional(),
    endChapter: z.number().optional()
  })
});
export type BiblePlotThreadCreateParams = z.infer<
  typeof BiblePlotThreadCreateParamsSchema
>;

export const BiblePlotThreadUpdateParamsSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  data: z.object({
    name: z.string().min(1).optional(),
    type: z
      .enum(['main', 'subplot', 'character_arc', 'mystery', 'romance'])
      .optional(),
    description: z.string().optional(),
    status: z.enum(['setup', 'active', 'climax', 'resolved']).optional(),
    startChapter: z.number().optional(),
    endChapter: z.number().nullable().optional()
  })
});
export type BiblePlotThreadUpdateParams = z.infer<
  typeof BiblePlotThreadUpdateParamsSchema
>;

export const BibleTimelineEventCreateParamsSchema = z.object({
  projectId: z.string().uuid(),
  data: z.object({
    name: z.string().min(1),
    date: z.string(),
    description: z.string().optional(),
    significance: z.enum(['major', 'moderate', 'minor']).optional(),
    relatedCharacterIds: z.array(z.string().uuid()).optional(),
    relatedLocationIds: z.array(z.string().uuid()).optional()
  })
});
export type BibleTimelineEventCreateParams = z.infer<
  typeof BibleTimelineEventCreateParamsSchema
>;

export const BibleTimelineEventUpdateParamsSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  data: z.object({
    name: z.string().min(1).optional(),
    date: z.string().optional(),
    description: z.string().optional(),
    significance: z.enum(['major', 'moderate', 'minor']).optional(),
    relatedCharacterIds: z.array(z.string().uuid()).optional(),
    relatedLocationIds: z.array(z.string().uuid()).optional()
  })
});
export type BibleTimelineEventUpdateParams = z.infer<
  typeof BibleTimelineEventUpdateParamsSchema
>;

// Structure method params
export const StructureGetTreeParamsSchema = z.object({
  projectId: z.string().uuid()
});
export type StructureGetTreeParams = z.infer<typeof StructureGetTreeParamsSchema>;

export const StructureGetAllParamsSchema = z.object({
  projectId: z.string().uuid()
});
export type StructureGetAllParams = z.infer<typeof StructureGetAllParamsSchema>;

export const StructureGetParamsSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid()
});
export type StructureGetParams = z.infer<typeof StructureGetParamsSchema>;

export const StructureCreateParamsSchema = z.object({
  projectId: z.string().uuid(),
  data: z.object({
    title: z.string().min(1),
    type: z.enum(['book', 'arc', 'chapter', 'scene']),
    parentId: z.string().uuid().nullable().optional(),
    order: z.number().optional(),
    synopsis: z.string().optional(),
    tensionTarget: z.number().min(0).max(100).optional(),
    chapterType: z.enum(['action', 'character', 'worldbuilding', 'transition']).optional()
  })
});
export type StructureCreateParams = z.infer<typeof StructureCreateParamsSchema>;

export const StructureUpdateParamsSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  data: z.object({
    title: z.string().min(1).optional(),
    synopsis: z.string().optional(),
    tensionTarget: z.number().min(0).max(100).optional(),
    chapterType: z
      .enum(['action', 'character', 'worldbuilding', 'transition'])
      .optional()
  })
});
export type StructureUpdateParams = z.infer<typeof StructureUpdateParamsSchema>;

export const StructureDeleteParamsSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid()
});
export type StructureDeleteParams = z.infer<typeof StructureDeleteParamsSchema>;

export const StructureReorderParamsSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid(),
  newOrder: z.number(),
  newParentId: z.string().uuid().nullable().optional()
});
export type StructureReorderParams = z.infer<typeof StructureReorderParamsSchema>;

export const StructureAddBeatParamsSchema = z.object({
  projectId: z.string().uuid(),
  structureId: z.string().uuid(),
  description: z.string().min(1),
  targetWordCount: z.number().optional()
});
export type StructureAddBeatParams = z.infer<typeof StructureAddBeatParamsSchema>;

export const StructureRemoveBeatParamsSchema = z.object({
  projectId: z.string().uuid(),
  structureId: z.string().uuid(),
  beatId: z.string().uuid()
});
export type StructureRemoveBeatParams = z.infer<
  typeof StructureRemoveBeatParamsSchema
>;

export const StructureSetHookParamsSchema = z.object({
  projectId: z.string().uuid(),
  structureId: z.string().uuid(),
  hook: z
    .object({
      type: z.enum(['revelation', 'decision', 'cliffhanger', 'emotional']),
      description: z.string().optional()
    })
    .nullable()
    .optional()
});
export type StructureSetHookParams = z.infer<typeof StructureSetHookParamsSchema>;

// Content method params
export const ContentGetParamsSchema = z.object({
  projectId: z.string().uuid(),
  structureId: z.string().uuid()
});
export type ContentGetParams = z.infer<typeof ContentGetParamsSchema>;

export const ContentSaveParamsSchema = z.object({
  projectId: z.string().uuid(),
  structureId: z.string().uuid(),
  text: z.string()
});
export type ContentSaveParams = z.infer<typeof ContentSaveParamsSchema>;

export const ContentGetHistoryParamsSchema = z.object({
  projectId: z.string().uuid(),
  structureId: z.string().uuid()
});
export type ContentGetHistoryParams = z.infer<
  typeof ContentGetHistoryParamsSchema
>;

export const ContentRollbackParamsSchema = z.object({
  projectId: z.string().uuid(),
  structureId: z.string().uuid(),
  versionId: z.string().uuid()
});
export type ContentRollbackParams = z.infer<typeof ContentRollbackParamsSchema>;

// Generation method params
export const GenerationStartParamsSchema = z.object({
  projectId: z.string().uuid(),
  structureId: z.string().uuid(),
  options: z
    .object({
      stage: z.enum(['outline', 'beats', 'draft', 'review']).optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().optional()
    })
    .optional()
});
export type GenerationStartParams = z.infer<typeof GenerationStartParamsSchema>;

export const GenerationCancelParamsSchema = z.object({
  generationId: z.string().uuid()
});
export type GenerationCancelParams = z.infer<typeof GenerationCancelParamsSchema>;

export const GenerationStatusParamsSchema = z.object({
  generationId: z.string().uuid()
});
export type GenerationStatusParams = z.infer<typeof GenerationStatusParamsSchema>;

export const GenerationRetryParamsSchema = z.object({
  generationId: z.string().uuid(),
  stage: z.enum(['outline', 'beats', 'draft', 'review'])
});
export type GenerationRetryParams = z.infer<typeof GenerationRetryParamsSchema>;

// Review method params
export const ReviewQueueParamsSchema = z.object({
  projectId: z.string().uuid(),
  status: z.enum(['draft', 'in_review', 'approved', 'published']).optional()
});
export type ReviewQueueParams = z.infer<typeof ReviewQueueParamsSchema>;

export const ReviewGetItemParamsSchema = z.object({
  projectId: z.string().uuid(),
  contentId: z.string().uuid()
});
export type ReviewGetItemParams = z.infer<typeof ReviewGetItemParamsSchema>;

export const ReviewSubmitActionParamsSchema = z.object({
  projectId: z.string().uuid(),
  contentId: z.string().uuid(),
  paragraphIndex: z.number(),
  action: z.enum(['accept', 'reject', 'regenerate'])
});
export type ReviewSubmitActionParams = z.infer<
  typeof ReviewSubmitActionParamsSchema
>;

export const ReviewBulkApproveParamsSchema = z.object({
  projectId: z.string().uuid(),
  contentIds: z.array(z.string().uuid())
});
export type ReviewBulkApproveParams = z.infer<
  typeof ReviewBulkApproveParamsSchema
>;

export const ReviewCreateLockPointParamsSchema = z.object({
  projectId: z.string().uuid(),
  structureId: z.string().uuid()
});
export type ReviewCreateLockPointParams = z.infer<
  typeof ReviewCreateLockPointParamsSchema
>;

export const ReviewPreviewCascadeParamsSchema = z.object({
  projectId: z.string().uuid(),
  contentId: z.string().uuid()
});
export type ReviewPreviewCascadeParams = z.infer<
  typeof ReviewPreviewCascadeParamsSchema
>;

export const ReviewExecuteCascadeParamsSchema = z.object({
  projectId: z.string().uuid(),
  contentId: z.string().uuid()
});
export type ReviewExecuteCascadeParams = z.infer<
  typeof ReviewExecuteCascadeParamsSchema
>;

export const ReviewAddCommentParamsSchema = z.object({
  projectId: z.string().uuid(),
  contentId: z.string().uuid(),
  comment: z.object({
    paragraphIndex: z.number(),
    text: z.string().min(1),
    author: z.string().optional()
  })
});
export type ReviewAddCommentParams = z.infer<typeof ReviewAddCommentParamsSchema>;

export const ReviewResolveCommentParamsSchema = z.object({
  projectId: z.string().uuid(),
  contentId: z.string().uuid(),
  commentId: z.string().uuid()
});
export type ReviewResolveCommentParams = z.infer<
  typeof ReviewResolveCommentParamsSchema
>;

export const ReviewTransitionStatusParamsSchema = z.object({
  projectId: z.string().uuid(),
  contentId: z.string().uuid(),
  newStatus: z.enum(['draft', 'in_review', 'approved', 'published']),
  reason: z.string().optional()
});
export type ReviewTransitionStatusParams = z.infer<
  typeof ReviewTransitionStatusParamsSchema
>;

export const ReviewRemoveLockPointParamsSchema = z.object({
  projectId: z.string().uuid(),
  lockPointId: z.string().uuid()
});
export type ReviewRemoveLockPointParams = z.infer<
  typeof ReviewRemoveLockPointParamsSchema
>;

export const ReviewGetLockPointsParamsSchema = z.object({
  projectId: z.string().uuid(),
  contentId: z.string().uuid().optional()
});
export type ReviewGetLockPointsParams = z.infer<
  typeof ReviewGetLockPointsParamsSchema
>;

// Analytics method params
export const AnalyticsScopeParamsSchema = z.object({
  projectId: z.string().uuid(),
  scope: z
    .object({
      bookId: z.string().uuid().optional(),
      arcId: z.string().uuid().optional()
    })
    .optional()
});
export type AnalyticsScopeParams = z.infer<typeof AnalyticsScopeParamsSchema>;

// Serial method params
export const SerialBufferStatusParamsSchema = z.object({
  projectId: z.string().uuid()
});
export type SerialBufferStatusParams = z.infer<
  typeof SerialBufferStatusParamsSchema
>;

export const SerialReleaseScheduleParamsSchema = z.object({
  projectId: z.string().uuid()
});
export type SerialReleaseScheduleParams = z.infer<
  typeof SerialReleaseScheduleParamsSchema
>;

export const SerialHookPatternsParamsSchema = z.object({
  projectId: z.string().uuid(),
  scope: z
    .object({
      bookId: z.string().uuid().optional(),
      arcId: z.string().uuid().optional()
    })
    .optional()
});
export type SerialHookPatternsParams = z.infer<
  typeof SerialHookPatternsParamsSchema
>;

export const SerialCycleStatusParamsSchema = z.object({
  projectId: z.string().uuid(),
  scope: z
    .object({
      bookId: z.string().uuid().optional(),
      arcId: z.string().uuid().optional()
    })
    .optional()
});
export type SerialCycleStatusParams = z.infer<
  typeof SerialCycleStatusParamsSchema
>;

export const SerialMysteryBoardParamsSchema = z.object({
  projectId: z.string().uuid()
});
export type SerialMysteryBoardParams = z.infer<
  typeof SerialMysteryBoardParamsSchema
>;

// Subscription params
export const SubscribeParamsSchema = z.object({
  channel: z.string(),
  projectId: z.string().uuid().optional(),
  generationId: z.string().uuid().optional()
});
export type SubscribeParams = z.infer<typeof SubscribeParamsSchema>;

export const UnsubscribeParamsSchema = z.object({
  channel: z.string(),
  projectId: z.string().uuid().optional(),
  generationId: z.string().uuid().optional()
});
export type UnsubscribeParams = z.infer<typeof UnsubscribeParamsSchema>;

// Request validation helper
export function validateRequest(data: unknown): BaseRequest {
  return BaseRequestSchema.parse(data);
}
