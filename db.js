const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Mongoose Models
const Device = require('./models/Device');
const Loan = require('./models/Loan');
const Activity = require('./models/Activity');
const User = require('./models/User');
const Office = require('./models/Office');

const JSON_DB_FILE = path.join(__dirname, 'db.json');

let useJsonDb = false;
let jsonDbData = { devices: [], loans: [], activities: [], users: [], offices: [] };

function loadJsonDb() {
  if (fs.existsSync(JSON_DB_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(JSON_DB_FILE, 'utf8'));
      jsonDbData = {
        devices: parsed.devices || [],
        loans: parsed.loans || [],
        activities: parsed.activities || [],
        users: parsed.users || [],
        offices: parsed.offices || []
      };
    } catch (err) {
      console.error('Error reading JSON DB file, initializing empty', err);
    }
  } else {
    saveJsonDb();
  }
}

function saveJsonDb() {
  fs.writeFileSync(JSON_DB_FILE, JSON.stringify(jsonDbData, null, 2), 'utf8');
}

function generateId() {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

async function connectDb() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/it-lease';
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[Database] Connected to MongoDB at ${mongoUri}`);
    useJsonDb = false;
  } catch (err) {
    console.warn(`[Database] MongoDB not reachable (${err.message}). Using local JSON storage (db.json).`);
    useJsonDb = true;
    loadJsonDb();
  }
}

const db = {
  isUsingJsonDb: () => useJsonDb,
  
  connectDb,

  users: {
    find: async (query = {}) => {
      if (!useJsonDb) {
        return await User.find(query).lean();
      }
      return jsonDbData.users.filter(u => {
        for (let key in query) {
          if (query[key] !== undefined && u[key] !== query[key]) {
            return false;
          }
        }
        return true;
      });
    },

    create: async (userData) => {
      if (!useJsonDb) {
        return await User.create(userData);
      }
      const bcrypt = require('bcryptjs');
      let hashedPassword = userData.password;
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(userData.password, salt);
      }
      const newUser = {
        id: generateId(),
        _id: generateId(),
        ...userData,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };
      jsonDbData.users.push(newUser);
      saveJsonDb();
      return newUser;
    },

    findByIdAndUpdate: async (id, updateData) => {
      const bcrypt = require('bcryptjs');
      const isAlreadyHashed = updateData.password && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(updateData.password);
      if (updateData.password && !isAlreadyHashed) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(updateData.password, salt);
      }

      if (!useJsonDb) {
        return await User.findByIdAndUpdate(id, updateData, { new: true });
      }

      const userIndex = jsonDbData.users.findIndex(u => u.id === id || u._id === id);
      if (userIndex > -1) {
        jsonDbData.users[userIndex] = {
          ...jsonDbData.users[userIndex],
          ...updateData,
          password: updateData.password || jsonDbData.users[userIndex].password
        };
        saveJsonDb();
        return jsonDbData.users[userIndex];
      }
      return null;
    },

    deleteMany: async (query = {}) => {
      if (!useJsonDb) {
        return await User.deleteMany(query);
      }
      const beforeCount = jsonDbData.users.length;
      jsonDbData.users = jsonDbData.users.filter(u => {
        for (let key in query) {
          if (u[key] === query[key]) return false;
        }
        return true;
      });
      saveJsonDb();
      return { deletedCount: beforeCount - jsonDbData.users.length };
    }
  },

  devices: {
    find: async (query = {}) => {
      if (!useJsonDb) {
        return await Device.find(query).lean();
      }
      return jsonDbData.devices.filter(d => {
        for (let key in query) {
          if (query[key] !== undefined && d[key] !== query[key]) {
            return false;
          }
        }
        return true;
      });
    },

    findById: async (id) => {
      if (!useJsonDb) {
        return await Device.findById(id).lean();
      }
      return jsonDbData.devices.find(d => d.id === id || d._id === id);
    },

    create: async (deviceData) => {
      if (!useJsonDb) {
        return await Device.create(deviceData);
      }
      
      const newDevice = {
        id: generateId(),
        _id: generateId(),
        ...deviceData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      jsonDbData.devices.push(newDevice);
      saveJsonDb();
      return newDevice;
    },

    findByIdAndUpdate: async (id, updateData) => {
      if (!useJsonDb) {
        return await Device.findByIdAndUpdate(id, updateData, { new: true }).lean();
      }
      
      const deviceIndex = jsonDbData.devices.findIndex(d => d.id === id || d._id === id);
      if (deviceIndex > -1) {
        const current = jsonDbData.devices[deviceIndex];
        const mergedSpecs = {
          ...(current.specs || {}),
          ...(updateData.specs || {})
        };
        
        jsonDbData.devices[deviceIndex] = {
          ...current,
          ...updateData,
          specs: mergedSpecs,
          updatedAt: new Date().toISOString()
        };
        saveJsonDb();
        return jsonDbData.devices[deviceIndex];
      }
      return null;
    },

    exists: async (query) => {
      if (!useJsonDb) {
        return await Device.exists(query);
      }
      return jsonDbData.devices.some(d => {
        for (let key in query) {
          if (d[key] === query[key]) return true;
        }
        return false;
      });
    },

    findByIdAndDelete: async (id) => {
      if (!useJsonDb) {
        return await Device.findByIdAndDelete(id).lean();
      }
      const deviceIndex = jsonDbData.devices.findIndex(d => d.id === id || d._id === id);
      if (deviceIndex > -1) {
        const deleted = jsonDbData.devices[deviceIndex];
        jsonDbData.devices.splice(deviceIndex, 1);
        saveJsonDb();
        return deleted;
      }
      return null;
    },

    deleteMany: async (query = {}) => {
      if (!useJsonDb) {
        return await Device.deleteMany(query);
      }
      const beforeCount = jsonDbData.devices.length;
      jsonDbData.devices = jsonDbData.devices.filter(d => {
        for (let key in query) {
          if (d[key] === query[key]) return false;
        }
        return true;
      });
      saveJsonDb();
      return { deletedCount: beforeCount - jsonDbData.devices.length };
    }
  },

  loans: {
    find: async (query = {}) => {
      if (!useJsonDb) {
        return await Loan.find(query).populate('device').lean();
      }

      const loansMapped = jsonDbData.loans.filter(l => {
        for (let key in query) {
          if (query[key] !== undefined && l[key] !== query[key]) {
            return false;
          }
        }
        return true;
      });

      return loansMapped.map(loan => {
        const deviceObj = jsonDbData.devices.find(d => d.id === loan.deviceId || d._id === loan.deviceId);
        return {
          ...loan,
          device: deviceObj || { brand: 'Nieznany', model: 'Komputer', assetTag: 'N/A' }
        };
      });
    },

    findById: async (id) => {
      if (!useJsonDb) {
        return await Loan.findById(id).populate('device').lean();
      }
      const loan = jsonDbData.loans.find(l => l.id === id || l._id === id);
      if (loan) {
        const deviceObj = jsonDbData.devices.find(d => d.id === loan.deviceId || d._id === loan.deviceId);
        return {
          ...loan,
          device: deviceObj
        };
      }
      return null;
    },

    create: async (loanData) => {
      if (!useJsonDb) {
        return await Loan.create(loanData);
      }

      const newLoan = {
        id: generateId(),
        _id: generateId(),
        ...loanData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      jsonDbData.loans.push(newLoan);
      saveJsonDb();
      return newLoan;
    },

    findByIdAndUpdate: async (id, updateData) => {
      if (!useJsonDb) {
        return await Loan.findByIdAndUpdate(id, updateData, { new: true }).lean();
      }

      const loanIndex = jsonDbData.loans.findIndex(l => l.id === id || l._id === id);
      if (loanIndex > -1) {
        jsonDbData.loans[loanIndex] = {
          ...jsonDbData.loans[loanIndex],
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        saveJsonDb();
        return jsonDbData.loans[loanIndex];
      }
      return null;
    },

    findByIdAndDelete: async (id) => {
      if (!useJsonDb) {
        return await Loan.findByIdAndDelete(id).lean();
      }
      const loanIndex = jsonDbData.loans.findIndex(l => l.id === id || l._id === id);
      if (loanIndex > -1) {
        const deleted = jsonDbData.loans[loanIndex];
        jsonDbData.loans.splice(loanIndex, 1);
        saveJsonDb();
        return deleted;
      }
      return null;
    },

    deleteMany: async (query = {}) => {
      if (!useJsonDb) {
        return await Loan.deleteMany(query);
      }
      const beforeCount = jsonDbData.loans.length;
      jsonDbData.loans = jsonDbData.loans.filter(l => {
        for (let key in query) {
          if (l[key] === query[key]) return false;
        }
        return true;
      });
      saveJsonDb();
      return { deletedCount: beforeCount - jsonDbData.loans.length };
    }
  },

  activities: {
    find: async (query = {}, options = {}) => {
      if (!useJsonDb) {
        const q = Activity.find(query).sort({ createdAt: -1 });
        if (options.limit) q.limit(options.limit);
        return await q.lean();
      }

      const sorted = [...jsonDbData.activities].sort((a,b) => new Date(b.date) - new Date(a.date));
      if (options.limit) {
        return sorted.slice(0, options.limit);
      }
      return sorted;
    },

    create: async (activityData) => {
      if (!useJsonDb) {
        return await Activity.create(activityData);
      }

      const newAct = {
        id: generateId(),
        _id: generateId(),
        ...activityData,
        createdAt: new Date().toISOString()
      };
      jsonDbData.activities.unshift(newAct);
      
      if (jsonDbData.activities.length > 50) {
        jsonDbData.activities.pop();
      }
      
      saveJsonDb();
      return newAct;
    },

    deleteMany: async (query = {}) => {
      if (!useJsonDb) {
        return await Activity.deleteMany(query);
      }
      const beforeCount = jsonDbData.activities.length;
      jsonDbData.activities = jsonDbData.activities.filter(a => {
        for (let key in query) {
          if (a[key] === query[key]) return false;
        }
        return true;
      });
      saveJsonDb();
      return { deletedCount: beforeCount - jsonDbData.activities.length };
    }
  },

  offices: {
    find: async (query = {}) => {
      if (!useJsonDb) {
        return await Office.find(query).sort({ name: 1 }).lean();
      }
      return jsonDbData.offices.filter(o => {
        for (let key in query) {
          if (query[key] !== undefined && o[key] !== query[key]) {
            return false;
          }
        }
        return true;
      }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    },

    findOne: async (query = {}) => {
      if (!useJsonDb) {
        return await Office.findOne(query).lean();
      }
      return jsonDbData.offices.find(o => {
        for (let key in query) {
          if (query[key] !== undefined && o[key] !== query[key]) {
            return false;
          }
        }
        return true;
      }) || null;
    },

    findById: async (id) => {
      if (!useJsonDb) {
        return await Office.findById(id).lean();
      }
      return jsonDbData.offices.find(o => o.id === id || o._id === id) || null;
    },

    create: async (officeData) => {
      if (!useJsonDb) {
        return await Office.create(officeData);
      }
      const newOffice = {
        id: generateId(),
        _id: generateId(),
        ...officeData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      jsonDbData.offices.push(newOffice);
      saveJsonDb();
      return newOffice;
    },

    findByIdAndUpdate: async (id, updateData) => {
      if (!useJsonDb) {
        return await Office.findByIdAndUpdate(id, updateData, { new: true }).lean();
      }
      const officeIndex = jsonDbData.offices.findIndex(o => o.id === id || o._id === id);
      if (officeIndex > -1) {
        jsonDbData.offices[officeIndex] = {
          ...jsonDbData.offices[officeIndex],
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        saveJsonDb();
        return jsonDbData.offices[officeIndex];
      }
      return null;
    },

    findByIdAndDelete: async (id) => {
      if (!useJsonDb) {
        return await Office.findByIdAndDelete(id).lean();
      }
      const officeIndex = jsonDbData.offices.findIndex(o => o.id === id || o._id === id);
      if (officeIndex > -1) {
        const deleted = jsonDbData.offices[officeIndex];
        jsonDbData.offices.splice(officeIndex, 1);
        saveJsonDb();
        return deleted;
      }
      return null;
    },

    deleteMany: async (query = {}) => {
      if (!useJsonDb) {
        return await Office.deleteMany(query);
      }
      const beforeCount = jsonDbData.offices.length;
      jsonDbData.offices = jsonDbData.offices.filter(o => {
        for (let key in query) {
          if (o[key] === query[key]) return false;
        }
        return true;
      });
      saveJsonDb();
      return { deletedCount: beforeCount - jsonDbData.offices.length };
    },

    exists: async (query) => {
      if (!useJsonDb) {
        return await Office.exists(query);
      }
      return jsonDbData.offices.some(o => {
        for (let key in query) {
          if (o[key] === query[key]) return true;
        }
        return false;
      });
    }
  }
};

module.exports = db;
