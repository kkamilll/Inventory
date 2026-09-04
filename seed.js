require('dotenv').config();
const db = require('./db');

const defaultUsers = [
  {
    name: 'Andrzej IT Admin',
    email: 'admin@firma.pl',
    password: 'admin123',
    role: 'admin',
    securityQuestion: 'Twoje pierwsze auto',
    securityAnswer: 'maluch'
  },
  {
    name: 'Piotr Nowak (IT)',
    email: 'it@firma.pl',
    password: 'it123456',
    role: 'it',
    securityQuestion: 'Imię pierwszego zwierzaka',
    securityAnswer: 'burek'
  },
  {
    name: 'Monika Lis (Księgowość)',
    email: 'ksiegowosc@firma.pl',
    password: 'ksieg123',
    role: 'accountant',
    securityQuestion: 'Miasto w którym się urodziłeś',
    securityAnswer: 'wroclaw'
  }
];

const defaultDevices = [
  {
    assetTag: 'LPT-001',
    type: 'laptop',
    brand: 'Lenovo',
    model: 'ThinkPad T14 Gen 4',
    serialNumber: 'L3N987654321',
    location: 'Warszawa',
    status: 'available',
    specs: { cpu: 'Intel Core i7-1360P', ram: '32 GB', ssd: '1 TB SSD' },
    notes: 'Stan idealny.',
    leaseProvider: 'mLeasing',
    expectedLeaseCost: 150,
    actualLeaseCost: 150,
    deviceValue: 4500,
    leaseStartDate: '2024-12-01',
    leaseEndDate: '2027-12-01'
  },
  {
    assetTag: 'LPT-002',
    type: 'laptop',
    brand: 'Apple',
    model: 'MacBook Pro 14" M3',
    serialNumber: 'C02F87654321',
    location: 'Kraków',
    status: 'loaned',
    specs: { cpu: 'Apple M3 Pro (12-core)', ram: '18 GB', ssd: '512 GB SSD' },
    notes: 'Wydany z ładowarką i etui.',
    leaseProvider: 'Grenke',
    expectedLeaseCost: 200,
    actualLeaseCost: 250, // Cost discrepancy!
    deviceValue: 6000,
    leaseStartDate: '2024-05-01',
    leaseEndDate: '2027-05-01'
  },
  {
    assetTag: 'LPT-003',
    type: 'laptop',
    brand: 'Dell',
    model: 'Latitude 5440',
    serialNumber: 'DELL9876543',
    location: 'Warszawa',
    status: 'maintenance',
    specs: { cpu: 'Intel Core i5-1345U', ram: '16 GB', ssd: '512 GB SSD' },
    notes: 'Zgłoszone zalanie klawiatury. Oczekuje na serwis autoryzowany.',
    leaseProvider: 'Grenke',
    expectedLeaseCost: 130,
    actualLeaseCost: 130,
    deviceValue: 3800,
    leaseStartDate: '2024-06-01',
    leaseEndDate: '2027-06-01'
  },
  {
    assetTag: 'LPT-004',
    type: 'laptop',
    brand: 'HP',
    model: 'EliteBook 840 G10',
    serialNumber: 'HP5544332211',
    location: 'Kraków',
    status: 'available',
    specs: { cpu: 'Intel Core i7-1355U', ram: '16 GB', ssd: '512 GB SSD' },
    notes: 'Nowa bateria wymieniona w czerwcu.',
    leaseProvider: 'EFL',
    expectedLeaseCost: 140,
    actualLeaseCost: 145, // Cost discrepancy!
    deviceValue: 4000,
    leaseStartDate: '2024-07-01',
    leaseEndDate: '2028-07-01'
  },
  {
    assetTag: 'LPT-005',
    type: 'laptop',
    brand: 'Lenovo',
    model: 'Legion 5 Pro',
    serialNumber: 'L3N11223344',
    location: 'Warszawa',
    status: 'loaned',
    specs: { cpu: 'AMD Ryzen 7 7840HS', ram: '32 GB', ssd: '1 TB SSD' },
    notes: 'Przeznaczony dla działu R&D (projektowanie CAD/3D).',
    leaseProvider: 'mLeasing',
    expectedLeaseCost: 180,
    actualLeaseCost: 180,
    deviceValue: 5000,
    leaseStartDate: '2024-08-01',
    leaseEndDate: '2027-08-01'
  },
  {
    assetTag: 'PC-001',
    type: 'desktop',
    brand: 'Apple',
    model: 'Mac Studio M2 Max',
    serialNumber: 'C02M99887766',
    location: 'Warszawa',
    status: 'available',
    specs: { cpu: 'Apple M2 Max', ram: '32 GB', ssd: '1 TB SSD' },
    notes: 'Używany przez wideo edytora.',
    leaseProvider: 'Apple Financial',
    expectedLeaseCost: 300,
    actualLeaseCost: 300,
    deviceValue: 9000,
    leaseStartDate: '2024-01-01',
    leaseEndDate: '2027-01-01'
  },
  {
    assetTag: 'PC-002',
    type: 'desktop',
    brand: 'Dell',
    model: 'OptiPlex 7010 SFF',
    serialNumber: 'DELL1122334',
    location: 'Kraków',
    status: 'loaned',
    specs: { cpu: 'Intel Core i7-13700', ram: '32 GB', ssd: '512 GB SSD' },
    notes: 'Stanowisko stacjonarne na recepcji Kraków.',
    leaseProvider: 'EFL',
    expectedLeaseCost: 100,
    actualLeaseCost: 100,
    deviceValue: 3000,
    leaseStartDate: '2023-03-15',
    leaseEndDate: '2026-03-15'
  }
];

