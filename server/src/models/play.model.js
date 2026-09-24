import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const PlaySessionSchema = new Schema(
  {
    user:        { type: Types.ObjectId, ref: 'User', required: true, index: true },
    game:        { type: Types.ObjectId, ref: 'Game', required: true },
    playedAt:    { type: Date, default: Date.now },
    players:     { type: [String], default: [] },
    winner:      { type: String, default: '' },
    durationMin: { type: Number, min: 1 },
    notes:       { type: String, default: '' },
  },
  { timestamps: true },
);

PlaySessionSchema.index({ user: 1, playedAt: -1 });

export const PlaySession = model('PlaySession', PlaySessionSchema);
