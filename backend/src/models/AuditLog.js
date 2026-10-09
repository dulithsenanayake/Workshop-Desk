import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true }, // e.g. workshop.update, user.role_change
    entityType: { type: String, required: true, enum: ['workshop', 'user'] },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    summary: { type: String, default: '' },
    changes: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'at', updatedAt: false }, toJSON: { transform: (_d, r) => { delete r.__v; return r; } } },
);

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, at: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
