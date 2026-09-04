const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const os = require('os');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'it-lease-hub-super-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware verifying JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Brak tokenu autoryzacji. Zaloguj się.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Nieprawidłowy lub wygasły token sesji. Zaloguj się ponownie.' });
    }
    req.user = user;
    next();
  });
}

// Middleware: only Admin
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Brak autoryzacji.' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Brak uprawnień. Ta operacja wymaga roli Administrator IT.' });
  }
  next();
}

// Middleware: Admin or IT Worker (device management)
function requireAdminOrIT(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Brak autoryzacji.' });
  if (!['admin', 'it'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Brak uprawnień. Ta operacja wymaga roli IT lub Administrator.' });
  }
  next();
}

// Ensure initial admin user and default offices exist so the system is ready out of the box
async function ensureDefaultsExist() {
  try {
    const admins = await db.users.find({ role: 'admin' });
    if (admins.length === 0) {
      console.log('[Auth] Creating initial administrator account (admin@firma.pl)...');
      await db.users.create({
        name: 'Andrzej IT Admin',
        email: 'admin@firma.pl',
        password: 'admin123',
        role: 'admin',
        securityQuestion: 'Twoje pierwsze auto',
        securityAnswer: 'maluch'
      });
      console.log('[Auth] Administrator account ready: admin@firma.pl / admin123');
    }

    const offices = await db.offices.find();
    if (offices.length === 0) {
      console.log('[Setup] Seeding default offices (Warszawa HQ, Kraków)...');
      await db.offices.create({
        name: 'Warszawa',
        code: 'WAW',
        isHq: true,
        address: 'ul. Marszałkowska 10, 00-001 Warszawa'
      });
      await db.offices.create({
        name: 'Kraków',
        code: 'KRK',
        isHq: false,
        address: 'ul. Floriańska 20, 31-021 Kraków'
      });
      console.log('[Setup] Default offices ready.');
    }
  } catch (err) {
    console.error('[Setup Error] Could not initialize defaults:', err);
  }
}

// REST API Routes

// Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, securityQuestion, securityAnswer } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Imię, e-mail oraz hasło są wymagane.' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Niepoprawny format adresu e-mail.' });
    }

    const users = await db.users.find({ email: email.toLowerCase().trim() });
    if (users.length > 0) {
      return res.status(400).json({ error: 'Użytkownik o takim adresie e-mail już istnieje.' });
    }

    const allowedRoles = ['admin', 'it', 'accountant'];
    const userRole = allowedRoles.includes(role) ? role : 'it';

    const newUser = await db.users.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: userRole,
      securityQuestion: securityQuestion ? securityQuestion.trim() : 'Imię pierwszego zwierzaka',
      securityAnswer: securityAnswer ? securityAnswer.toLowerCase().trim() : 'azor'
    });

    res.status(201).json({
      message: 'Rejestracja pomyślna. Możesz się teraz zalogować.',
      user: {
        id: newUser._id || newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd podczas rejestracji: ' + err.message });
  }
});

// Auth: Forgot password - Step 1: Request Reset Code via E-mail
app.post('/api/auth/forgot-password/request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Adres e-mail jest wymagany.' });
    }

    const foundUsers = await db.users.find({ email: email.toLowerCase().trim() });
    if (foundUsers.length === 0) {
      return res.status(404).json({ error: 'Użytkownik z tym adresem e-mail nie istnieje.' });
    }

    const user = foundUsers[0];
    
    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // valid for 15 minutes

    const userId = user._id || user.id;
    await db.users.findByIdAndUpdate(userId, {
      resetCode: code,
      resetCodeExpires: expiry
    });

    // Send the e-mail
    const mailer = require('./mailer');
    await mailer.sendResetCodeEmail(user.email, code);

    res.json({
      message: 'Kod resetujący został wysłany na Twój adres e-mail.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd generowania kodu resetującego: ' + err.message });
  }
});

// Auth: Forgot password - Step 2: Verify Code and Reset Password
app.post('/api/auth/forgot-password/reset', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'E-mail, kod resetujący oraz nowe hasło są wymagane.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nowe hasło musi mieć co najmniej 6 znaków.' });
    }

    const foundUsers = await db.users.find({ email: email.toLowerCase().trim() });
    if (foundUsers.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie istnieje.' });
    }

    const user = foundUsers[0];
    
    if (!user.resetCode || user.resetCode !== code.trim()) {
      return res.status(400).json({ error: 'Niepoprawny kod resetujący.' });
    }

    const expiryTime = new Date(user.resetCodeExpires).getTime();
    if (expiryTime < Date.now()) {
      return res.status(400).json({ error: 'Kod resetujący wygasł. Poproś o nowy kod.' });
    }

    // Update user password and clear reset fields
    const userId = user._id || user.id;
    await db.users.findByIdAndUpdate(userId, {
      password: newPassword,
      resetCode: null,
      resetCodeExpires: null
    });

    res.json({ message: 'Hasło zostało pomyślnie zresetowane.' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd resetowania hasła: ' + err.message });
  }
});