async function seed() {
  const isCleanOnly = process.argv.includes('--clean') || process.argv.includes('-c');

  try {
    await db.connectDb();

    console.log('[Seed] Clearing existing collections...');
    await db.devices.deleteMany({});
    await db.loans.deleteMany({});
    await db.activities.deleteMany({});
    await db.users.deleteMany({});

    if (isCleanOnly) {
      // Create only the default administrator account
      await db.users.create(defaultUsers[0]);
      console.log('\n=============================================');
      console.log('  DATABASE CLEANED (EMPTY STATE)');
      console.log('=============================================');
      console.log('All devices, loans, and activities removed.');
      console.log('Default administrator account ready:');
      console.log(`  Login:    ${defaultUsers[0].email}`);
      console.log(`  Password: ${defaultUsers[0].password}`);
      console.log('=============================================\n');
      process.exit(0);
    }

    console.log('[Seed] Seeding default system users...');
    for (const u of defaultUsers) {
      await db.users.create(u);
    }

    console.log('[Seed] Seeding mockup devices...');
    const createdDevices = [];
    for (const d of defaultDevices) {
      const created = await db.devices.create(d);
      createdDevices.push(created);
    }

    const devMap = {};
    createdDevices.forEach(d => {
      const id = d._id || d.id;
      devMap[d.assetTag] = id;
    });

    console.log('[Seed] Seeding sample loans...');
    const seededLoans = [
      {
        deviceId: devMap['LPT-002'],
        device: devMap['LPT-002'],
        employeeName: 'Anna Kowalska',
        employeeEmail: 'anna.kowalska@firma.pl',
        employeeDept: 'Marketing',
        loanDate: '2026-05-10',
        expectedReturnDate: '2026-11-10',
        actualReturnDate: null,
        status: 'active'
      },
      {
        deviceId: devMap['LPT-005'],
        device: devMap['LPT-005'],
        employeeName: 'Jan Nowak',
        employeeEmail: 'jan.nowak@firma.pl',
        employeeDept: 'Badania i Rozwój (R&D)',
        loanDate: '2026-06-01',
        expectedReturnDate: '2026-09-01',
        actualReturnDate: null,
        status: 'active'
      },
      {
        deviceId: devMap['PC-002'],
        device: devMap['PC-002'],
        employeeName: 'Katarzyna Wiśniewska',
        employeeEmail: 'katarzyna.w@firma.pl',
        employeeDept: 'Administracja',
        loanDate: '2026-03-15',
        expectedReturnDate: '2027-03-15',
        actualReturnDate: null,
        status: 'active'
      },
      {
        deviceId: devMap['LPT-001'],
        device: devMap['LPT-001'],
        employeeName: 'Piotr Kowalski',
        employeeEmail: 'piotr.k@firma.pl',
        employeeDept: 'Sprzedaż',
        loanDate: '2026-01-10',
        expectedReturnDate: '2026-07-10',
        actualReturnDate: '2026-06-30',
        status: 'returned'
      }
    ];

    for (const l of seededLoans) {
      if (l.deviceId) {
        await db.loans.create(l);
      }
    }

    console.log('[Seed] Seeding audit activities...');
    const seededActivities = [
      { type: 'loan', title: 'Wypożyczono MacBook Pro 14" M3 (LPT-002)', user: 'Anna Kowalska', date: '2026-05-10 10:14' },
      { type: 'loan', title: 'Wypożyczono Lenovo Legion 5 Pro (LPT-005)', user: 'Jan Nowak', date: '2026-06-01 09:30' },
      { type: 'return', title: 'Zwrócono Lenovo ThinkPad T14 Gen 4 (LPT-001)', user: 'Piotr Kowalski', date: '2026-06-30 15:45' },
      { type: 'maintenance', title: 'Przekazano Dell Latitude 5440 (LPT-003) do serwisu', user: 'Dział IT', date: '2026-07-01 11:20' }
    ];

    for (const act of seededActivities) {
      await db.activities.create(act);
    }

    console.log('\n=============================================');
    console.log('  DATABASE SEEDING SUCCESSFUL');
    console.log('=============================================');
    console.log(`Users:      ${defaultUsers.length} accounts created`);
    console.log(`Devices:    ${defaultDevices.length} items (with full leasing & financial details)`);
    console.log(`Loans:      ${seededLoans.length} records`);
    console.log(`Activities: ${seededActivities.length} logs`);
    console.log('\nAccounts available:');
    console.log('  Admin:       admin@firma.pl / admin123');
    console.log('  IT Worker:   it@firma.pl / it123456');
    console.log('  Accountant:  ksiegowosc@firma.pl / ksieg123');
    console.log('=============================================\n');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
}

seed();
