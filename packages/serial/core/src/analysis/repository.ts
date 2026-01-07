/**
 * Analysis repository for storing analysis results
 *
 * Provides storage and retrieval for content analysis, including
 * analysis history tracking and aggregation.
 */

import type Database from 'libsql';
import { nanoid } from 'nanoid';
import {
  type AggregatedAnalysis,
  type ContentAnalysis,
  type ContinuityIssue,
  ContinuityIssueSchema,
  ExplainedScoreSchema,
  PresenceTypeSchema,
  ThreadTouchTypeSchema,
} from '@repo/serial-types';
import { z } from 'zod';

import { parseJsonWithSchema } from '../storage/repository';

// Schemas for JSON array/record fields
const StringArraySchema = z.array(z.string());
const ContinuityIssuesArraySchema = z.array(ContinuityIssueSchema);
const CharacterVoiceScoresSchema = z.record(z.string(), ExplainedScoreSchema);
const CharacterAppearancesSchema = z.array(
  z.object({
    characterId: z.string(),
    type: PresenceTypeSchema,
    dialogueLines: z.number().int().min(0).optional(),
  })
);
const ThreadTouchesSchema = z.array(
  z.object({
    threadId: z.string(),
    type: ThreadTouchTypeSchema,
  })
);
const ScoreFactorsSchema = z.array(
  z.object({
    name: z.string(),
    impact: z.number(),
    detail: z.string().optional(),
  })
).optional();

/**
 * Database row for content analysis
 */
interface ContentAnalysisRow {
  id: string;
  project_id: string;
  content_id: string;
  content_version: number;
  tension_score: number;
  tension_explanation: string;
  tension_factors_json: string | null;
  hook_strength: number | null;
  hook_explanation: string | null;
  hook_factors_json: string | null;
  pace_score: number;
  pace_explanation: string;
  pace_factors_json: string | null;
  character_voice_scores_json: string;
  continuity_issues_json: string;
  word_count: number;
  reading_time: number;
  character_appearances_json: string;
  location_appearances_json: string;
  thread_touches_json: string;
  analyzed_at: string;
  model_id: string | null;
}

/**
 * SQL to create the analysis table (for migration)
 */
