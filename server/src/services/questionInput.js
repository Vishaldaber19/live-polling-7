import { QUESTION_TYPES } from '../models/Question.js';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

// Validates host input; returns { data } or { error }
export function parseQuestionInput(body = {}) {
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const type = body.type;

  if (!text) return { error: 'Question text is required' };
  if (text.length > 500) return { error: 'Question text max 500 characters' };
  if (!QUESTION_TYPES.includes(type)) return { error: 'Invalid question type' };

  let options = [];
  if (type === 'truefalse') {
    options = [{ text: 'True' }, { text: 'False' }];
  } else if (type === 'single' || type === 'multi') {
    if (!Array.isArray(body.options)) return { error: 'Options are required' };
    options = body.options
      .map((o) => (typeof o === 'string' ? o : o?.text))
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter(Boolean)
      .map((t) => ({ text: t }));
    if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
      return { error: `Provide ${MIN_OPTIONS}-${MAX_OPTIONS} non-empty options` };
    }
    if (options.some((o) => o.text.length > 200)) return { error: 'Option max 200 characters' };
    const unique = new Set(options.map((o) => o.text.toLowerCase()));
    if (unique.size !== options.length) return { error: 'Options must be unique' };
  }

  return { data: { text, type, options } };
}
