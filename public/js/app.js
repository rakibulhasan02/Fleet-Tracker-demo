/* =====================================================
   FleetTracker front-end. One file, three parts:
   1) helpers  2) startup (login check + menu)  3) one function per page
   ===================================================== */

/* ---------- 1) helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '৳' + Number(n || 0).toFixed(2);
const formData = form => Object.fromEntries(new FormData(form));
const badge = (text, color) => `<span class="badge text-bg-${color}">${esc(text)}</span>`;

// talk to the Node API; throws an Error with the server's message if something fails
async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function showMsg(text, type = 'info') {
  $('#msg').innerHTML = `<div class="alert alert-${type} mb-0">${esc(text)}</div>`;
  window.scrollTo(0, 0);
}
// show a message on the NEXT page (used before redirecting)
const flashNext = text => sessionStorage.setItem('flash', text);

async function logout() { await api('/api/logout', 'POST'); location.href = 'index.html'; }

function renderNav() {
  const links = [];
  if (me) {
    links.push(['dashboard.html', 'Dashboard']);
    if (me.role === 'owner') links.push(['vehicles.html', 'Vehicles'], ['reports.html', 'Reports']);
    if (['owner', 'driver'].includes(me.role)) links.push(['fuel.html', 'Fuel Log']);
    if (me.role !== 'admin') links.push(['service.html', 'Service']);
  }
  const left = links.map(([href, label]) => `<li class="nav-item"><a class="nav-link" href="${href}">${label}</a></li>`).join('');
  const right = me
    ? `<li class="nav-item"><span class="navbar-text me-3">${esc(me.name)} (${me.role})</span></li>
       <li class="nav-item"><a class="nav-link" href="#" onclick="logout(); return false;">Logout</a></li>`
    : `<li class="nav-item"><a class="nav-link" href="login.html">Login</a></li>
       <li class="nav-item"><a class="nav-link" href="register.html">Register</a></li>`;
  $('#nav').innerHTML = `
    <nav class="navbar navbar-expand-md navbar-dark bg-dark"><div class="container">
      <a class="navbar-brand" href="index.html">🚛 FleetTracker</a>
      <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#menu"><span class="navbar-toggler-icon"></span></button>
      <div class="collapse navbar-collapse" id="menu">
        <ul class="navbar-nav me-auto">${left}</ul><ul class="navbar-nav">${right}</ul>
      </div>
    </div></nav>`;
}

/* ---------- 2) startup ---------- */
let me = null;   // the logged-in user, or null

async function init() {
  const page = document.body.dataset.page;
  me = (await api('/api/me')).user;
  if (!me && !['index', 'login', 'register'].includes(page)) return (location.href = 'login.html');
  renderNav();
  const flash = sessionStorage.getItem('flash');
  if (flash) { showMsg(flash, 'success'); sessionStorage.removeItem('flash'); }
  try { await pages[page](); } catch (e) { showMsg(e.message, 'danger'); }
}

/* ---------- 3) page logic ---------- */
const pages = {};

pages.index = async () => {};

pages.login = async () => {
  if (me) return (location.href = 'dashboard.html');
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    try { await api('/api/login', 'POST', formData(e.target)); location.href = 'dashboard.html'; }
    catch (err) { showMsg(err.message, 'danger'); }
  });
};

pages.register = async () => {
  $('#registerForm').addEventListener('submit', async e => {
    e.preventDefault();
    try { await api('/api/register', 'POST', formData(e.target)); flashNext('Registered! Please log in.'); location.href = 'login.html'; }
    catch (err) { showMsg(err.message, 'danger'); }
  });
};

/* --- dashboard: different content per role --- */
const statCard = (label, value) =>
  `<div class="col-md-4"><div class="card card-body"><small class="text-muted">${label}</small><h3>${esc(value)}</h3></div></div>`;

