import { Schema } from 'mongoose';

export function AutoTimestampPlugin(schema: Schema) {
  schema.add({
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });

  schema.pre('save', function (next) {
    const now = new Date();
    (this as any).updatedAt = now;
    if (!this.createdAt) {
      (this as any).createdAt = now;
    }
    next();
  });
}