// Auth: Change Password (authenticated user)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Stare i nowe hasło są wymagane.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nowe hasło musi mieć co najmniej 6 znaków.' });
    }

    const foundUsers = await db.users.find({ email: req.user.email });
    if (foundUsers.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie istnieje.' });
    }

    const user = foundUsers[0];

    // Check old password
    let isMatch = false;
    if (db.isUsingJsonDb()) {
      isMatch = await bcrypt.compare(oldPassword, user.password);
    } else {
      const userDoc = await require('./models/User').findOne({ email: req.user.email });
      if (userDoc) {
        isMatch = await userDoc.comparePassword(oldPassword);
      }
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Aktualne hasło jest niepoprawne.' });
    }

    // Update password
    const userId = user._id || user.id;
    await db.users.findByIdAndUpdate(userId, { password: newPassword });

    res.json({ message: 'Hasło zostało pomyślnie zmienione.' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd zmiany hasła: ' + err.message });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail oraz hasło są wymagane.' });
    }

    const foundUsers = await db.users.find({ email: email.toLowerCase().trim() });
    if (foundUsers.length === 0) {
      return res.status(400).json({ error: 'Nieprawidłowy e-mail lub hasło.' });
    }

    const user = foundUsers[0];
    
    let isMatch = false;
    if (db.isUsingJsonDb()) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      const userDoc = await require('./models/User').findOne({ email: email.toLowerCase().trim() });
      if (userDoc) {
        isMatch = await userDoc.comparePassword(password);
      }
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Nieprawidłowy e-mail lub hasło.' });
    }

    const token = jwt.sign(
      { id: user._id || user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd podczas logowania: ' + err.message });
  }
});

// Auth: Get profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// Helper to format date
function getFormattedDateTime() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// 0. GET Users list
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await db.users.find();
    // Return only non-sensitive info
    const safeUsers = users.map(u => ({
      name: u.name,
      email: u.email,
      role: u.role
    }));
    res.json(safeUsers);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania użytkowników: ' + err.message });
  }
});

// --- Offices Management Endpoints ---

// GET All Offices (with device counts stationed in each)
app.get('/api/offices', authenticateToken, async (req, res) => {
  try {
    const offices = await db.offices.find();
    const devices = await db.devices.find();
    const result = offices.map(off => ({
      ...off,
      deviceCount: devices.filter(d => d.location === off.name).length
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania oddziałów: ' + err.message });
  }
});

// POST Create Office (Admin only)
app.post('/api/offices', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, code, isHq, address } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Nazwa oddziału jest wymagana.' });
    }

    const trimmedName = name.trim();
    const exists = await db.offices.exists({ name: trimmedName });
    if (exists) {
      return res.status(400).json({ error: `Oddział o nazwie "${trimmedName}" już istnieje.` });
    }

    // If marked as HQ, unmark previous HQ
    if (isHq) {
      const allOffices = await db.offices.find();
      for (const off of allOffices) {
        if (off.isHq) {
          await db.offices.findByIdAndUpdate(off._id || off.id, { isHq: false });
        }
      }
    }

    const newOffice = await db.offices.create({
      name: trimmedName,
      code: code ? code.trim().toUpperCase() : '',
      isHq: Boolean(isHq),
      address: address ? address.trim() : ''
    });

    await db.activities.create({
      type: 'maintenance',
      title: `Dodano nowy oddział: ${trimmedName}${isHq ? ' (Centrala/HQ)' : ''}`,
      user: req.user.name,
      admin: req.user.name,
      date: getFormattedDateTime(),
      details: `Kod: ${newOffice.code || 'Brak'}, Adres: ${newOffice.address || 'Brak'}`
    });

    res.status(201).json(newOffice);
  } catch (err) {
    res.status(500).json({ error: 'Błąd tworzenia oddziału: ' + err.message });
  }
});

