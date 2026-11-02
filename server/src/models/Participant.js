import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    participantId: { type: String, required: true },
    nickname: { type: String, required: true, trim: true, maxlength: 30 },
    nicknameLower: { type: String, required: true },
    connected: { type: Boolean, default: true },
    socketId: { type: String, default: null },
  },
  { timestamps: true }
);

participantSchema.index({ room: 1, nicknameLower: 1 }, { unique: true });
participantSchema.index({ room: 1, participantId: 1 }, { unique: true });

export default mongoose.model('Participant', participantSchema);
