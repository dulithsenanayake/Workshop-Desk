import mongoose from 'mongoose';

export const WORKSHOP_STATUSES = ['scheduled', 'completed', 'cancelled'];

const workshopSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 20 },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    instructor: { type: String, required: true, trim: true, maxlength: 100 },
    startsAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 120, min: 15, max: 1440 },
    // Extra fields: the centre has three locations, so staff will need to know where.
    location: { type: String, trim: true, maxlength: 100, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    capacity: { type: Number, required: true, min: 1, max: 1000, validate: Number.isInteger },
    /**
     * Denormalised count of ACTIVE registrations. It is the concurrency control point:
     * seats are claimed with an atomic conditional $inc (activeCount < capacity), which MongoDB
     * serialises per document. See services/registrationService.js.
     */
    activeCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: WORKSHOP_STATUSES, default: 'scheduled' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
  },
);

workshopSchema.virtual('seatsAvailable').get(function seatsAvailable() {
  return Math.max(this.capacity - this.activeCount, 0);
});

workshopSchema.index({ startsAt: 1 });
workshopSchema.index({ status: 1, startsAt: 1 });

export const Workshop = mongoose.model('Workshop', workshopSchema);
