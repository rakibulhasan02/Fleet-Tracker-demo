# 🚛 Fleet Tracker

**Fleet Maintenance and Fuel Tracking System**

A full-stack web application that helps vehicle owners track fuel use, service jobs, vehicle documents, and running costs. Drivers log fuel, mechanics handle service jobs, owners see reports and alerts, and an admin manages users.

> Note: this is a fleet *management* system (fuel, maintenance, documents, costs). It does not do GPS location tracking.

---

## ✨ Features

**Authentication and roles**
- Register and login with hashed passwords (bcrypt)
- Four roles: **Owner**, **Driver**, **Mechanic**, **Admin**
- Role-based access checked on the server for every protected route

**Vehicles (Owner)**
- Add, edit, delete vehicles and assign a driver by email
- Search by registration number or model, and filter by status
- "Service due" badge based on mileage since the last service

**Fuel log (Driver and Owner)**
- Live calculator while typing: total cost, distance, km/l and cost per km
- Odometer validation (a reading cannot be lower than the previous one)
- Summary cards: total liters, total cost, average price, distance, average km/l, best/worst km/l, cost per km
- Low-efficiency warning when a fill-up is more than 20% below the vehicle's average (possible leak, engine problem, or fuel theft)
- Monthly cost chart and efficiency trend chart
- Date and vehicle filters, and CSV download

**Service jobs**
- Owners and drivers raise service requests
- Mechanics update status (Pending, In Progress, Done) and add parts and labor cost
- Marking a job Done resets the service-due counter

**Documents (Owner)**
- Track insurance, fitness certificate, tax token, route permit, and driving license
- Status shown as Valid, Due soon, or Expired, with a dashboard warning 30 days before expiry

**Reports (Owner)**
- Fuel cost, service cost, distance, average km/l, and cost per km for each vehicle
- Cost chart and a driver-wise fuel efficiency comparison

**Admin**
- View and manage all users

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Front end | HTML, CSS, JavaScript, Bootstrap 5, Chart.js |
| Back end | Node.js, Express 5 |
| Database | MySQL (mysql2) |
| Security | bcryptjs (password hashing), express-session, prepared SQL statements |

---

## 📁 Project Structure

```
fleet-tracker/
├── public/                  # Front end
│   ├── index.html, login.html, register.html, dashboard.html
│   ├── vehicles.html, vehicle-form.html, fuel.html
│   ├── service.html, documents.html, reports.html
│   ├── css/style.css
│   └── js/app.js, documents.js
├── sql/schema.sql           # Database tables
├── server.js                # Express API
├── extra-routes.js          # Documents and driver report API
├── db.js                    # MySQL connection
├── setup.js                 # Creates the database from schema.sql
├── seed.js                  # Adds demo users and a demo vehicle
├── package.json
└── README.md
```

---

## 🗄 Database Tables

| Table | Purpose |
|---|---|
| `users` | Name, email, hashed password, role |
| `vehicles` | Owner, driver, registration, type, model, mileage, service interval |
| `fuel_logs` | Liters, price, total cost, odometer, efficiency |
| `service_jobs` | Description, status, parts cost, labor cost |
| `documents` | Document type, number, expiry date |

---

## 🚀 Getting Started

### Requirements
- [Node.js](https://nodejs.org) (LTS version)
- MySQL (for example through [XAMPP](https://www.apachefriends.org))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rakibulhasan02/Fleet-Tracker.git
   cd fleet-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start MySQL** (for example from the XAMPP Control Panel).

4. **Check the database settings** in `db.js` and `setup.js`.
   The project uses port `3307` and an empty root password by default. If your MySQL uses port `3306` or has a password, change `port` and `password` in both files.
   You can also use environment variables: `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`.

5. **Create the database**
   ```bash
   node setup.js
   ```
   (Or import `sql/schema.sql` using phpMyAdmin.)

6. **Add demo data**
   ```bash
   npm run seed
   ```

7. **Start the server**
   ```bash
   npm start
   ```

8. Open **http://localhost:3000** in your browser.

---

## 🔑 Demo Accounts

Password for all demo accounts: `123456`

| Role | Email |
|---|---|
| Owner | owner@demo.com |
| Driver | driver@demo.com |
| Mechanic | mechanic@demo.com |
| Admin | admin@demo.com |

---

## 🧪 Quick Demo

1. Log in as **owner** and open the dashboard. The demo truck shows a "Service due" warning.
2. Log in as **driver**, open **Fuel Log**, and add entries with increasing odometer values. Watch the live calculation and the Low efficiency flag.
3. Request a service as the driver, then log in as **mechanic** and mark it Done. The service-due alert clears.
4. As **owner**, add a document that expires within 30 days and check the dashboard warning.
5. Open **Reports** to see cost per km, the chart, and the driver comparison.

---

## 🔒 Security Notes

- Passwords are hashed with bcrypt and never stored as plain text.
- All SQL queries use prepared statements to prevent SQL injection.
- Every protected API route checks the user's role on the server.
- Before deploying, change the session secret in `server.js` to your own long random value.

---

## 🔮 Future Improvements

- Email or SMS reminders for service and document expiry
- GPS location tracking and trip history
- File upload for document scans
- Printable monthly PDF reports
- Profile page with password change

---

## 👤 Author

**Md Rakibul Hasan**
Information and Communication Technology / Mawlana Bhashani Science and Technology University
GitHub: [@rakibulhasan02](https://github.com/rakibulhasan02)

---

## 📄 License

This project was created for educational purposes.
