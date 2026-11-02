export const QUESTION_TYPES = [
  { value: 'single', label: 'Single choice' },
  { value: 'multi', label: 'Multiple select' },
  { value: 'truefalse', label: 'True / False' },
  { value: 'text', label: 'Open text' },
];

export const typeLabel = (type) => QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
