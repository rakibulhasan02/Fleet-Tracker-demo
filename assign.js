const db = require('./db');
(async () => {
  const [email, reg] = process.argv.slice(2);
  const [[d]] = await db.query("SELECT id FROM users WHERE email=? AND role='driver'", [email]);
  if (!d) { console.log('No driver with that email. Register the driver (role: Driver) or run: npm run seed'); process.exit(1); }
  const [r] = await db.query('UPDATE vehicles SET driver_id=? WHERE reg_no=?', [d.id, reg]);
  console.log(r.affectedRows ? 'Assigned ✔' : 'No vehicle with that registration number');
  process.exit();
})();