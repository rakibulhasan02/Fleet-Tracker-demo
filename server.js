const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db');
const app = express();

app.use(express.json());
app.use(session({ secret: 'change-this-secret', resave: false, saveUninitialized: false }));
app.use(express.static('public'));        // serves the HTML/CSS/JS pages

// ---------- helpers ----------
const q = async (sql, params = []) => (await db.query(sql, params))[0];
const fail = (res, msg, code = 400) => res.status(code).json({ error: msg });
const needLogin = (req, res, next) => req.session.user ? next() : fail(res, 'Please log in', 401);
const needRole = (...roles) => (req, res, next) =>
  roles.includes(req.session.user.role) ? next() : fail(res, 'Access denied', 403);
const owner = [needLogin, needRole('owner')];
const dupMsg = e => e.code === 'ER_DUP_ENTRY' ? 'That registration number already exists' : null;

// ---------- auth ----------
app.post('/api/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || password.length < 6 || !['owner', 'driver', 'mechanic'].includes(role))
    return fail(res, 'Fill all fields (password needs 6+ characters)');
  if ((await q('SELECT id FROM users WHERE email=?', [email])).length) return fail(res, 'Email already registered');
  await q('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)', [name, email, await bcrypt.hash(password, 10), role]);
  res.json({ ok: true });
});
app.post('/api/login', async (req, res) => {
  const [u] = await q('SELECT * FROM users WHERE email=?', [req.body.email]);
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password_hash))) return fail(res, 'Wrong email or password', 401);
  req.session.user = { id: u.id, name: u.name, role: u.role };
  res.json({ user: req.session.user });
});
app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/me', (req, res) => res.json({ user: req.session.user || null }));

