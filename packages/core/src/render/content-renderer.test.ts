import { describe, it, expect } from 'vitest';
import {
  createPipeline,
  createAsyncPipeline,
  createBatchPipeline,
  createContextualPipeline,
  type ContentRenderer,
  type FormatRenderer,
  type AsyncContentRenderer,
  type AsyncFormatRenderer,
  type ContextualContentRenderer,
  type ContextualFormatRenderer,
  type RenderContext,
} from './content-renderer';

// Test types
interface SimpleContent {
  title: string;
  body: string;
}

interface SimpleIR {
  heading: string;
  paragraphs: string[];
}

describe('ContentRenderer', () => {
  describe('createPipeline', () => {
    it('should combine content and format renderers', () => {
      const contentRenderer: ContentRenderer<SimpleContent, SimpleIR> = {
        render(content) {
          return {
            heading: content.title.toUpperCase(),
            paragraphs: content.body.split('\n'),
          };
        },
      };

      const formatRenderer: FormatRenderer<SimpleIR, string> = {
        render(ir) {
          return `# ${ir.heading}\n\n${ir.paragraphs.join('\n\n')}`;
        },
      };

      const pipeline = createPipeline(contentRenderer, formatRenderer);
      const result = pipeline.render({
        title: 'Hello',
        body: 'Line 1\nLine 2',
      });

      expect(result).toBe('# HELLO\n\nLine 1\n\nLine 2');
    });

    it('should handle empty content', () => {
      const contentRenderer: ContentRenderer<SimpleContent, SimpleIR> = {
        render(content) {
          return {
            heading: content.title,
            paragraphs: content.body ? content.body.split('\n') : [],
          };
        },
      };

      const formatRenderer: FormatRenderer<SimpleIR, string> = {
        render(ir) {
          if (ir.paragraphs.length === 0) return `# ${ir.heading}`;
          return `# ${ir.heading}\n\n${ir.paragraphs.join('\n\n')}`;
        },
      };

      const pipeline = createPipeline(contentRenderer, formatRenderer);
      const result = pipeline.render({ title: 'Empty', body: '' });

      expect(result).toBe('# Empty');
    });
  });

  describe('createAsyncPipeline', () => {
    it('should handle async content renderer', async () => {
      const contentRenderer: AsyncContentRenderer<SimpleContent, SimpleIR> = {
        async render(content) {
          // Simulate async operation
          await Promise.resolve();
          return {
            heading: content.title,
            paragraphs: content.body.split('\n'),
          };
        },
      };

      const formatRenderer: AsyncFormatRenderer<SimpleIR, string> = {
        async render(ir) {
          await Promise.resolve();
          return `${ir.heading}: ${ir.paragraphs.length} paragraphs`;
        },
      };

      const pipeline = createAsyncPipeline(contentRenderer, formatRenderer);
      const result = await pipeline.render({
        title: 'Test',
        body: 'P1\nP2\nP3',
      });

      expect(result).toBe('Test: 3 paragraphs');
    });

    it('should propagate errors correctly', async () => {
      const contentRenderer: AsyncContentRenderer<SimpleContent, SimpleIR> = {
        async render() {
          throw new Error('Content render failed');
        },
      };

      const formatRenderer: AsyncFormatRenderer<SimpleIR, string> = {
        async render(ir) {
          return ir.heading;
        },
      };

      const pipeline = createAsyncPipeline(contentRenderer, formatRenderer);

      await expect(
        pipeline.render({ title: 'Test', body: 'Body' })
      ).rejects.toThrow('Content render failed');
    });
  });

  describe('createBatchPipeline', () => {
    it('should render multiple items', () => {
      const contentRenderer: ContentRenderer<SimpleContent, SimpleIR> = {
        render(content) {
          return {
            heading: content.title,
            paragraphs: [content.body],
          };
        },
      };

      const formatRenderer: FormatRenderer<SimpleIR, string> = {
        render(ir) {
          return `${ir.heading}: ${ir.paragraphs[0]}`;
        },
      };

      const pipeline = createPipeline(contentRenderer, formatRenderer);
      const batchPipeline = createBatchPipeline(pipeline);

      const results = batchPipeline.renderBatch([
        { title: 'First', body: 'Content 1' },
        { title: 'Second', body: 'Content 2' },
        { title: 'Third', body: 'Content 3' },
      ]);

      expect(results).toHaveLength(3);
      expect(results[0]).toBe('First: Content 1');
      expect(results[1]).toBe('Second: Content 2');
      expect(results[2]).toBe('Third: Content 3');
    });

    it('should handle empty batch', () => {
      const contentRenderer: ContentRenderer<SimpleContent, SimpleIR> = {
        render(content) {
          return { heading: content.title, paragraphs: [] };
        },
      };

      const formatRenderer: FormatRenderer<SimpleIR, string> = {
        render(ir) {
          return ir.heading;
        },
      };

      const pipeline = createPipeline(contentRenderer, formatRenderer);
      const batchPipeline = createBatchPipeline(pipeline);

      const results = batchPipeline.renderBatch([]);

      expect(results).toEqual([]);
    });
  });

  describe('createContextualPipeline', () => {
    it('should pass context through pipeline', () => {
      const contentRenderer: ContextualContentRenderer<SimpleContent, SimpleIR> =
        {
          render(content, context) {
            const prefix = (context.prefix as string) ?? '';
            return {
              heading: prefix + content.title,
              paragraphs: content.body.split('\n'),
            };
          },
        };

      const formatRenderer: ContextualFormatRenderer<SimpleIR, string> = {
        render(ir, context) {
          const suffix = (context.suffix as string) ?? '';
          return `${ir.heading}${suffix}`;
        },
      };

      const pipeline = createContextualPipeline(contentRenderer, formatRenderer);

      const context: RenderContext = {
        prefix: '[',
        suffix: ']',
      };

      const result = pipeline.render(
        { title: 'Title', body: 'Body' },
        context
      );

      expect(result).toBe('[Title]');
    });

    it('should handle projectId in context', () => {
      const contentRenderer: ContextualContentRenderer<SimpleContent, SimpleIR> =
        {
          render(content, context) {
            return {
              heading: `${context.projectId ?? 'unknown'}: ${content.title}`,
              paragraphs: [],
            };
          },
        };

      const formatRenderer: ContextualFormatRenderer<SimpleIR, string> = {
        render(ir) {
          return ir.heading;
        },
      };

      const pipeline = createContextualPipeline(contentRenderer, formatRenderer);

      const result = pipeline.render(
        { title: 'Chapter 1', body: '' },
        { projectId: 'proj-123' }
      );

      expect(result).toBe('proj-123: Chapter 1');
    });

    it('should handle entities in context', () => {
      const entities = new Map<string, { name: string }>();
      entities.set('char-1', { name: 'Alice' });
      entities.set('char-2', { name: 'Bob' });

      const contentRenderer: ContextualContentRenderer<SimpleContent, SimpleIR> =
        {
          render(content, context) {
            const entityMap = context.entities as Map<string, { name: string }>;
            const names = entityMap
              ? Array.from(entityMap.values())
                  .map((e) => e.name)
                  .join(', ')
              : '';
            return {
              heading: content.title,
              paragraphs: [`Characters: ${names}`],
            };
          },
        };

      const formatRenderer: ContextualFormatRenderer<SimpleIR, string> = {
        render(ir) {
          return `${ir.heading}\n${ir.paragraphs.join('\n')}`;
        },
      };

      const pipeline = createContextualPipeline(contentRenderer, formatRenderer);

      const result = pipeline.render(
        { title: 'Cast', body: '' },
        { entities }
      );

      expect(result).toBe('Cast\nCharacters: Alice, Bob');
    });
  });
});

