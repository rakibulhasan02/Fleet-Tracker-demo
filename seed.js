const bcrypt = require('bcryptjs');
const db = require('./db');
(async () => {
  const hash = await bcrypt.hash('123456', 10);
  const users = [['Admin','admin@demo.com','admin'],['Rahim Owner','owner@demo.com','owner'],
                 ['Karim Driver','driver@demo.com','driver'],['Salam Mechanic','mechanic@demo.com','mechanic']];
  for (const [n, e, r] of users)
    await db.query('INSERT IGNORE INTO users(name,email,password_hash,role) VALUES(?,?,?,?)', [n, e, hash, r]);
  const [[o]] = await db.query("SELECT id FROM users WHERE email='owner@demo.com'");
  const [[d]] = await db.query("SELECT id FROM users WHERE email='driver@demo.com'");
  await db.query("INSERT IGNORE INTO vehicles(owner_id,driver_id,reg_no,type,model,mileage,last_service_km) VALUES(?,?,'DHAKA-METRO-11-2345','Truck','Tata 1613',12000,6000)", [o.id, d.id]);
  console.log('Demo data ready. Password for all demo users: 123456');
  process.exit();
})();
