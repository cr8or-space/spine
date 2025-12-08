/**
 * Content rendering pipeline for NovelGen.
 *
 * Provides a two-stage rendering pipeline:
 * 1. ContentRenderer: Transforms content into an intermediate representation (IR)
 * 2. FormatRenderer: Transforms IR into a final output format
 *
 * This separation allows:
 * - Multiple output formats from a single IR
 * - Shared processing in the IR stage
 * - Format-specific optimizations in the output stage
 */

/**
 * Renders content into an intermediate representation.
 *
 * ContentRenderers transform domain content (chapters, scenes, prose) into
 * a format-agnostic intermediate representation that can then be rendered
 * into various output formats.
 *
 * @typeParam C - The input content type
 * @typeParam IR - The intermediate representation type
 *
 * @example
 * ```typescript
 * interface ChapterIR {
 *   title: string;
 *   number: number;
 *   paragraphs: ParagraphIR[];
 *   metadata: ChapterMetadata;
 * }
 *
 * const chapterRenderer: ContentRenderer<Chapter, ChapterIR> = {
 *   render(chapter) {
 *     return {
 *       title: chapter.title,
 *       number: chapter.chapterNumber,
 *       paragraphs: parseParagraphs(chapter.text),
 *       metadata: extractMetadata(chapter),
 *     };
 *   },
 * };
 * ```
 */
export interface ContentRenderer<C, IR> {
  /**
   * Render content into intermediate representation.
   *
   * @param content - The content to render
   * @returns The intermediate representation
   */
  render(content: C): IR;
}

/**
 * Renders intermediate representation into a final output format.
 *
 * FormatRenderers transform intermediate representations into format-specific
 * outputs (HTML, Markdown, EPUB, etc.).
 *
 * @typeParam IR - The intermediate representation type
 * @typeParam Output - The output type
 *
 * @example
 * ```typescript
 * const htmlRenderer: FormatRenderer<ChapterIR, string> = {
 *   render(ir) {
 *     return `
 *       <article class="chapter">
 *         <h1>Chapter ${ir.number}: ${ir.title}</h1>
 *         ${ir.paragraphs.map(p => `<p>${p.text}</p>`).join('\n')}
 *       </article>
 *     `;
 *   },
 * };
 * ```
 */
export interface FormatRenderer<IR, Output> {
  /**
   * Render intermediate representation into output format.
   *
   * @param ir - The intermediate representation
   * @returns The formatted output
   */
  render(ir: IR): Output;
}

/**
 * Combined pipeline that renders content directly to output.
 *
 * @typeParam C - The input content type
 * @typeParam Output - The output type
 */
export interface RenderPipeline<C, Output> {
  /**
   * Render content directly to output format.
   *
   * @param content - The content to render
   * @returns The formatted output
   */
  render(content: C): Output;
}

/**
 * Creates a render pipeline by combining a content renderer and format renderer.
 *
 * @param contentRenderer - Renders content to intermediate representation
 * @param formatRenderer - Renders intermediate representation to output
 * @returns A combined render pipeline
 *
 * @example
 * ```typescript
 * const htmlPipeline = createPipeline(chapterRenderer, htmlRenderer);
 * const html = htmlPipeline.render(chapter);
 * ```
 */
export function createPipeline<C, IR, Output>(
  contentRenderer: ContentRenderer<C, IR>,
  formatRenderer: FormatRenderer<IR, Output>
): RenderPipeline<C, Output> {
  return {
    render(content: C): Output {
      const ir = contentRenderer.render(content);
      return formatRenderer.render(ir);
    },
  };
}

/**
 * Async version of ContentRenderer for renderers that need async operations.
 *
 * @typeParam C - The input content type
 * @typeParam IR - The intermediate representation type
 */
export interface AsyncContentRenderer<C, IR> {
  /**
   * Render content into intermediate representation asynchronously.
   *
   * @param content - The content to render
   * @returns Promise resolving to the intermediate representation
   */
  render(content: C): Promise<IR>;
}

