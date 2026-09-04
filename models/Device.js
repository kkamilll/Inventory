const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  assetTag: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['laptop', 'desktop'],
    required: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  location: {
    type: String,
    enum: ['Warszawa', 'Kraków'],
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'loaned', 'maintenance', 'retired', 'in_transit'],
    default: 'available'
  },
  specs: {
    cpu: String,
    ram: String,
    ssd: String
  },
  notes: String,
  // Leasing & Financial details
  leaseProvider: {
    type: String,
    trim: true
  },
  expectedLeaseCost: {
    type: Number,
    default: 0
  },
  actualLeaseCost: {
    type: Number,
    default: 0
  },
  deviceValue: {
    type: Number,
    default: 0
  },
  leaseStartDate: String, // YYYY-MM-DD
  leaseEndDate: String,   // YYYY-MM-DD
  // Inter-office transfer details
  transferPending: {
    type: Boolean,
    default: false
  },
  transferFrom: String,
  transferTo: String,
  transferInitiatedBy: String,
  transferInitiatedAt: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Device', deviceSchema);
