import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

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
    // BGG-derived aggregate stats (populated on import)
    bggAverage: { type: Number, min: 0, max: 10 },
    bggWeight: { type: Number, min: 0, max: 5 },
    bggRating: { type: Number, min: 0 },
    categories: { type: [String], default: [], index: true },
    mechanics: { type: [String], default: [], index: true },
    designers: { type: [String], default: [] },
    // สถานะของกล่องเกมในร้าน: available → in_use (มีโต๊ะกำลังเล่น) → available; maintenance = ปิดจอง
    status: {
      type: String,
      enum: ['available', 'in_use', 'maintenance'],
      default: 'available',
      index: true,
    },
    createdBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

GameSchema.index({ name: 'text', description: 'text' });

export const Game = model('Game', GameSchema);