describe('Render Pipeline Composition', () => {
  it('should support multiple format renderers from same IR', () => {
    const contentRenderer: ContentRenderer<SimpleContent, SimpleIR> = {
      render(content) {
        return {
          heading: content.title,
          paragraphs: content.body.split('\n'),
        };
      },
    };

    const markdownRenderer: FormatRenderer<SimpleIR, string> = {
      render(ir) {
        return `# ${ir.heading}\n\n${ir.paragraphs.join('\n\n')}`;
      },
    };

    const htmlRenderer: FormatRenderer<SimpleIR, string> = {
      render(ir) {
        const paragraphs = ir.paragraphs.map((p) => `<p>${p}</p>`).join('\n');
        return `<h1>${ir.heading}</h1>\n${paragraphs}`;
      },
    };

    const markdownPipeline = createPipeline(contentRenderer, markdownRenderer);
    const htmlPipeline = createPipeline(contentRenderer, htmlRenderer);

    const content: SimpleContent = {
      title: 'Test',
      body: 'Line 1\nLine 2',
    };

    const markdown = markdownPipeline.render(content);
    const html = htmlPipeline.render(content);

    expect(markdown).toBe('# Test\n\nLine 1\n\nLine 2');
    expect(html).toBe('<h1>Test</h1>\n<p>Line 1</p>\n<p>Line 2</p>');
  });
});