// PUT Update Office (Admin only)
app.put('/api/offices/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const officeId = req.params.id;
    const { name, code, isHq, address } = req.body;
    const office = await db.offices.findById(officeId);
    if (!office) {
      return res.status(404).json({ error: 'Oddział nie istnieje.' });
    }

    const updateData = {};
    const oldName = office.name;

    if (name && name.trim() !== '') {
      const newName = name.trim();
      if (newName !== oldName) {
        const nameTaken = await db.offices.exists({ name: newName });
        if (nameTaken) {
          return res.status(400).json({ error: `Nazwa oddziału "${newName}" jest już zajęta.` });
        }
        updateData.name = newName;

        // Cascade rename to all devices stationed in this office
        const devices = await db.devices.find({ location: oldName });
        for (const dev of devices) {
          await db.devices.findByIdAndUpdate(dev._id || dev.id, { location: newName });
        }
      }
    }

    if (code !== undefined) updateData.code = code.trim().toUpperCase();
    if (address !== undefined) updateData.address = address.trim();

    if (isHq !== undefined) {
      updateData.isHq = Boolean(isHq);
      if (updateData.isHq) {
        const allOffices = await db.offices.find();
        for (const off of allOffices) {
          const oId = off._id || off.id;
          if (oId.toString() !== officeId.toString() && off.isHq) {
            await db.offices.findByIdAndUpdate(oId, { isHq: false });
          }
        }
      }
    }

    const updated = await db.offices.findByIdAndUpdate(officeId, updateData);

    await db.activities.create({
      type: 'maintenance',
      title: `Zaktualizowano oddział: ${updateData.name || oldName}`,
      user: req.user.name,
      admin: req.user.name,
      date: getFormattedDateTime(),
      details: `Zmiana: ${oldName} -> ${updateData.name || oldName}`
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Błąd aktualizacji oddziału: ' + err.message });
  }
});

// DELETE Office (Admin only)
app.delete('/api/offices/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const officeId = req.params.id;
    const office = await db.offices.findById(officeId);
    if (!office) {
      return res.status(404).json({ error: 'Oddział nie istnieje.' });
    }

    const allOffices = await db.offices.find();
    if (allOffices.length <= 1) {
      return res.status(400).json({ error: 'Nie można usunąć jedynego oddziału. W systemie musi pozostać co najmniej jedno biuro.' });
    }

    const allDevices = await db.devices.find();
    const devicesAtOffice = allDevices.filter(d => d.location === office.name || (d.transferTo === office.name && d.status === 'in_transit'));
    if (devicesAtOffice.length > 0) {
      return res.status(400).json({ 
        error: `Nie można usunąć oddziału "${office.name}", ponieważ jest do niego przypisanych ${devicesAtOffice.length} urządzeń. Przenieś najpierw sprzęt do innej lokalizacji.` 
      });
    }

    await db.offices.findByIdAndDelete(officeId);

    await db.activities.create({
      type: 'maintenance',
      title: `Usunięto oddział: ${office.name}`,
      user: req.user.name,
      admin: req.user.name,
      date: getFormattedDateTime(),
      details: `Oddział ${office.name} został trwale usunięty z konfiguracji.`
    });

    res.json({ message: `Oddział "${office.name}" został pomyślnie usunięty.` });
  } catch (err) {
    res.status(500).json({ error: 'Błąd usuwania oddziału: ' + err.message });
  }
});

// 1. GET Stats
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const devices = await db.devices.find();
    const offices = await db.offices.find();
    
    const byLocation = {};
    offices.forEach(off => {
      byLocation[off.name] = 0;
    });
    devices.forEach(d => {
      if (d.location) {
        byLocation[d.location] = (byLocation[d.location] || 0) + 1;
      }
    });

    const stats = {
      total: devices.length,
      available: devices.filter(d => d.status === 'available').length,
      loaned: devices.filter(d => d.status === 'loaned').length,
      maintenance: devices.filter(d => d.status === 'maintenance').length,
      retired: devices.filter(d => d.status === 'retired').length,
      byLocation,
      // Backward compatibility
      hqWarszawa: byLocation['Warszawa'] || 0,
      hqKrakow: byLocation['Kraków'] || 0
    };
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania statystyk: ' + err.message });
  }
});

// 2. GET Devices with filtering
app.get('/api/devices', authenticateToken, async (req, res) => {
  try {
    const { type, status, location, search } = req.query;
    let query = {};
    
    if (type && type !== 'all') query.type = type;
    if (status && status !== 'all') query.status = status;
    if (location && location !== 'all') query.location = location;

    let devices = await db.devices.find(query);

    if (search && search.trim() !== '') {
      const keyword = search.toLowerCase().trim();
      devices = devices.filter(d => 
        d.brand.toLowerCase().includes(keyword) ||
        d.model.toLowerCase().includes(keyword) ||
        d.serialNumber.toLowerCase().includes(keyword) ||
        d.assetTag.toLowerCase().includes(keyword) ||
        (d.specs && d.specs.cpu && d.specs.cpu.toLowerCase().includes(keyword))
      );
    }

    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania sprzętu: ' + err.message });
  }
});

// 3. GET Device by ID
app.get('/api/devices/:id', authenticateToken, async (req, res) => {
  try {
    const device = await db.devices.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Urządzenie nie zostało znalezione' });
    }
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania urządzenia: ' + err.message });
  }
});

