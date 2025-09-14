import mongoose, { Schema, Document } from 'mongoose';

export interface IPermission extends Document {
  _id: string;
  name: string;
  description: string;
  module: string;
  action: 'view' | 'insert' | 'update' | 'delete';
  resource: string;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  module: {
    type: String,
    required: true,
    enum: ['tasks', 'users', 'teams', 'locations', 'attachments', 'reports', 'attendance', 'tracking'],
  },
  action: {
    type: String,
    required: true,
    enum: ['view', 'insert', 'update', 'delete'],
  },
  resource: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

permissionSchema.index({ module: 1, action: 1, resource: 1 });

export default mongoose.model<IPermission>('Permission', permissionSchema);