pages.dashboard = async () => {
  $('#welcome').textContent = 'Welcome, ' + me.name;
  const d = await api('/api/dashboard');
  let html = '';
  if (me.role === 'owner') {
    html = `<div class="row g-3 mb-3">${statCard('Vehicles', d.vehicles)}${statCard('Total fuel cost', money(d.fuel))}${statCard('Total service cost', money(d.service))}</div>`;
    html += d.due.length
      ? `<div class="alert alert-warning"><b>⚠ Service due:</b> ${d.due.map(v => badge(`${v.reg_no} (${v.since} km since service)`, 'warning')).join(' ')}</div>`
      : `<div class="alert alert-success">All vehicles are up to date on service.</div>`;
  } else if (me.role === 'driver') {
    html = d.vehicle
      ? `<div class="card card-body"><h5>${esc(d.vehicle.reg_no)} — ${esc(d.vehicle.model)}</h5>
         <p>Current mileage: <b>${d.vehicle.mileage} km</b></p>
         <div><a href="fuel.html" class="btn btn-primary btn-sm me-2">Log fuel</a><a href="service.html" class="btn btn-outline-dark btn-sm">Report a problem</a></div></div>`
      : `<div class="alert alert-secondary">No vehicle assigned yet. Ask your owner to assign you one.</div>`;
  } else if (me.role === 'mechanic') {
    html = `<div class="card card-body"><small class="text-muted">Open jobs</small><h3>${d.open}</h3><a href="service.html">View job board →</a></div>`;
  } else {
    html = `<div class="table-responsive table-wrap"><table class="table table-striped align-middle">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead><tbody>
      ${d.users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${badge(u.role, 'secondary')}</td>
        <td>${u.id !== me.id ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id})">Delete</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>`;
  }
  $('#content').innerHTML = html;
};

async function deleteUser(id) {
  if (!confirm('Delete this user?')) return;
  try { await api('/api/users/' + id, 'DELETE'); flashNext('User deleted'); location.reload(); }
  catch (e) { showMsg(e.message, 'danger'); }
}

/* --- vehicles list (search + filter) --- */
pages.vehicles = async () => {
  $('#filterForm').addEventListener('submit', e => { e.preventDefault(); loadVehicles().catch(err => showMsg(err.message, 'danger')); });
  await loadVehicles();
};

async function loadVehicles() {
  const vehicles = await api('/api/vehicles?' + new URLSearchParams(formData($('#filterForm'))));
  $('#rows').innerHTML = vehicles.length ? vehicles.map(v => `
    <tr>
      <td>${esc(v.reg_no)} ${v.mileage - v.last_service_km >= v.service_interval_km ? badge('Service due', 'warning') : ''}</td>
      <td>${esc(v.type)}</td><td>${esc(v.model)}</td><td>${v.mileage} km</td>
      <td>${esc(v.driver || '—')}</td><td>${esc(v.status)}</td>
      <td class="text-nowrap">
        <a href="vehicle-form.html?id=${v.id}" class="btn btn-sm btn-outline-primary">Edit</a>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteVehicle(${v.id})">Delete</button>
      </td>
    </tr>`).join('')
    : `<tr><td colspan="7" class="text-center text-muted">No vehicles found</td></tr>`;
}

async function deleteVehicle(id) {
  if (!confirm('Delete this vehicle?')) return;
  try { await api('/api/vehicles/' + id, 'DELETE'); await loadVehicles(); showMsg('Vehicle deleted', 'success'); }
  catch (e) { showMsg(e.message, 'danger'); }
}

