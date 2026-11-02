import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    participantId: { type: String, required: true },
    nickname: { type: String, required: true },
    optionIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    text: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// One locked answer per participant per question
responseSchema.index({ question: 1, participantId: 1 }, { unique: true });

export default mongoose.model('Response', responseSchema);
