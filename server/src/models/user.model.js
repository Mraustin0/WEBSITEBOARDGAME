import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    username:     { type: String, required: true, unique: true, trim: true, minlength: 3 },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  },
  { timestamps: true },
);

UserSchema.methods.toPublic = function toPublic() {
  return { id: this._id, username: this.username, email: this.email, role: this.role };
};

export const User = model('User', UserSchema);
