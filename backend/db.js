const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.DB_FILE || './slotswapper.db';
const db = new Database(DB_FILE);

const migrations = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');
db.exec(migrations);

try {
  const seedPath = path.join(__dirname, 'seed.sql');
  if (fs.existsSync(seedPath)) {
    const seed = fs.readFileSync(seedPath, 'utf8');
    db.exec(seed);
    console.log('Seed executed');
  }
} catch (e) {
  console.log('No seed applied', e.message);
}

console.log('DB initialized at', DB_FILE);
db.close();
