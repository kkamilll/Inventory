const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  employeeName: {
    type: String,
    required: true,
    trim: true
  },
  employeeEmail: {
    type: String,
    required: true,
    trim: true
  },
  employeeDept: {
    type: String,
    required: true,
    trim: true
  },
  loanDate: {
    type: String, // String representation of YYYY-MM-DD for consistency
    required: true
  },
  expectedReturnDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  actualReturnDate: {
    type: String // YYYY-MM-DD
  },
  status: {
    type: String,
    enum: ['active', 'returned'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Loan', loanSchema);