// 4. POST Add Device (REQUIRES ADMIN or IT)
app.post('/api/devices', authenticateToken, requireAdminOrIT, async (req, res) => {
  try {
    const { 
      assetTag, type, brand, model, serialNumber, location, status, specs, notes,
      leaseProvider, expectedLeaseCost, actualLeaseCost, deviceValue, leaseStartDate, leaseEndDate 
    } = req.body;

    if (!assetTag || !brand || !model || !serialNumber || !type || !location) {
      return res.status(400).json({ error: 'Asset Tag, typ, marka, model, numer seryjny oraz oddział są wymagane.' });
    }

    // Input validation
    if (!['laptop', 'desktop'].includes(type)) {
      return res.status(400).json({ error: 'Typ urządzenia musi być "laptop" lub "desktop".' });
    }

    const officeExists = await db.offices.exists({ name: location.trim() });
    if (!officeExists) {
      return res.status(400).json({ error: `Wybrany oddział "${location}" nie istnieje w systemie. Dodaj go w sekcji Oddziały.` });
    }

    if (status && !['available', 'maintenance', 'retired', 'loaned', 'in_transit'].includes(status)) {
      return res.status(400).json({ error: 'Nieprawidłowy status sprzętu.' });
    }

    if (status === 'retired') {
      const hqOffice = await db.offices.findOne({ isHq: true });
      if (hqOffice && location.trim() !== hqOffice.name) {
        return res.status(400).json({ 
          error: `Wycofanie / zwrot do leasingodawcy (status: Wycofany) jest możliwy wyłącznie z centrali (${hqOffice.name}). Przesuń najpierw sprzęt.` 
        });
      }
    }

    const existsAsset = await db.devices.exists({ assetTag: assetTag.trim() });
    const existsSerial = await db.devices.exists({ serialNumber: serialNumber.trim() });

    if (existsAsset || existsSerial) {
      return res.status(400).json({ error: 'Urządzenie o takim Asset Tag lub numerze seryjnym już istnieje w bazie.' });
    }

    const newDevice = await db.devices.create({
      assetTag: assetTag.trim(),
      type,
      brand: brand.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      location,
      status: status || 'available',
      specs: specs || {},
      notes: notes || '',
      leaseProvider: leaseProvider ? leaseProvider.trim() : '',
      expectedLeaseCost: Number(expectedLeaseCost) || 0,
      actualLeaseCost: Number(actualLeaseCost) || 0,
      deviceValue: Number(deviceValue) || 0,
      leaseStartDate: leaseStartDate || '',
      leaseEndDate: leaseEndDate || ''
    });

    await db.activities.create({
      type: 'maintenance',
      title: `Dodano nowe urządzenie: ${brand} ${model} (${assetTag})`,
      user: req.user.name,
      admin: req.user.name,
      date: getFormattedDateTime(),
      details: `Typ: ${type}, Oddział: ${location}, Dostawca: ${leaseProvider || 'Brak'}`
    });

    res.status(201).json(newDevice);
  } catch (err) {
    res.status(500).json({ error: 'Błąd dodawania urządzenia: ' + err.message });
  }
});

