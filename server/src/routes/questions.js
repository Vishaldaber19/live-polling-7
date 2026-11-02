import { Router } from 'express';
import mongoose from 'mongoose';
import Question from '../models/Question.js';
import Response from '../models/Response.js';
import { hostAuth } from '../middleware/hostAuth.js';
import { parseQuestionInput } from '../services/questionInput.js';
import { getResults } from '../services/results.js';

const router = Router({ mergeParams: true });

router.use(hostAuth);

async function findQuestion(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: 'Question not found' });
    return null;
  }
  const question = await Question.findOne({ _id: req.params.id, room: req.room._id });
  if (!question) res.status(404).json({ error: 'Question not found' });
  return question;
}

router.get('/', async (req, res, next) => {
  try {
    const questions = await Question.find({ room: req.room._id }).sort({ order: 1, createdAt: 1 });
    res.json({ questions: questions.map((q) => q.toPublic()) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { data, error } = parseQuestionInput(req.body);
    if (error) return res.status(400).json({ error });
    const last = await Question.findOne({ room: req.room._id }).sort({ order: -1 });
    const question = await Question.create({ ...data, room: req.room._id, order: last ? last.order + 1 : 0 });
    res.status(201).json({ question: question.toPublic() });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const question = await findQuestion(req, res);
    if (!question) return;
    if (question.status !== 'draft') {
      return res.status(409).json({ error: 'Only draft questions can be edited' });
    }
    const { data, error } = parseQuestionInput(req.body);
    if (error) return res.status(400).json({ error });
    question.set(data);
    await question.save();
    res.json({ question: question.toPublic() });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const question = await findQuestion(req, res);
    if (!question) return;
    if (question.status === 'open') {
      return res.status(409).json({ error: 'Close the question before deleting it' });
    }
    await Response.deleteMany({ question: question._id });
    await question.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/:id/results', async (req, res, next) => {
  try {
    const question = await findQuestion(req, res);
    if (!question) return;
    res.json({ results: await getResults(question, { detail: true }) });
  } catch (err) {
    next(err);
  }
});

export default router;
