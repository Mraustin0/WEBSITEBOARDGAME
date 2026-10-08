import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const DaySchema = new Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    open: { type: String, default: '10:00' },
    close: { type: String, default: '24:00' },
    closed: { type: Boolean, default: false },
    label: { type: String, default: '' }, // e.g. Peak Hour Shift
  },
  { _id: false },
);

const defaultDays = () =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '10:00', close: '24:00', closed: false }));

const SettingsSchema = new Schema(
  {
    key: { type: String, default: 'store', unique: true },
    store: {
      name: { type: String, default: 'Boardgame Everyday' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    pricing: {
      perPersonHour: { type: Number, default: 50, min: 0 },
      flat3hPerPerson: { type: Number, default: 130, min: 0 },
      revenueTargetPerDay: { type: Number, default: 0, min: 0 },
      // peak hour
      peakEnabled: { type: Boolean, default: false },
      peakPerPersonHour: { type: Number, default: 80, min: 0 },
      peakStart: { type: String, default: '17:00' },
      peakEnd: { type: String, default: '23:00' },
      // student discount
      studentDiscountEnabled: { type: Boolean, default: false },
      studentDiscountPercent: { type: Number, default: 15, min: 0, max: 100 },
    },
    booking: {
      maxAdvanceDays: { type: Number, default: 3, min: 0 },
      minHours: { type: Number, default: 1, min: 0.5 },
      maxHours: { type: Number, default: 6, min: 0.5 },
      overtimeGraceMin: { type: Number, default: 10, min: 0 },
      extraSeats: { type: Number, default: 2, min: 0 },
      cancelCutoffHours: { type: Number, default: 2, min: 0 },
    },
    operatingHours: {
      enforce: { type: Boolean, default: false },
      days: { type: [DaySchema], default: defaultDays },
    },
    noShow: {
      graceMin: { type: Number, default: 30, min: 0 },
      depositPerPerson: { type: Number, default: 0, min: 0 },
      depositPerTable: { type: Number, default: 0, min: 0 },
      suspendAfter: { type: Number, default: 3, min: 0 },
      autoRefundDeposit: { type: Boolean, default: false },
      notifyEnabled: { type: Boolean, default: true },
    },
    notifications: {
      bookingReminderHours: { type: Number, default: 1, min: 0 },
      smsEnabled: { type: Boolean, default: false },
      lineNotifyEnabled: { type: Boolean, default: false },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Settings = model('Settings', SettingsSchema);