// 5. PUT Edit Device (Roles handle specific fields inside)
app.put('/api/devices/:id', authenticateToken, async (req, res) => {
  try {
    const deviceId = req.params.id;
    let updateData = { ...req.body };
    const userRole = req.user.role;

    const device = await db.devices.findById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Urządzenie nie istnieje.' });
    }

    // Role-based field filtering
    if (userRole === 'accountant') {
      // Księgowy może zmienić TYLKO finanse, ignorujemy pozostałe pola i zachowujemy te z bazy
      updateData = {
        assetTag: device.assetTag,
        type: device.type,
        brand: device.brand,
        model: device.model,
        serialNumber: device.serialNumber,
        location: device.location,
        status: device.status,
        specs: device.specs,
        notes: device.notes,
        // Zostawiamy nowe z req.body
        leaseProvider: updateData.leaseProvider !== undefined ? updateData.leaseProvider : device.leaseProvider,
        expectedLeaseCost: updateData.expectedLeaseCost !== undefined ? Number(updateData.expectedLeaseCost) : device.expectedLeaseCost,
        actualLeaseCost: updateData.actualLeaseCost !== undefined ? Number(updateData.actualLeaseCost) : device.actualLeaseCost,
        deviceValue: updateData.deviceValue !== undefined ? Number(updateData.deviceValue) : device.deviceValue,
        leaseStartDate: updateData.leaseStartDate !== undefined ? updateData.leaseStartDate : device.leaseStartDate,
        leaseEndDate: updateData.leaseEndDate !== undefined ? updateData.leaseEndDate : device.leaseEndDate
      };
    } else if (userRole === 'it') {
      // IT może zmienić parametry, ale NIE MOŻE zmienić finansów (nadpisujemy dane finansowe starymi)
      updateData.leaseProvider = device.leaseProvider;
      updateData.expectedLeaseCost = device.expectedLeaseCost;
      updateData.actualLeaseCost = device.actualLeaseCost;
      updateData.deviceValue = device.deviceValue;
      updateData.leaseStartDate = device.leaseStartDate;
      updateData.leaseEndDate = device.leaseEndDate;
    }
    // Admin (userRole === 'admin') - zachowuje updateData bez zmian

    if (updateData.status && !['available', 'loaned', 'maintenance', 'retired', 'in_transit'].includes(updateData.status)) {
      return res.status(400).json({ error: 'Nieprawidłowy status sprzętu.' });
    }

    if (updateData.location) {
      const officeExists = await db.offices.exists({ name: updateData.location.trim() });
      if (!officeExists) {
        return res.status(400).json({ error: `Wybrany oddział "${updateData.location}" nie istnieje w systemie.` });
      }
    }

    if (device.status === 'loaned' && updateData.status && updateData.status !== 'loaned') {
      return res.status(400).json({ error: 'Nie można zmienić statusu urządzenia wypożyczonego. Należy najpierw zarejestrować zwrot.' });
    }

    const finalLocation = updateData.location || device.location;
    const finalStatus = updateData.status || device.status;
    if (finalStatus === 'retired') {
      const hqOffice = await db.offices.findOne({ isHq: true });
      if (hqOffice && finalLocation !== hqOffice.name) {
        return res.status(400).json({ 
          error: `Wycofanie / zwrot do leasingodawcy (status: Wycofany) jest możliwy wyłącznie z centrali (${hqOffice.name}). Dokonaj najpierw przesunięcia do ${hqOffice.name}.` 
        });
      }
    }

    // Compare fields for Audit Log
    const changes = [];
    const fieldsToCompare = [
      { key: 'brand', label: 'Marka' },
      { key: 'model', label: 'Model' },
      { key: 'assetTag', label: 'Asset Tag' },
      { key: 'serialNumber', label: 'S/N' },
      { key: 'location', label: 'Lokalizacja' },
      { key: 'status', label: 'Status' },
      { key: 'notes', label: 'Uwagi' },
      // Pola finansowe też mogą być audytowane
      { key: 'leaseProvider', label: 'Dostawca Leasingu' },
      { key: 'expectedLeaseCost', label: 'Oczekiwana Rata' },
      { key: 'actualLeaseCost', label: 'Rzeczywista Rata' },
      { key: 'deviceValue', label: 'Wartość Sprzętu' }
    ];

    fieldsToCompare.forEach(f => {
      let oldVal = device[f.key];
      let newVal = updateData[f.key];
      
      // Standaryzacja dla specs
      if (f.key === 'specs') {
        oldVal = JSON.stringify(oldVal || {});
        newVal = JSON.stringify(newVal || {});
      }

      if (oldVal !== newVal && newVal !== undefined) {
        changes.push(`${f.label}: "${oldVal}" ➔ "${newVal}"`);
      }
    });

    if (updateData.specs) {
      ['cpu', 'ram', 'ssd'].forEach(k => {
        const oldVal = device.specs ? device.specs[k] : '';
        const newVal = updateData.specs[k];
        if (newVal !== undefined && newVal !== oldVal) {
          changes.push(`Spec (${k.toUpperCase()}): "${oldVal || 'brak'}" -> "${newVal}"`);
        }
      });
    }

    const detailsStr = changes.length > 0 ? changes.join(', ') : 'Zaktualizowano bez zmiany głównych pól';

    const updatedDevice = await db.devices.findByIdAndUpdate(deviceId, updateData);

    await db.activities.create({
      type: 'maintenance',
      title: `Zaktualizowano dane urządzenia ${updatedDevice.brand} ${updatedDevice.model} (${updatedDevice.assetTag})`,
      user: req.user.name,
      admin: req.user.name,
      date: getFormattedDateTime(),
      details: detailsStr
    });

    res.json(updatedDevice);
  } catch (err) {
    res.status(500).json({ error: 'Błąd aktualizacji urządzenia: ' + err.message });
  }
});

