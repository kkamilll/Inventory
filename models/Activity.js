const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['loan', 'return', 'maintenance', 'system', 'transfer'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  user: {
    type: String,
    required: true
  },
  date: {
    type: String // YYYY-MM-DD HH:MM
  },
  admin: {
    type: String
  },
  details: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Activity', activitySchema);
