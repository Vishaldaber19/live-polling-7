import mongoose from 'mongoose';

export const QUESTION_TYPES = ['single', 'multi', 'truefalse', 'text'];

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 200 },
});

const questionSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    options: { type: [optionSchema], default: [] },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'open', 'closed'], default: 'draft' },
  },
  { timestamps: true }
);

questionSchema.methods.toPublic = function () {
  return {
    id: this._id,
    text: this.text,
    type: this.type,
    options: this.options.map((o) => ({ id: o._id, text: o.text })),
    order: this.order,
    status: this.status,
  };
};

export default mongoose.model('Question', questionSchema);