/* --- add / edit vehicle (same page; ?id=3 means edit) --- */
pages['vehicle-form'] = async () => {
  const id = new URLSearchParams(location.search).get('id');
  const form = $('#vehicleForm');
  const drivers = await api('/api/drivers');
  $('#driverList').innerHTML = drivers.map(d => `<option value="${esc(d.email)}">${esc(d.name)}</option>`).join('');
  if (id) {
    $('#title').textContent = 'Edit vehicle';
    $('#mileageGroup').classList.add('d-none');
    const v = await api('/api/vehicles/' + id);
    for (const k of ['reg_no', 'type', 'model', 'service_interval_km', 'driver_email', 'status']) form.elements[k].value = v[k] ?? '';
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api(id ? '/api/vehicles/' + id : '/api/vehicles', id ? 'PUT' : 'POST', formData(form));
      flashNext(id ? 'Vehicle updated' : 'Vehicle added');
      location.href = 'vehicles.html';
    } catch (err) { showMsg(err.message, 'danger'); }
  });
};
/* --- fuel log --- */
/* --- fuel log: live calculator, summary, charts, filters --- */
let fuelLogs = [], monthChart, effChart;
const sum = (arr, f) => arr.reduce((t, x) => t + Number(f(x)), 0);

pages.fuel = async () => {
  if (me.role === 'driver') {
    await setupFuelForm();
  } else {
    const vs = await api('/api/my-vehicles');
    $('#f_vehicle').innerHTML = '<option value="">All vehicles</option>' + vs.map(v => `<option value="${v.id}">${esc(v.reg_no)}</option>`).join('');
    $('#vehicleFilterBox').classList.remove('d-none');
  }
  const reload = () => loadFuel().catch(err => showMsg(err.message, 'danger'));
  $('#fuelFilter').addEventListener('submit', e => { e.preventDefault(); reload(); });
  $('#clearFilter').addEventListener('click', () => { $('#fuelFilter').reset(); reload(); });
  $('#csvBtn').addEventListener('click', downloadCsv);
  await loadFuel();
};

async function setupFuelForm() {
  const form = $('#fuelForm');
  form.classList.remove('d-none');
  let last = await api('/api/fuel/last');
  if (!last.vehicle) { form.innerHTML = '<div class="text-muted">No vehicle assigned to you yet.</div>'; return; }

  const showLast = () => { $('#lastInfo').textContent = `${last.vehicle} — last odometer reading: ${last.odometer} km`; };
  const update = () => {
    const liters = +form.elements.liters.value, price = +form.elements.price.value, odo = +form.elements.odometer.value;
    const t = [];
    if (liters > 0 && price > 0) t.push(`Total cost: <b>${money(liters * price)}</b>`);
    if (odo) {
      if (odo <= last.odometer) t.push(`<span class="text-danger">Odometer must be above ${last.odometer} km</span>`);
      else {
        const dist = odo - last.odometer;
        t.push(`Distance: <b>${dist} km</b>`);
        if (last.hasLog && liters > 0) {
          t.push(`Efficiency: <b>${(dist / liters).toFixed(2)} km/l</b>`);
          if (price > 0) t.push(`Cost per km: <b>${money((liters * price) / dist)}</b>`);
        }
      }
    }
    $('#preview').innerHTML = t.length ? t.join(' &nbsp;•&nbsp; ') : 'Fill in the numbers to see the calculation…';
  };

  showLast();
  if (last.price) form.elements.price.value = last.price;
  ['liters', 'price', 'odometer'].forEach(n => form.elements[n].addEventListener('input', update));
  update();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/fuel', 'POST', formData(form));
      form.reset(); last = await api('/api/fuel/last'); form.elements.price.value = last.price || '';
      showLast(); update(); await loadFuel(); showMsg('Fuel log saved', 'success');
    } catch (err) { showMsg(err.message, 'danger'); }
  });
}

async function loadFuel() {
  fuelLogs = await api('/api/fuel?' + new URLSearchParams(formData($('#fuelFilter'))));
  renderSummary(fuelLogs);
  renderFuelCharts(fuelLogs);
  renderFuelTable(fuelLogs);
}