export const CREATE_ANALYSIS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS content_analysis (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_version INTEGER NOT NULL,
  tension_score INTEGER NOT NULL,
  tension_explanation TEXT NOT NULL,
  tension_factors_json TEXT,
  hook_strength INTEGER,
  hook_explanation TEXT,
  hook_factors_json TEXT,
  pace_score INTEGER NOT NULL,
  pace_explanation TEXT NOT NULL,
  pace_factors_json TEXT,
  character_voice_scores_json TEXT NOT NULL DEFAULT '{}',
  continuity_issues_json TEXT NOT NULL DEFAULT '[]',
  word_count INTEGER NOT NULL DEFAULT 0,
  reading_time REAL NOT NULL DEFAULT 0,
  character_appearances_json TEXT NOT NULL DEFAULT '[]',
  location_appearances_json TEXT NOT NULL DEFAULT '[]',
  thread_touches_json TEXT NOT NULL DEFAULT '[]',
  analyzed_at TEXT NOT NULL,
  model_id TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_analysis_project ON content_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_content_analysis_content ON content_analysis(content_id);
CREATE INDEX IF NOT EXISTS idx_content_analysis_content_version ON content_analysis(content_id, content_version);
`;

/**
 * Drop analysis table SQL
 */
export const DROP_ANALYSIS_TABLE_SQL = `
DROP TABLE IF EXISTS content_analysis;
`;

/**
 * Convert database row to ContentAnalysis
 */
function rowToAnalysis(row: ContentAnalysisRow): ContentAnalysis {
  return {
    id: row.id,
    contentId: row.content_id,
    contentVersion: row.content_version,
    tensionScore: {
      score: row.tension_score,
      explanation: row.tension_explanation,
      factors: parseJsonWithSchema(row.tension_factors_json, ScoreFactorsSchema, undefined, 'analysis.tensionScore.factors'),
    },
    hookStrength: row.hook_strength !== null
      ? {
          score: row.hook_strength,
          explanation: row.hook_explanation || '',
          factors: parseJsonWithSchema(row.hook_factors_json, ScoreFactorsSchema, undefined, 'analysis.hookStrength.factors'),
        }
      : undefined,
    paceScore: {
      score: row.pace_score,
      explanation: row.pace_explanation,
      factors: parseJsonWithSchema(row.pace_factors_json, ScoreFactorsSchema, undefined, 'analysis.paceScore.factors'),
    },
    characterVoiceScores: parseJsonWithSchema(row.character_voice_scores_json, CharacterVoiceScoresSchema, {}, 'analysis.characterVoiceScores'),
    continuityIssues: parseJsonWithSchema(row.continuity_issues_json, ContinuityIssuesArraySchema, [], 'analysis.continuityIssues'),
    wordCount: row.word_count,
    readingTime: row.reading_time,
    characterAppearances: parseJsonWithSchema(row.character_appearances_json, CharacterAppearancesSchema, [], 'analysis.characterAppearances'),
    locationAppearances: parseJsonWithSchema(row.location_appearances_json, StringArraySchema, [], 'analysis.locationAppearances'),
    threadTouches: parseJsonWithSchema(row.thread_touches_json, ThreadTouchesSchema, [], 'analysis.threadTouches'),
    analyzedAt: row.analyzed_at,
    modelId: row.model_id || undefined,
  };
}

/**
 * Analysis repository interface
 */
export interface AnalysisRepository {
  /** Save analysis for content */
  save(projectId: string, analysis: ContentAnalysis): ContentAnalysis;
  /** Get latest analysis for content */
  findLatest(projectId: string, contentId: string): ContentAnalysis | undefined;
  /** Get analysis for specific version */
  findByVersion(projectId: string, contentId: string, version: number): ContentAnalysis | undefined;
  /** Get analysis history for content */
  findHistory(projectId: string, contentId: string): ContentAnalysis[];
  /** Get all analyses for a project */
  findByProject(projectId: string): ContentAnalysis[];
  /** Delete analysis for content */
  deleteByContent(projectId: string, contentId: string): number;
  /** Delete all analyses for a project */
  deleteByProject(projectId: string): number;
  /**
   * Get aggregated analysis for a structure (arc, book)
   *
   * @param projectId - Project ID
   * @param structureId - Structure ID for the aggregation
   * @param childContentIds - Content IDs to aggregate
   * @param structureTensionTarget - Optional tension target from structure for divergence calculation
   */
  aggregateForStructure(
    projectId: string,
    structureId: string,
    childContentIds: string[],
    structureTensionTarget?: number
  ): AggregatedAnalysis | undefined;
  /** Get continuity issues by severity */
  getIssuesBySeverity(
    projectId: string,
    severity: ContinuityIssue['severity']
  ): Array<{ contentId: string; issue: ContinuityIssue }>;
  /** Mark issue as reviewed */
  markIssueReviewed(
    projectId: string,
    contentId: string,
    issueId: string,
    falsePositive: boolean
  ): boolean;
}

/**
 * Create analysis repository
 */
export function createAnalysisRepository(db: Database.Database): AnalysisRepository {
  // Ensure the analysis table exists
  db.exec(CREATE_ANALYSIS_TABLE_SQL);

  const insertStmt = db.prepare(`
    INSERT INTO content_analysis (
      id, project_id, content_id, content_version,
      tension_score, tension_explanation, tension_factors_json,
      hook_strength, hook_explanation, hook_factors_json,
      pace_score, pace_explanation, pace_factors_json,
      character_voice_scores_json, continuity_issues_json,
      word_count, reading_time,
      character_appearances_json, location_appearances_json, thread_touches_json,
      analyzed_at, model_id
    ) VALUES (
      @id, @project_id, @content_id, @content_version,
      @tension_score, @tension_explanation, @tension_factors_json,
      @hook_strength, @hook_explanation, @hook_factors_json,
      @pace_score, @pace_explanation, @pace_factors_json,
      @character_voice_scores_json, @continuity_issues_json,
      @word_count, @reading_time,
      @character_appearances_json, @location_appearances_json, @thread_touches_json,
      @analyzed_at, @model_id
    )
  `);

  const findLatestStmt = db.prepare(`
    SELECT * FROM content_analysis
    WHERE project_id = ? AND content_id = ?
    ORDER BY content_version DESC
    LIMIT 1
  `);

  const findByVersionStmt = db.prepare(`
    SELECT * FROM content_analysis
    WHERE project_id = ? AND content_id = ? AND content_version = ?
  `);

  const findHistoryStmt = db.prepare(`
    SELECT * FROM content_analysis
    WHERE project_id = ? AND content_id = ?
    ORDER BY content_version DESC
  `);

  const findByProjectStmt = db.prepare(`
    SELECT * FROM content_analysis
    WHERE project_id = ?
    ORDER BY analyzed_at DESC
  `);

  const deleteByContentStmt = db.prepare(`
    DELETE FROM content_analysis WHERE project_id = ? AND content_id = ?
  `);

  const deleteByProjectStmt = db.prepare(`
    DELETE FROM content_analysis WHERE project_id = ?
  `);

  const updateIssueStmt = db.prepare(`
    UPDATE content_analysis
    SET continuity_issues_json = ?
    WHERE project_id = ? AND content_id = ? AND content_version = (
      SELECT MAX(content_version) FROM content_analysis WHERE content_id = ?
    )
  `);

  return {
    save(projectId: string, analysis: ContentAnalysis): ContentAnalysis {
      const id = analysis.id || nanoid();
      const row: ContentAnalysisRow = {
        id,
        project_id: projectId,
        content_id: analysis.contentId,
        content_version: analysis.contentVersion,
        tension_score: analysis.tensionScore.score,
        tension_explanation: analysis.tensionScore.explanation,
        tension_factors_json: analysis.tensionScore.factors
          ? JSON.stringify(analysis.tensionScore.factors)
          : null,
        hook_strength: analysis.hookStrength?.score ?? null,
        hook_explanation: analysis.hookStrength?.explanation ?? null,
        hook_factors_json: analysis.hookStrength?.factors
          ? JSON.stringify(analysis.hookStrength.factors)
          : null,
        pace_score: analysis.paceScore.score,
        pace_explanation: analysis.paceScore.explanation,
        pace_factors_json: analysis.paceScore.factors
          ? JSON.stringify(analysis.paceScore.factors)
          : null,
        character_voice_scores_json: JSON.stringify(analysis.characterVoiceScores),
        continuity_issues_json: JSON.stringify(analysis.continuityIssues),
        word_count: analysis.wordCount,
        reading_time: analysis.readingTime,
        character_appearances_json: JSON.stringify(analysis.characterAppearances),
        location_appearances_json: JSON.stringify(analysis.locationAppearances),
        thread_touches_json: JSON.stringify(analysis.threadTouches),
        analyzed_at: analysis.analyzedAt,
        model_id: analysis.modelId ?? null,
      };

      insertStmt.run(row);
      return { ...analysis, id };
    },

    findLatest(projectId: string, contentId: string): ContentAnalysis | undefined {
      const row = findLatestStmt.get(projectId, contentId) as ContentAnalysisRow | undefined;
      return row ? rowToAnalysis(row) : undefined;
    },

    findByVersion(
      projectId: string,
      contentId: string,
      version: number
    ): ContentAnalysis | undefined {
      const row = findByVersionStmt.get(projectId, contentId, version) as
        | ContentAnalysisRow
        | undefined;
      return row ? rowToAnalysis(row) : undefined;
    },

    findHistory(projectId: string, contentId: string): ContentAnalysis[] {
      const rows = findHistoryStmt.all(projectId, contentId) as ContentAnalysisRow[];
      return rows.map(rowToAnalysis);
    },

    findByProject(projectId: string): ContentAnalysis[] {
      const rows = findByProjectStmt.all(projectId) as ContentAnalysisRow[];
      return rows.map(rowToAnalysis);
    },

    deleteByContent(projectId: string, contentId: string): number {
      const result = deleteByContentStmt.run(projectId, contentId);
      return result.changes;
    },

    deleteByProject(projectId: string): number {
      const result = deleteByProjectStmt.run(projectId);
      return result.changes;
    },

    aggregateForStructure(
      projectId: string,
      structureId: string,
      childContentIds: string[],
      structureTensionTarget?: number
    ): AggregatedAnalysis | undefined {
      if (childContentIds.length === 0) return undefined;

      // Get latest analysis for each content ID
      const analyses: ContentAnalysis[] = [];
      for (const contentId of childContentIds) {
        const analysis = this.findLatest(projectId, contentId);
        if (analysis) {
          analyses.push(analysis);
        }
      }

      if (analyses.length === 0) return undefined;

      // Calculate aggregates
      const totalTension = analyses.reduce((sum, a) => sum + a.tensionScore.score, 0);
      const averageTension = totalTension / analyses.length;

      const totalWordCount = analyses.reduce((sum, a) => sum + a.wordCount, 0);
      const totalReadingTime = analyses.reduce((sum, a) => sum + a.readingTime, 0);

      // Calculate tension divergence if structure has a tension target
      // Divergence = actual (average) - planned (target)
      // Positive means actual tension is higher than planned
      const tensionDivergence = structureTensionTarget !== undefined
        ? averageTension - structureTensionTarget
        : 0;

      // Count issues by severity
      const issuesBySeverity = { critical: 0, major: 0, minor: 0, nitpick: 0 };
      for (const analysis of analyses) {
        for (const issue of analysis.continuityIssues) {
          if (!issue.reviewed || !issue.falsePositive) {
            issuesBySeverity[issue.severity]++;
          }
        }
      }

      // Aggregate character presence
      const characterPresence: AggregatedAnalysis['characterPresence'] = {};
      for (const analysis of analyses) {
        for (const appearance of analysis.characterAppearances) {
          if (!characterPresence[appearance.characterId]) {
            characterPresence[appearance.characterId] = { appearances: 0, povChapters: 0 };
          }
          characterPresence[appearance.characterId].appearances++;
          if (appearance.type === 'pov') {
            characterPresence[appearance.characterId].povChapters++;
          }
        }
      }

      // Aggregate thread status
      const threadStatus: AggregatedAnalysis['threadStatus'] = {};
      for (const analysis of analyses) {
        for (const touch of analysis.threadTouches) {
          if (!threadStatus[touch.threadId]) {
            threadStatus[touch.threadId] = { touches: 0, lastTouchType: touch.type };
          }
          threadStatus[touch.threadId].touches++;
          threadStatus[touch.threadId].lastTouchType = touch.type;
        }
      }

      return {
        structureId,
        averageTension,
        tensionDivergence,
        totalWordCount,
        totalReadingTime,
        issuesBySeverity,
        characterPresence,
        threadStatus,
        calculatedAt: new Date().toISOString(),
      };
    },

    getIssuesBySeverity(
      projectId: string,
      severity: ContinuityIssue['severity']
    ): Array<{ contentId: string; issue: ContinuityIssue }> {
      const analyses = this.findByProject(projectId);
      const results: Array<{ contentId: string; issue: ContinuityIssue }> = [];

      for (const analysis of analyses) {
        for (const issue of analysis.continuityIssues) {
          if (issue.severity === severity && !issue.falsePositive) {
            results.push({ contentId: analysis.contentId, issue });
          }
        }
      }

      return results;
    },

    markIssueReviewed(
      projectId: string,
      contentId: string,
      issueId: string,
      falsePositive: boolean
    ): boolean {
      const analysis = this.findLatest(projectId, contentId);
      if (!analysis) return false;

      const updatedIssues = analysis.continuityIssues.map((issue) =>
        issue.id === issueId ? { ...issue, reviewed: true, falsePositive } : issue
      );

      updateIssueStmt.run(
        JSON.stringify(updatedIssues),
        projectId,
        contentId,
        contentId
      );

      return true;
    },
  };
}
