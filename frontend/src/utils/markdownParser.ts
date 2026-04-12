import DOMPurify from 'dompurify';

/**
 * Utility to parse markdown-style tables and convert them to HTML
 */

export interface ParsedContent {
    type: 'text' | 'table';
    content: string | { headers: string[]; rows: string[][] };
}

/**
 * Parses text content and extracts markdown tables
 */
export function parseMarkdownContent(text: string): ParsedContent[] {
    const lines = text.split('\n');
    const result: ParsedContent[] = [];
    let currentText: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Check if this line looks like a table row (contains |)
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            // Save any accumulated text
            if (currentText.length > 0) {
                result.push({
                    type: 'text',
                    content: currentText.join('\n').trim()
                });
                currentText = [];
            }

            // Extract table
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].trim().includes('|')) {
                tableLines.push(lines[i]);
                i++;
            }

            const table = parseTable(tableLines);
            if (table) {
                result.push({
                    type: 'table',
                    content: table
                });
            }
            continue;
        }

        currentText.push(line);
        i++;
    }

    // Add remaining text
    if (currentText.length > 0) {
        result.push({
            type: 'text',
            content: currentText.join('\n').trim()
        });
    }

    return result;
}

/**
 * Parses table lines into structured data
 */
function parseTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
    if (lines.length < 2) return null;

    const cleanLine = (line: string) => {
        return line
            .trim()
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell.length > 0);
    };

    const headers = cleanLine(lines[0]);

    // Skip separator line (e.g., |---|---|)
    let dataStartIndex = 1;
    if (lines[1].includes('---') || lines[1].includes('--')) {
        dataStartIndex = 2;
    }

    const rows: string[][] = [];
    for (let i = dataStartIndex; i < lines.length; i++) {
        const cells = cleanLine(lines[i]);
        if (cells.length > 0) {
            rows.push(cells);
        }
    }

    return { headers, rows };
}

/**
 * Renders parsed content to React elements (returns HTML string for dangerouslySetInnerHTML)
 */
export function renderParsedContent(parsed: ParsedContent[]): string {
    const rawHtml = parsed.map(item => {
        if (item.type === 'text') {
            return `<p class="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">${item.content}</p>`;
        } else {
            const table = item.content as { headers: string[]; rows: string[][] };
            return renderTable(table);
        }
    }).join('');

    return DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ['p', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br', 'strong', 'em', 'b', 'i', 'u', 'span', 'mark'],
        ALLOWED_ATTR: ['class', 'title'] // Needed for later syntax highlighting
    });
}

/**
 * Renders a table to HTML string
 */
function renderTable(table: { headers: string[]; rows: string[][] }): string {
    const headerRow = table.headers
        .map(h => `<th class="px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800">${h}</th>`)
        .join('');

    const bodyRows = table.rows
        .map(row => {
            const cells = row
                .map(cell => `<td class="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">${cell}</td>`)
                .join('');
            return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">${cells}</tr>`;
        })
        .join('');

    return `
    <div class="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
      <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead>
          <tr>${headerRow}</tr>
        </thead>
        <tbody class="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
}