// 5.2 POST Inter-office Transfer (REQUIRES ADMIN or IT)
app.post('/api/devices/:id/transfer', authenticateToken, requireAdminOrIT, async (req, res) => {
  try {
    const deviceId = req.params.id;
    const device = await db.devices.findById(deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Urządzenie nie istnieje.' });
    }

    if (device.status === 'loaned') {
      return res.status(400).json({ error: 'Nie można przesunąć komputera, który jest obecnie wypożyczony użytkownikowi.' });
    }
    if (device.status === 'in_transit') {
      return res.status(400).json({ error: 'Urządzenie jest już w trakcie transportu.' });
    }

    const oldLocation = device.location;
    let newLocation = req.body.targetLocation;

    if (!newLocation || newLocation.trim() === '') {
      const allOffices = await db.offices.find();
      const pickOther = allOffices.find(o => o.name !== oldLocation);
      if (!pickOther) {
        return res.status(400).json({ error: 'Brak innego oddziału w systemie, do którego można przesunąć sprzęt.' });
      }
      newLocation = pickOther.name;
    } else {
      newLocation = newLocation.trim();
      const exists = await db.offices.exists({ name: newLocation });
      if (!exists) {
        return res.status(400).json({ error: `Oddział docelowy "${newLocation}" nie istnieje w systemie.` });
      }
      if (newLocation === oldLocation) {
        return res.status(400).json({ error: 'Oddział docelowy musi różnić się od bieżącej lokalizacji sprzętu.' });
      }
    }

    const initiatedAt = getFormattedDateTime();

    await db.devices.findByIdAndUpdate(deviceId, {
      status: 'in_transit',
      transferPending: true,
      transferFrom: oldLocation,
      transferTo: newLocation,
      transferInitiatedBy: req.user.name,
      transferInitiatedAt: initiatedAt
    });

    await db.activities.create({
      type: 'transfer',
      title: `Wysłano w transport: ${device.brand} ${device.model} (${device.assetTag}) z oddziału ${oldLocation} do ${newLocation}`,
      user: req.user.name,
      admin: req.user.name,
      date: initiatedAt,
      details: `Wysyłający: ${req.user.name}, data wysyłki: ${initiatedAt}`
    });

    res.json({ message: `Urządzenie zostało wysłane w transport do oddziału ${newLocation}. Oczekuje na potwierdzenie odbioru na miejscu.` });
  } catch (err) {
    res.status(500).json({ error: 'Błąd przesunięcia sprzętu: ' + err.message });
  }
});

// 5.3 POST Confirm Transfer Delivery (REQUIRES ADMIN or IT)
app.post('/api/devices/:id/confirm-transfer', authenticateToken, requireAdminOrIT, async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { condition, notes } = req.body;
    const device = await db.devices.findById(deviceId);

    if (!device) {
      return res.status(404).json({ error: 'Urządzenie nie istnieje.' });
    }

    if (!device.transferPending || device.status !== 'in_transit') {
      return res.status(400).json({ error: 'Urządzenie nie oczekuje obecnie na potwierdzenie odbioru z transportu.' });
    }

    if (!['good', 'damaged'].includes(condition)) {
      return res.status(400).json({ error: 'Stan techniczny przy odbiorze musi być "good" lub "damaged".' });
    }

    const targetLoc = device.transferTo;
    const sourceLoc = device.transferFrom;
    const initiator = device.transferInitiatedBy;
    const receiver = req.user.name;
    const confirmedAt = getFormattedDateTime();

    let newStatus = condition === 'good' ? 'available' : 'maintenance';
    let conditionText = condition === 'good' ? 'SPRAWNY' : 'USZKODZONY';
    let notesText = notes && notes.trim() !== '' ? `Uwagi odbiorcy: ${notes}` : 'Brak uwag';

    let updatedNotes = device.notes || '';
    const newLogNote = `[Odbiór ${confirmedAt}] Przesunięto z ${sourceLoc} do ${targetLoc} (Stan: ${conditionText}). ${notesText}.`;
    updatedNotes = updatedNotes ? `${newLogNote}\n${updatedNotes}` : newLogNote;

    await db.devices.findByIdAndUpdate(deviceId, {
      location: targetLoc,
      status: newStatus,
      notes: updatedNotes,
      transferPending: false,
      transferFrom: null,
      transferTo: null,
      transferInitiatedBy: null,
      transferInitiatedAt: null
    });

    await db.activities.create({
      type: 'transfer',
      title: `Potwierdzono odbiór: ${device.brand} ${device.model} (${device.assetTag}) w oddziale ${targetLoc}`,
      user: receiver,
      admin: receiver,
      date: confirmedAt,
      details: `Wysłane przez: ${initiator || 'brak'}, Odebrane przez: ${receiver}, Stan: ${conditionText}, ${notesText}`
    });

    res.json({ message: `Potwierdzono odbiór urządzenia w oddziale ${targetLoc}. Status sprzętu to: ${condition === 'good' ? 'Dostępny' : 'W serwisie'}.` });
  } catch (err) {
    res.status(500).json({ error: 'Błąd potwierdzania odbioru: ' + err.message });
  }
});

// 5.5 DELETE Device (REQUIRES ADMIN)
app.delete('/api/devices/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deviceId = req.params.id;
    
    const device = await db.devices.findById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Urządzenie nie istnieje w bazie.' });
    }

    if (device.status === 'loaned') {
      return res.status(400).json({ error: 'Nie można usunąć komputera, który jest obecnie wypożyczony pracownikowi. Dokonaj najpierw zwrotu.' });
    }

    await db.devices.findByIdAndDelete(deviceId);

    await db.activities.create({
      type: 'maintenance',
      title: `Usunięto urządzenie z bazy: ${device.brand} ${device.model} (${device.assetTag})`,
      user: req.user.name,
      date: getFormattedDateTime()
    });

    res.json({ message: 'Urządzenie zostało usunięte z bazy danych.' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd usuwania urządzenia: ' + err.message });
  }
});

