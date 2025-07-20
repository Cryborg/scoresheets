'use client';

import { useMemo } from 'react';

interface RulesRendererProps {
  rules: string;
  gameName: string;
}

/**
 * Parse markdown-like syntax and convert to HTML
 */
function parseMarkdownToHTML(text: string): string {
  if (!text) return '';
  
  let html = text
    // Headers (## -> h3, ### -> h4)
    .replace(/^### (.*$)/gm, '<h4 class="text-md font-semibold text-gray-900 dark:text-white mt-4 mb-2 flex items-center gap-2">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 class="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3 flex items-center gap-2">$1</h3>')
    
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');

  // Handle lists with proper indentation
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let listLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if this is a list item
    const listMatch = line.match(/^(\s*)[-*]\s(.+)$/);
    const numberedListMatch = line.match(/^(\s*)\d+\.\s(.+)$/);
    
    if (listMatch || numberedListMatch) {
      const indent = (listMatch || numberedListMatch)![1].length;
      const content = (listMatch || numberedListMatch)![2];
      
      if (!inList) {
        processedLines.push('<ul class="list-disc list-inside space-y-1 ml-4 mb-3">');
        inList = true;
        listLevel = indent;
      }
      
      processedLines.push(`<li class="text-gray-700 dark:text-gray-300">${content}</li>`);
    } else {
      if (inList && trimmedLine === '') {
        // Keep empty lines in lists
        continue;
      } else if (inList) {
        // End the list
        processedLines.push('</ul>');
        inList = false;
      }
      
      if (trimmedLine) {
        // Regular paragraph
        if (!trimmedLine.startsWith('<h')) {
          processedLines.push(`<p class="text-gray-700 dark:text-gray-300 mb-3">${line}</p>`);
        } else {
          processedLines.push(line);
        }
      }
    }
  }
  
  // Close any remaining list
  if (inList) {
    processedLines.push('</ul>');
  }
  
  return processedLines.join('\n')
    // Special formatting for specific patterns
    .replace(/→/g, '<span class="mx-1 text-blue-600 dark:text-blue-400">→</span>')
    .replace(/✅/g, '<span class="text-green-600">✅</span>')
    .replace(/❌/g, '<span class="text-red-600">❌</span>')
    .replace(/⚠️/g, '<span class="text-yellow-600">⚠️</span>')
    .replace(/🎯/g, '<span class="text-blue-600">🎯</span>')
    .replace(/🃏/g, '<span class="text-purple-600">🃏</span>')
    .replace(/🎮/g, '<span class="text-green-600">🎮</span>')
    .replace(/🏁/g, '<span class="text-red-600">🏁</span>')
    .replace(/📊/g, '<span class="text-blue-600">📊</span>')
    .replace(/🎖️/g, '<span class="text-yellow-600">🎖️</span>')
    .replace(/🎲/g, '<span class="text-purple-600">🎲</span>')
    .replace(/🏆/g, '<span class="text-yellow-600">🏆</span>')
    .replace(/💎/g, '<span class="text-blue-400">💎</span>')
    .replace(/💥/g, '<span class="text-red-600">💥</span>')
    .replace(/🔄/g, '<span class="text-blue-600">🔄</span>')
    .replace(/🎴/g, '<span class="text-red-600">🎴</span>')
    .replace(/🃟/g, '<span class="text-gray-600">🃟</span>');
}

export default function RulesRenderer({ rules }: RulesRendererProps) {
  const htmlContent = useMemo(() => parseMarkdownToHTML(rules), [rules]);
  
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <div 
        className="space-y-2"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}