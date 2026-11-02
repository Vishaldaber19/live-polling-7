import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: { type: String, required: true, unique: true, uppercase: true },
    hostKeyHash: { type: String, required: true, select: false },
    status: { type: String, enum: ['lobby', 'live', 'ended'], default: 'lobby' },
    activeQuestion: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null },
  },
  { timestamps: true }
);

roomSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name,
    code: this.code,
    status: this.status,
    activeQuestion: this.activeQuestion,
  };
};

export default mongoose.model('Room', roomSchema);