function renderSummary(logs) {
  const liters = sum(logs, l => l.liters), cost = sum(logs, l => l.total_cost);
  const eff = logs.filter(l => l.efficiency != null);
  const distance = sum(eff, l => l.efficiency * l.liters);
  const effLiters = sum(eff, l => l.liters), effCost = sum(eff, l => l.total_cost);
  const rates = eff.map(l => Number(l.efficiency));
  const cards = [
    ['Fill-ups', logs.length],
    ['Total liters', liters.toFixed(1) + ' L'],
    ['Total fuel cost', money(cost)],
    ['Average price / liter', liters ? money(cost / liters) : '—'],
    ['Distance covered', distance ? Math.round(distance) + ' km' : '—'],
    ['Average km/l', effLiters ? (distance / effLiters).toFixed(2) : '—'],
    ['Best / worst km/l', rates.length ? Math.max(...rates).toFixed(2) + ' / ' + Math.min(...rates).toFixed(2) : '—'],
    ['Cost per km', distance ? money(effCost / distance) : '—']
  ];
  $('#summary').innerHTML = cards.map(([label, value]) =>
    `<div class="col-6 col-md-3"><div class="card card-body"><small class="text-muted">${label}</small><h5 class="mb-0">${esc(value)}</h5></div></div>`).join('');
}

function renderFuelCharts(logs) {
  const byMonth = {};
  logs.forEach(l => { const m = l.log_date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + Number(l.total_cost); });
  const months = Object.keys(byMonth).sort();
  monthChart?.destroy();
  monthChart = new Chart($('#monthChart'), {
    type: 'bar',
    data: { labels: months, datasets: [{ label: 'Fuel cost (৳)', data: months.map(m => byMonth[m]) }] }
  });

  const trend = logs.filter(l => l.efficiency != null);
  const dates = [...new Set(trend.map(l => l.log_date))].sort();
  const regs = [...new Set(trend.map(l => l.reg_no))];
  effChart?.destroy();
  effChart = new Chart($('#effChart'), {
    type: 'line',
    data: { labels: dates, datasets: regs.map(r => ({
      label: r, tension: 0.3, spanGaps: true,
      data: dates.map(d => { const x = trend.find(l => l.reg_no === r && l.log_date === d); return x ? Number(x.efficiency) : null; })
    })) }
  });
}

function renderFuelTable(logs) {
  const avg = {};
  logs.filter(l => l.efficiency != null).forEach(l => { (avg[l.reg_no] ||= []).push(Number(l.efficiency)); });
  for (const k in avg) avg[k] = avg[k].reduce((a, b) => a + b, 0) / avg[k].length;

  let lowCount = 0;
  $('#rows').innerHTML = logs.length ? logs.map(l => {
    const e = l.efficiency == null ? null : Number(l.efficiency);
    let status = '—';
    if (e != null) {
      const low = e < avg[l.reg_no] * 0.8;
      if (low) lowCount++;
      status = low ? badge('Low ⚠', 'danger') : badge('Good', 'success');
    }
    return `<tr><td>${esc(l.log_date)}</td><td>${esc(l.reg_no)}</td><td>${l.liters}</td><td>${money(l.price_per_liter)}</td>
      <td>${money(l.total_cost)}</td><td>${l.odometer}</td><td>${e == null ? '—' : e.toFixed(2)}</td>
      <td>${e ? money(l.price_per_liter / e) : '—'}</td><td>${status}</td></tr>`;
  }).join('') : `<tr><td colspan="9" class="text-center text-muted">No fuel logs found</td></tr>`;

  $('#alertBox').innerHTML = lowCount
    ? `<div class="alert alert-warning"><b>⚠ ${lowCount} fill-up(s)</b> had efficiency more than 20% below the vehicle's average.
       Check for a fuel leak, engine problem, or fuel theft.</div>` : '';
}

