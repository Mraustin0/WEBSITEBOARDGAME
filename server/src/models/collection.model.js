import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const CollectionItemSchema = new Schema(
  {
    user:      { type: Types.ObjectId, ref: 'User', required: true, index: true },
    game:      { type: Types.ObjectId, ref: 'Game', required: true },
    condition: { type: String, enum: ['new', 'good', 'worn'], default: 'good' },
    notes:     { type: String, default: '' },
  },
  { timestamps: true },
);

CollectionItemSchema.index({ user: 1, game: 1 }, { unique: true });

export const CollectionItem = model('CollectionItem', CollectionItemSchema);
