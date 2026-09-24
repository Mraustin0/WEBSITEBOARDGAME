import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const GameSchema = new Schema(
  {
    bggId:         { type: Number, index: true, sparse: true, unique: true },
    name:          { type: String, required: true, trim: true },
    minPlayers:    { type: Number, default: 1, min: 1 },
    maxPlayers:    { type: Number, default: 4, min: 1 },
    playtimeMin:   { type: Number, default: 60, min: 1 },
    yearPublished: { type: Number },
    thumbnail:     { type: String },
    description:   { type: String },
    createdBy:     { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

GameSchema.index({ name: 'text', description: 'text' });

export const Game = model('Game', GameSchema);