function downloadCsv() {
  if (!fuelLogs.length) return showMsg('Nothing to download', 'warning');
  const head = ['Date', 'Vehicle', 'Liters', 'Price/L', 'Total', 'Odometer', 'km/l'];
  const rows = fuelLogs.map(l => [l.log_date, l.reg_no, l.liters, l.price_per_liter, l.total_cost, l.odometer, l.efficiency ?? '']);
  const csv = [head, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'fuel-log.csv';
  a.click();
}

/* --- service jobs --- */
pages.service = async () => {
  if (me.role === 'mechanic') {
    $('#title').textContent = 'Job board';
  } else {
    const vs = await api('/api/my-vehicles');
    $('#vehicle_id').innerHTML = '<option value="">Select vehicle</option>' + vs.map(v => `<option value="${v.id}">${esc(v.reg_no)}</option>`).join('');
    $('#serviceForm').classList.remove('d-none');
    $('#serviceForm').addEventListener('submit', async e => {
      e.preventDefault();
      try { await api('/api/service', 'POST', formData(e.target)); e.target.reset(); await loadJobs(); showMsg('Service request sent', 'success'); }
      catch (err) { showMsg(err.message, 'danger'); }
    });
  }
  await loadJobs();
};

async function loadJobs() {
  const jobs = await api('/api/service');
  const mech = me.role === 'mechanic';
  const color = { Done: 'success', Pending: 'secondary', 'In Progress': 'primary' };
  const rows = jobs.map(j => mech ? `
    <tr><td>${esc(j.reg_no)}</td><td>${esc(j.description)}</td>
    <td><select id="status-${j.id}" class="form-select form-select-sm">
      ${['Pending', 'In Progress', 'Done'].map(s => `<option ${j.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    <td><input id="parts-${j.id}" type="number" step="0.01" min="0" value="${j.parts_cost}" class="form-control form-control-sm" style="width:100px"></td>
    <td><input id="labor-${j.id}" type="number" step="0.01" min="0" value="${j.labor_cost}" class="form-control form-control-sm" style="width:100px"></td>
    <td><button class="btn btn-sm btn-success" onclick="updateJob(${j.id})">Save</button></td></tr>`
    : `<tr><td>${esc(j.reg_no)}</td><td>${esc(j.description)}</td><td>${badge(j.status, color[j.status])}</td>
       <td>${money(j.parts_cost)}</td><td>${money(j.labor_cost)}</td></tr>`).join('');
  $('#jobs').innerHTML = `<div class="table-responsive table-wrap"><table class="table table-striped align-middle">
    <thead><tr><th>Vehicle</th><th>Description</th><th>Status</th><th>Parts</th><th>Labor</th>${mech ? '<th></th>' : ''}</tr></thead>
    <tbody>${rows || '<tr><td colspan="6" class="text-center text-muted">No service jobs yet</td></tr>'}</tbody></table></div>`;
}

async function updateJob(id) {
  try {
    await api('/api/service/' + id, 'PUT', {
      status: $('#status-' + id).value, parts_cost: $('#parts-' + id).value, labor_cost: $('#labor-' + id).value });
    showMsg('Job updated', 'success');
  } catch (e) { showMsg(e.message, 'danger'); }
}

/* --- reports + chart --- */
pages.reports = async () => {
  const rows = await api('/api/reports');
  $('#rows').innerHTML = rows.map(r => `
    <tr><td>${esc(r.reg_no)} <small class="text-muted">${esc(r.model)}</small></td><td>${money(r.fuel_cost)}</td><td>${money(r.service_cost)}</td>
    <td>${r.distance}</td><td>${r.avg_eff == null ? '—' : r.avg_eff.toFixed(2)}</td>
    <td><b>${r.cost_per_km == null ? '—' : money(r.cost_per_km)}</b></td></tr>`).join('');
  new Chart($('#chart'), {
    type: 'bar',
    data: { labels: rows.map(r => r.reg_no), datasets: [
      { label: 'Fuel', data: rows.map(r => r.fuel_cost) },
      { label: 'Service', data: rows.map(r => r.service_cost) }] },
    options: { scales: { x: { stacked: true }, y: { stacked: true } } }
  });
};

init();