/**
 * Async version of FormatRenderer for renderers that need async operations.
 *
 * @typeParam IR - The intermediate representation type
 * @typeParam Output - The output type
 */
export interface AsyncFormatRenderer<IR, Output> {
  /**
   * Render intermediate representation into output format asynchronously.
   *
   * @param ir - The intermediate representation
   * @returns Promise resolving to the formatted output
   */
  render(ir: IR): Promise<Output>;
}

/**
 * Async version of RenderPipeline.
 *
 * @typeParam C - The input content type
 * @typeParam Output - The output type
 */
export interface AsyncRenderPipeline<C, Output> {
  /**
   * Render content directly to output format asynchronously.
   *
   * @param content - The content to render
   * @returns Promise resolving to the formatted output
   */
  render(content: C): Promise<Output>;
}

/**
 * Creates an async render pipeline.
 *
 * @param contentRenderer - Async content renderer
 * @param formatRenderer - Async format renderer
 * @returns An async render pipeline
 */
export function createAsyncPipeline<C, IR, Output>(
  contentRenderer: AsyncContentRenderer<C, IR>,
  formatRenderer: AsyncFormatRenderer<IR, Output>
): AsyncRenderPipeline<C, Output> {
  return {
    async render(content: C): Promise<Output> {
      const ir = await contentRenderer.render(content);
      return formatRenderer.render(ir);
    },
  };
}

/**
 * Batch renderer for processing multiple content items.
 *
 * @typeParam C - The input content type
 * @typeParam Output - The output type
 */
export interface BatchRenderPipeline<C, Output> {
  /**
   * Render multiple content items.
   *
   * @param contents - Array of content items
   * @returns Array of rendered outputs
   */
  renderBatch(contents: C[]): Output[];
}

/**
 * Creates a batch render pipeline from a single-item pipeline.
 *
 * @param pipeline - The single-item render pipeline
 * @returns A batch render pipeline
 */
export function createBatchPipeline<C, Output>(
  pipeline: RenderPipeline<C, Output>
): BatchRenderPipeline<C, Output> {
  return {
    renderBatch(contents: C[]): Output[] {
      return contents.map((content) => pipeline.render(content));
    },
  };
}

/**
 * Render context that can be passed through the pipeline.
 *
 * Useful for sharing state between renders, like cross-references
 * or accumulated metadata.
 */
export interface RenderContext {
  /** Project-level metadata */
  projectId?: string;
  /** Bible entities for reference resolution */
  entities?: Map<string, unknown>;
  /** Custom context data */
  [key: string]: unknown;
}

/**
 * Context-aware content renderer.
 *
 * @typeParam C - The input content type
 * @typeParam IR - The intermediate representation type
 */
export interface ContextualContentRenderer<C, IR> {
  /**
   * Render content with context.
   *
   * @param content - The content to render
   * @param context - The render context
   * @returns The intermediate representation
   */
  render(content: C, context: RenderContext): IR;
}

/**
 * Context-aware format renderer.
 *
 * @typeParam IR - The intermediate representation type
 * @typeParam Output - The output type
 */
export interface ContextualFormatRenderer<IR, Output> {
  /**
   * Render intermediate representation with context.
   *
   * @param ir - The intermediate representation
   * @param context - The render context
   * @returns The formatted output
   */
  render(ir: IR, context: RenderContext): Output;
}

/**
 * Creates a contextual render pipeline.
 *
 * @param contentRenderer - Context-aware content renderer
 * @param formatRenderer - Context-aware format renderer
 * @returns A contextual render pipeline
 */
export function createContextualPipeline<C, IR, Output>(
  contentRenderer: ContextualContentRenderer<C, IR>,
  formatRenderer: ContextualFormatRenderer<IR, Output>
): { render(content: C, context: RenderContext): Output } {
  return {
    render(content: C, context: RenderContext): Output {
      const ir = contentRenderer.render(content, context);
      return formatRenderer.render(ir, context);
    },
  };
}
