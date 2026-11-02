import Response from '../models/Response.js';

// Public results: totals only, no nicknames
export async function getResults(question, { detail = false } = {}) {
  const responses = await Response.find({ question: question._id }).sort({ createdAt: 1 }).lean();
  const result = { questionId: question._id, type: question.type, total: responses.length };

  if (question.type === 'text') {
    result.texts = responses.map((r) => r.text).reverse();
  } else {
    const counts = Object.fromEntries(question.options.map((o) => [String(o._id), 0]));
    for (const r of responses) {
      for (const id of r.optionIds) {
        const key = String(id);
        if (key in counts) counts[key] += 1;
      }
    }
    result.counts = counts;
  }

  if (detail) {
    result.responses = responses.map((r) => ({
      nickname: r.nickname,
      optionIds: r.optionIds.map(String),
      text: r.text,
      at: r.createdAt,
    }));
  }
  return result;
}