// 6. POST Issue Loan (REQUIRES ADMIN or IT)
app.post('/api/devices/:id/loan', authenticateToken, requireAdminOrIT, async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { employeeName, employeeEmail, employeeDept, loanDate, expectedReturnDate } = req.body;

    if (!employeeName || !employeeEmail || !employeeDept || !loanDate || !expectedReturnDate) {
      return res.status(400).json({ error: 'Wszystkie dane pracownika oraz daty są wymagane.' });
    }

    if (employeeName.trim().length < 3) {
      return res.status(400).json({ error: 'Imię i nazwisko pracownika musi mieć co najmniej 3 znaki.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employeeEmail)) {
      return res.status(400).json({ error: 'Wprowadzony e-mail pracownika ma nieprawidłowy format.' });
    }

    if (new Date(expectedReturnDate) < new Date(loanDate)) {
      return res.status(400).json({ error: 'Planowana data zwrotu nie może być wcześniejsza niż data wydania.' });
    }

    const device = await db.devices.findById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Urządzenie nie istnieje.' });
    }

    if (device.status !== 'available') {
      return res.status(400).json({ error: 'Urządzenie nie jest dostępne w magazynie.' });
    }

    const newLoan = await db.loans.create({
      device: device._id || device.id,
      deviceId: device.id || device._id,
      employeeName: employeeName.trim(),
      employeeEmail: employeeEmail.toLowerCase().trim(),
      employeeDept: employeeDept.trim(),
      loanDate,
      expectedReturnDate,
      status: 'active'
    });

    await db.devices.findByIdAndUpdate(deviceId, { status: 'loaned' });

    await db.activities.create({
      type: 'loan',
      title: `Wypożyczono ${device.brand} ${device.model} (${device.assetTag})`,
      user: employeeName.trim(),
      date: getFormattedDateTime()
    });

    res.status(201).json(newLoan);
  } catch (err) {
    res.status(500).json({ error: 'Błąd tworzenia wypożyczenia: ' + err.message });
  }
});

// 7. POST Return Loan (REQUIRES ADMIN or IT)
app.post('/api/devices/:id/return', authenticateToken, requireAdminOrIT, async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { actualReturnDate, condition, notes } = req.body;

    if (!actualReturnDate || !condition) {
      return res.status(400).json({ error: 'Data zwrotu oraz stan sprzętu są wymagane.' });
    }

    if (!['good', 'damaged'].includes(condition)) {
      return res.status(400).json({ error: 'Stan sprzętu musi być "good" (sprawny) lub "damaged" (uszkodzony).' });
    }

    const device = await db.devices.findById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Urządzenie nie istnieje.' });
    }

    if (device.status !== 'loaned') {
      return res.status(400).json({ error: 'To urządzenie nie jest obecnie wypożyczone.' });
    }

    const loans = await db.loans.find({ status: 'active' });
    const activeLoan = loans.find(l => {
      const lDevId = l.device?._id?.toString() || l.device?.id?.toString() || l.deviceId?.toString();
      const dId = device._id?.toString() || device.id?.toString();
      return lDevId === dId;
    });

    if (!activeLoan) {
      return res.status(400).json({ error: 'Brak zarejestrowanego aktywnego wypożyczenia dla tego urządzenia.' });
    }

    if (new Date(actualReturnDate) < new Date(activeLoan.loanDate)) {
      return res.status(400).json({ error: `Faktyczna data zwrotu nie może być wcześniejsza niż data wypożyczenia (${activeLoan.loanDate}).` });
    }

    const loanMongoId = activeLoan._id || activeLoan.id;
    await db.loans.findByIdAndUpdate(loanMongoId, {
      actualReturnDate,
      status: 'returned'
    });

    let newStatus = 'available';
    let activityType = 'return';
    let activityTitle = `Zwrócono sprawny sprzęt: ${device.brand} ${device.model} (${device.assetTag})`;

    if (condition === 'damaged') {
      newStatus = 'maintenance';
      activityType = 'maintenance';
      activityTitle = `Zwrócono w stanie USZKODZONYM: ${device.brand} ${device.model} (${device.assetTag})`;
    }

    let updatedNotes = device.notes || '';
    if (notes && notes.trim() !== '') {
      updatedNotes = `${actualReturnDate}: Zwrot (${condition === 'damaged' ? 'USZKODZONY' : 'SPRAWNY'}). ${notes}. ${updatedNotes}`;
    } else {
      updatedNotes = `${actualReturnDate}: Zwrot (${condition === 'damaged' ? 'USZKODZONY' : 'SPRAWNY'}). ${updatedNotes}`;
    }

    await db.devices.findByIdAndUpdate(deviceId, {
      status: newStatus,
      notes: updatedNotes
    });

    await db.activities.create({
      type: activityType,
      title: activityTitle,
      user: activeLoan.employeeName,
      date: getFormattedDateTime()
    });

    res.json({ message: 'Zwrot został pomyślnie zarejestrowany.' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd zwrotu urządzenia: ' + err.message });
  }
});

