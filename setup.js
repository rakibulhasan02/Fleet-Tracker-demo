const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3307,            // XAMPP MySQL port
    user: 'root',
    password: '',          // XAMPP default is empty
    multipleStatements: true
  });
  await conn.query(fs.readFileSync('sql/schema.sql', 'utf8'));
  console.log('Database fleet_tracker created ✔');
  process.exit();
})().catch(e => {
  console.log('Failed:', e.code, e.message);
  process.exit(1);
});