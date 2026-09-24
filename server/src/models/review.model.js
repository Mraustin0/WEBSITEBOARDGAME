import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const ReviewSchema = new Schema(
  {
    user:    { type: Types.ObjectId, ref: 'User', required: true },
    game:    { type: Types.ObjectId, ref: 'Game', required: true, index: true },
    rating:  { type: Number, required: true, min: 1, max: 10 },
    comment: { type: String, default: '' },
  },
  { timestamps: true },
);

ReviewSchema.index({ user: 1, game: 1 }, { unique: true });

export const Review = model('Review', ReviewSchema);