// 8. GET Loan History for a single Device
app.get('/api/devices/:id/history', authenticateToken, async (req, res) => {
  try {
    const deviceId = req.params.id;
    const loans = await db.loans.find();
    
    const deviceLoans = loans.filter(l => {
      const lDevId = l.device?._id?.toString() || l.device?.id?.toString() || l.deviceId?.toString();
      return lDevId === deviceId;
    });

    deviceLoans.sort((a,b) => new Date(b.loanDate) - new Date(a.loanDate));
    res.json(deviceLoans);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania historii urządzenia: ' + err.message });
  }
});

// 9. GET Active Loans
app.get('/api/loans/active', authenticateToken, async (req, res) => {
  try {
    const loans = await db.loans.find({ status: 'active' });
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania wypożyczeń: ' + err.message });
  }
});

// 10. GET Full Loan Log History
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const loans = await db.loans.find();
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania rejestru: ' + err.message });
  }
});

// 10.2 DELETE Single History record (REQUIRES ADMIN)
app.delete('/api/history/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const loan = await db.loans.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ error: 'Wpis historyczny nie istnieje.' });
    }

    if (loan.status === 'active') {
      return res.status(400).json({ error: 'Nie można usunąć aktywnego wpisu wypożyczenia. Dokonaj najpierw zwrotu komputera.' });
    }

    const loanMongoId = loan._id || loan.id;
    await db.loans.findByIdAndDelete(loanMongoId);
    res.json({ message: 'Wpis historyczny został usunięty.' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd usuwania wpisu historii: ' + err.message });
  }
});

// 10.5 DELETE Completed (Returned) History entries (REQUIRES ADMIN)
app.delete('/api/history/completed', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.loans.deleteMany({ status: 'returned' });
    res.json({ message: `Usunięto wszystkie ukończone wpisy historii (${result.deletedCount || 0}).` });
  } catch (err) {
    res.status(500).json({ error: 'Błąd czyszczenia historii: ' + err.message });
  }
});

// 11. GET Recent Activities (with filtering)
app.get('/api/activities', authenticateToken, async (req, res) => {
  try {
    const { admin, type, search, limit } = req.query;
    
    // We get all activities and filter them in memory to ensure consistent behavior 
    // across MongoDB and JSON DB fallback.
    let activities = await db.activities.find({});
    
    if (admin && admin !== 'all') {
      const adminLower = admin.toLowerCase().trim();
      activities = activities.filter(a => 
        (a.admin && a.admin.toLowerCase().includes(adminLower)) || 
        (a.user && a.user.toLowerCase().includes(adminLower))
      );
    }
    
    if (type && type !== 'all') {
      activities = activities.filter(a => a.type === type);
    }
    
    if (search && search.trim() !== '') {
      const keyword = search.toLowerCase().trim();
      activities = activities.filter(a => 
        (a.title && a.title.toLowerCase().includes(keyword)) ||
        (a.details && a.details.toLowerCase().includes(keyword)) ||
        (a.user && a.user.toLowerCase().includes(keyword))
      );
    }
    
    // Sort in memory just in case (already sorted by unshift in JSON DB and sort in Mongoose, but good to be sure)
    activities.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    
    if (limit) {
      activities = activities.slice(0, parseInt(limit));
    }
    
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania logu aktywności: ' + err.message });
  }
});

// 11.5 DELETE All Activities logs (REQUIRES ADMIN)
app.delete('/api/activities', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.activities.deleteMany({});
    // Create one system init action so log is not completely blank
    await db.activities.create({
      type: 'system',
      title: 'Wyczyszczono rejestr aktywności systemowych',
      user: req.user.name,
      date: getFormattedDateTime()
    });
    res.json({ message: 'Logi aktywności zostały pomyślnie wyczyszczone.' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd czyszczenia rejestru aktywności: ' + err.message });
  }
});

// Helper to get local network IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Start Web Server
app.listen(PORT, '0.0.0.0', async () => {
  await db.connectDb();
  await ensureDefaultsExist();
  console.log(`\nIT Lease Hub is running!`);
  console.log(`  Local access:   http://localhost:${PORT}`);
  
  const localIps = getLocalIpAddresses();
  if (localIps.length > 0) {
    console.log('  Network access (Wi-Fi/LAN):');
    localIps.forEach(ip => {
      console.log(`    http://${ip}:${PORT}`);
    });
  }
  console.log('\nReady for connections.\n');
});
