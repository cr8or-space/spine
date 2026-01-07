/**
 * MCP tool response utilities
 *
 * Common response patterns for MCP tools.
 */

/**
 * Standard MCP tool response type
 */
export interface ToolResponse {
  content: Array<{ type: 'text'; text: string }>;
}

/**
 * Create a text response
 */
export function textResponse(text: string): ToolResponse {
  return {
    content: [{ type: 'text', text }],
  };
}

/**
 * Create an empty list response with a hint about which tool to use
 */
export function emptyListResponse(entityName: string, createTool?: string): ToolResponse {
  const hint = createTool ? ` Use \`${createTool}\` to add ${entityName}.` : '';
  return textResponse(`No ${entityName} found.${hint}`);
}

/**
 * Create a list response with items or empty message
 */
export function listResponse<T>(
  items: T[],
  entityName: string,
  formatFn: (item: T) => string,
  options: {
    title?: string;
    separator?: string;
    createTool?: string;
  } = {}
): ToolResponse {
  if (items.length === 0) {
    return emptyListResponse(entityName, options.createTool);
  }

  const { title, separator = '\n\n---\n\n' } = options;
  const formatted = items.map(formatFn).join(separator);
  const header = title ?? `# ${capitalize(entityName)} (${items.length})`;

  return textResponse(`${header}\n\n${formatted}`);
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
