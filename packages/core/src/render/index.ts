/**
 * Render module for NovelGen
 *
 * Provides content rendering pipelines for transforming domain content
 * into various output formats (HTML, Markdown, EPUB, etc.).
 *
 * Key concepts:
 * - ContentRenderer: Transforms content into intermediate representation (IR)
 * - FormatRenderer: Transforms IR into output format
 * - RenderPipeline: Combined content + format rendering
 */

export {
  createPipeline,
  createAsyncPipeline,
  createBatchPipeline,
  createContextualPipeline,
  type ContentRenderer,
  type FormatRenderer,
  type RenderPipeline,
  type AsyncContentRenderer,
  type AsyncFormatRenderer,
  type AsyncRenderPipeline,
  type BatchRenderPipeline,
  type RenderContext,
  type ContextualContentRenderer,
  type ContextualFormatRenderer,
} from './content-renderer';
