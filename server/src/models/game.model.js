import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

export const GAME_STATUSES = ['available', 'in_use', 'maintenance'];

const GameSchema = new Schema(
  {
    bggId: { type: Number, index: true, sparse: true, unique: true },
    name: { type: String, required: true, trim: true },
    minPlayers: { type: Number, default: 1, min: 1 },
    maxPlayers: { type: Number, default: 4, min: 1 },
    playtimeMin: { type: Number, default: 60, min: 1 },
    yearPublished: { type: Number },
    thumbnail: { type: String },
    image: { type: String },
    description: { type: String },
    bggAverage: { type: Number, min: 0, max: 10 },
    bggWeight: { type: Number, min: 0, max: 5 },
    bggRating: { type: Number, min: 0 },
    categories: { type: [String], default: [], index: true },
    mechanics: { type: [String], default: [], index: true },
    designers: { type: [String], default: [] },
    status: {
      type: String,
      enum: GAME_STATUSES,
      default: 'available',
      index: true,
    },
    copies: { type: Number, default: 1, min: 1 }, // จำนวนกล่อง (อย่างน้อย 1)
    shelf: { type: String, default: '', trim: true, index: true },
    sku: { type: String, default: '', trim: true, index: true },
    barcode: { type: String, default: '', trim: true },
    publisher: { type: String, default: '', trim: true },
    notes: { type: String, default: '' },
    createdBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

GameSchema.index({ name: 'text', description: 'text' });
GameSchema.index({ status: 1, shelf: 1 });

export const Game = model('Game', GameSchema);
