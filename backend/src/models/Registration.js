import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true, index: true },
    attendeeName: { type: String, required: true, trim: true, maxlength: 100 },
    attendeeEmail: { type: String, required: true, lowercase: true, trim: true },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true, maxlength: 300 },
  },
  {
    timestamps: { createdAt: 'registeredAt', updatedAt: 'updatedAt' },
    toJSON: { transform: (_d, ret) => { delete ret.__v; return ret; } },
  },
);

// One ACTIVE registration per attendee per workshop. Cancelled rows are exempt, so people can
// re-register after cancelling while the history stays intact.
registrationSchema.index(
  { workshop: 1, attendeeEmail: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);
registrationSchema.index({ workshop: 1, registeredAt: -1 });

export const Registration = mongoose.model('Registration', registrationSchema);