// ---------- dashboard ----------
app.get('/api/dashboard', needLogin, async (req, res) => {
  const u = req.session.user;
  if (u.role === 'owner') {
    const vehicles = await q('SELECT * FROM vehicles WHERE owner_id=?', [u.id]);
    const due = vehicles.filter(v => v.mileage - v.last_service_km >= v.service_interval_km)
                        .map(v => ({ reg_no: v.reg_no, since: v.mileage - v.last_service_km }));
    const fuel = (await q('SELECT COALESCE(SUM(f.total_cost),0) t FROM fuel_logs f JOIN vehicles v ON v.id=f.vehicle_id WHERE v.owner_id=?', [u.id]))[0].t;
    const service = (await q('SELECT COALESCE(SUM(s.parts_cost+s.labor_cost),0) t FROM service_jobs s JOIN vehicles v ON v.id=s.vehicle_id WHERE v.owner_id=?', [u.id]))[0].t;
    return res.json({ vehicles: vehicles.length, due, fuel: Number(fuel), service: Number(service) });
  }
  if (u.role === 'driver') return res.json({ vehicle: (await q('SELECT * FROM vehicles WHERE driver_id=?', [u.id]))[0] || null });
  if (u.role === 'mechanic') return res.json({ open: (await q("SELECT COUNT(*) c FROM service_jobs WHERE status<>'Done'"))[0].c });
  res.json({ users: await q('SELECT id,name,email,role FROM users ORDER BY role') });
});
app.delete('/api/users/:id', needLogin, needRole('admin'), async (req, res) => {
  if (+req.params.id === req.session.user.id) return fail(res, 'You cannot delete yourself');
  await q('DELETE FROM users WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// ---------- vehicles (owner CRUD + search/filter) ----------
const findDriver = async email => {
  if (!email) return { id: null };
  const [d] = await q("SELECT id FROM users WHERE email=? AND role='driver'", [email.trim()]);
  return d ? { id: d.id } : { error: 'No driver account found with that email. The driver must register first with the role "Driver".' };
};

app.get('/api/drivers', ...owner, async (req, res) => res.json(await q("SELECT id,name,email FROM users WHERE role='driver'")));

app.get('/api/vehicles', ...owner, async (req, res) => {
  const search = req.query.search || '', status = req.query.status || '';
  res.json(await q(
    `SELECT v.*, u.name driver FROM vehicles v LEFT JOIN users u ON u.id=v.driver_id
     WHERE v.owner_id=? AND (v.reg_no LIKE ? OR v.model LIKE ?) AND (?='' OR v.status=?)`,
    [req.session.user.id, `%${search}%`, `%${search}%`, status, status]));
});

app.get('/api/vehicles/:id', ...owner, async (req, res) => {
  const [v] = await q(
    'SELECT v.*, u.email driver_email FROM vehicles v LEFT JOIN users u ON u.id=v.driver_id WHERE v.id=? AND v.owner_id=?',
    [req.params.id, req.session.user.id]);
  v ? res.json(v) : fail(res, 'Vehicle not found', 404);
});

app.post('/api/vehicles', ...owner, async (req, res) => {
  const b = req.body;
  if (!b.reg_no) return fail(res, 'Registration number is required');
  const d = await findDriver(b.driver_email);
  if (d.error) return fail(res, d.error);
  try {
    await q(`INSERT INTO vehicles(owner_id,driver_id,reg_no,type,model,mileage,service_interval_km,last_service_km,status)
             VALUES(?,?,?,?,?,?,?,?,?)`,
      [req.session.user.id, d.id, b.reg_no, b.type, b.model, b.mileage || 0, b.service_interval_km || 5000, b.mileage || 0, b.status || 'Active']);
    res.json({ ok: true });
  } catch (e) { fail(res, dupMsg(e) || 'Could not save vehicle'); }
});

app.put('/api/vehicles/:id', ...owner, async (req, res) => {
  const b = req.body;
  const d = await findDriver(b.driver_email);
  if (d.error) return fail(res, d.error);
  try {
    await q('UPDATE vehicles SET driver_id=?,reg_no=?,type=?,model=?,service_interval_km=?,status=? WHERE id=? AND owner_id=?',
      [d.id, b.reg_no, b.type, b.model, b.service_interval_km, b.status, req.params.id, req.session.user.id]);
    res.json({ ok: true });
  } catch (e) { fail(res, dupMsg(e) || 'Could not update vehicle'); }
});

app.delete('/api/vehicles/:id', ...owner, async (req, res) => {
  await q('DELETE FROM vehicles WHERE id=? AND owner_id=?', [req.params.id, req.session.user.id]);
  res.json({ ok: true });
});
// ---------- fuel log ----------
app.get('/api/fuel', needLogin, needRole('owner', 'driver'), async (req, res) => {
  const u = req.session.user;
  const { from = '', to = '', vehicle_id = '' } = req.query;
  res.json(await q(
    `SELECT f.*, v.reg_no FROM fuel_logs f JOIN vehicles v ON v.id=f.vehicle_id
     WHERE ${u.role === 'owner' ? 'v.owner_id' : 'v.driver_id'}=?
       AND (?='' OR f.log_date>=?) AND (?='' OR f.log_date<=?) AND (?='' OR f.vehicle_id=?)
     ORDER BY f.log_date DESC, f.id DESC`,
    [u.id, from, from, to, to, vehicle_id, vehicle_id]));
});

app.get('/api/fuel/last', needLogin, needRole('driver'), async (req, res) => {
  const [v] = await q('SELECT * FROM vehicles WHERE driver_id=?', [req.session.user.id]);
  if (!v) return res.json({ vehicle: null });
  const [last] = await q('SELECT odometer, price_per_liter FROM fuel_logs WHERE vehicle_id=? ORDER BY odometer DESC LIMIT 1', [v.id]);
  res.json({ vehicle: v.reg_no, odometer: last ? last.odometer : v.mileage, hasLog: !!last, price: last ? last.price_per_liter : null });
});
app.post('/api/fuel', needLogin, needRole('driver'), async (req, res) => {
  const u = req.session.user, liters = +req.body.liters, price = +req.body.price, odometer = +req.body.odometer;
  if (!req.body.log_date || !(liters > 0) || !(price > 0) || !(odometer >= 0)) return fail(res, 'Please fill all fields with valid numbers');
  const [v] = await q('SELECT * FROM vehicles WHERE driver_id=?', [u.id]);
  if (!v) return fail(res, 'No vehicle assigned to you yet');
  const [last] = await q('SELECT odometer FROM fuel_logs WHERE vehicle_id=? ORDER BY odometer DESC LIMIT 1', [v.id]);
  const prev = last ? last.odometer : v.mileage;
  if (odometer <= prev) return fail(res, `Odometer must be greater than the last reading (${prev} km)`);
  const efficiency = last ? (odometer - prev) / liters : null;       // km per liter
  await q('INSERT INTO fuel_logs(vehicle_id,driver_id,log_date,liters,price_per_liter,total_cost,odometer,efficiency) VALUES(?,?,?,?,?,?,?,?)',
    [v.id, u.id, req.body.log_date, liters, price, liters * price, odometer, efficiency]);
  await q('UPDATE vehicles SET mileage=? WHERE id=?', [odometer, v.id]);
  res.json({ ok: true });
});

// ---------- service jobs ----------
app.get('/api/my-vehicles', needLogin, needRole('owner', 'driver'), async (req, res) => {
  const u = req.session.user;
  res.json(await q(`SELECT id,reg_no FROM vehicles WHERE ${u.role === 'owner' ? 'owner_id' : 'driver_id'}=?`, [u.id]));
});
app.get('/api/service', needLogin, needRole('owner', 'driver', 'mechanic'), async (req, res) => {
  const u = req.session.user;
  const where = { owner: 'v.owner_id=?', driver: 'v.driver_id=?', mechanic: '? IS NOT NULL' }[u.role];
  res.json(await q(`SELECT s.*, v.reg_no FROM service_jobs s JOIN vehicles v ON v.id=s.vehicle_id WHERE ${where} ORDER BY s.id DESC`, [u.id]));
});
app.post('/api/service', needLogin, needRole('owner', 'driver'), async (req, res) => {
  const u = req.session.user;
  const [v] = await q(`SELECT id FROM vehicles WHERE id=? AND ${u.role === 'owner' ? 'owner_id' : 'driver_id'}=?`, [req.body.vehicle_id, u.id]);
  if (!v || !req.body.description) return fail(res, 'Choose your vehicle and describe the problem');
  await q('INSERT INTO service_jobs(vehicle_id,description) VALUES(?,?)', [v.id, req.body.description]);
  res.json({ ok: true });
});
app.put('/api/service/:id', needLogin, needRole('mechanic'), async (req, res) => {
  const { status, parts_cost, labor_cost } = req.body;
  if (!['Pending', 'In Progress', 'Done'].includes(status)) return fail(res, 'Invalid status');
  await q('UPDATE service_jobs SET status=?, parts_cost=?, labor_cost=?, mechanic_id=? WHERE id=?',
    [status, parts_cost || 0, labor_cost || 0, req.session.user.id, req.params.id]);
  if (status === 'Done')   // service finished -> reset the "service due" counter
    await q('UPDATE vehicles v JOIN service_jobs s ON s.vehicle_id=v.id SET v.last_service_km=v.mileage WHERE s.id=?', [req.params.id]);
  res.json({ ok: true });
});

// ---------- reports ----------
app.get('/api/reports', ...owner, async (req, res) => {
  const raw = await q(
    `SELECT v.reg_no, v.model,
       COALESCE((SELECT SUM(total_cost) FROM fuel_logs WHERE vehicle_id=v.id),0) fuel_cost,
       COALESCE((SELECT SUM(parts_cost+labor_cost) FROM service_jobs WHERE vehicle_id=v.id),0) service_cost,
       COALESCE((SELECT MAX(odometer)-MIN(odometer) FROM fuel_logs WHERE vehicle_id=v.id),0) distance,
       (SELECT AVG(efficiency) FROM fuel_logs WHERE vehicle_id=v.id) avg_eff
     FROM vehicles v WHERE v.owner_id=?`, [req.session.user.id]);
  res.json(raw.map(r => {
    const fuel_cost = Number(r.fuel_cost), service_cost = Number(r.service_cost), distance = Number(r.distance);
    return { reg_no: r.reg_no, model: r.model, fuel_cost, service_cost, distance,
      avg_eff: r.avg_eff == null ? null : Number(r.avg_eff),
      cost_per_km: distance > 0 ? (fuel_cost + service_cost) / distance : null };
  }));
});

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });
app.listen(3000, () => console.log('Running at http://localhost:3000'));
