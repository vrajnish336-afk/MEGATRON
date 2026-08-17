/**
 * MEGATRON Business OS - Robust & Secure JSON Parser
 * 
 * Safely extracts and parses structured JSON from LLM outputs across:
 * - Direct valid JSON
 * - Markdown-wrapped code blocks (```json ... ```)
 * - Preamble / postamble conversational text
 * - Unicode text (Devanagari Hindi, accented characters, multilingual strings)
 * - Common LLM syntax variations (trailing commas, smart/curly quotes, escaped control chars)
 * - Safe structural closure repair for truncated responses
 * 
 * SECURITY: Absolutely NO eval() or dynamic code execution is used.
 */

/**
 * Parses raw LLM text into a structured JSON object or array safely.
 * 
 * @param {string} raw - The raw text received from the AI model
 * @returns {{ success: boolean, data: any, error?: string, raw?: string }}
 */
export function parseJsonSafely(raw) {
  if (raw === null || raw === undefined) {
    return { success: false, error: 'Input is null or undefined', data: null };
  }

  if (typeof raw === 'object') {
    return { success: true, data: raw, raw: JSON.stringify(raw) };
  }

  if (typeof raw !== 'string') {
    return { success: false, error: `Expected string, received ${typeof raw}`, data: null };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { success: false, error: 'Input string is empty', data: null };
  }

  // 1. Direct standard parse attempt (Fast path for clean JSON)
  try {
    const directParsed = JSON.parse(trimmed);
    return { success: true, data: directParsed, raw: trimmed };
  } catch {}

  // 2. Extract content from Markdown code fences (```json ... ``` or ``` ... ```)
  let workingText = trimmed;
  const codeBlockMatch = workingText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const candidate = codeBlockMatch[1].trim();
    try {
      const parsed = JSON.parse(candidate);
      return { success: true, data: parsed, raw: candidate };
    } catch {
      workingText = candidate;
    }
  }

  // 3. Find bounding braces or brackets (Handles conversational preambles/postambles)
  const firstBrace = workingText.indexOf('{');
  const firstBracket = workingText.indexOf('[');
  let startIdx = -1;
  let isObject = true;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isObject = false;
  }

  if (startIdx !== -1) {
    const closeChar = isObject ? '}' : ']';
    const lastIdx = workingText.lastIndexOf(closeChar);
    if (lastIdx > startIdx) {
      workingText = workingText.substring(startIdx, lastIdx + 1);
    } else {
      workingText = workingText.substring(startIdx);
    }
  }

  // 4. Try parsing after boundary substring
  try {
    const parsed = JSON.parse(workingText);
    return { success: true, data: parsed, raw: workingText };
  } catch {}

  // 5. Clean common LLM formatting artifacts
  let cleaned = workingText
    // Normalize smart double quotes to standard double quote
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    // Normalize smart single quotes to standard single quote
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    // Remove full-line comments
    .replace(/^\s*\/\/.*$/gm, '')
    // Remove inline trailing comments
    .replace(/(["\]\}])\s*\/\/[^\n]*/g, '$1')
    // Remove trailing commas before closing braces/brackets
    .replace(/,\s*([\}\]])/g, '$1');

  try {
    const parsed = JSON.parse(cleaned);
    return { success: true, data: parsed, raw: cleaned };
  } catch {}

  // 6. Safe structural repair (Handles truncated closing braces, unescaped string newlines, etc.)
  const repaired = repairJsonStructure(cleaned);
  try {
    const parsed = JSON.parse(repaired);
    return { success: true, data: parsed, raw: repaired };
  } catch (err) {
    return {
      success: false,
      error: `JSON parsing failed: ${err.message}`,
      data: null,
      raw,
    };
  }
}

/**
 * Deterministically balances and repairs structurally incomplete or truncated JSON.
 * - Handles unescaped control characters inside strings
 * - Automatically closes open string quotes
 * - Cleans trailing commas before closure
 * - Closes unclosed braces and brackets in correct LIFO stack order
 * 
 * @param {string} jsonStr
 * @returns {string}
 */
export function repairJsonStructure(jsonStr) {
  if (!jsonStr || typeof jsonStr !== 'string') return '';

  let inString = false;
  let isEscaped = false;
  const stack = [];
  let result = '';

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        result += char;
      } else if (char === '\\') {
        isEscaped = true;
        result += char;
      } else if (char === '"') {
        inString = false;
        result += char;
      } else if (char === '\n' || char === '\r') {
        // Escape raw newline inside string literal
        result += char === '\n' ? '\\n' : '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        inString = true;
        result += char;
      } else if (char === '{' || char === '[') {
        stack.push(char);
        result += char;
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
        }
        result += char;
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
        }
        result += char;
      } else {
        result += char;
      }
    }
  }

  // If ended while still inside an open string literal, close the quote
  if (inString) {
    result += '"';
  }

  // Remove any trailing commas before closing braces
  result = result.replace(/,\s*$/, '');

  // Close remaining unclosed brackets/braces in reverse order
  while (stack.length > 0) {
    const open = stack.pop();
    if (open === '{') {
      result += '\n}';
    } else if (open === '[') {
      result += '\n]';
    }
  }

  return result;
}
