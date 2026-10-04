const mysql = require('mysql2/promise');
module.exports = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: 3307,                              // XAMPP MySQL port
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',     // XAMPP default is empty
  database: process.env.DB_NAME || 'fleet_tracker',
  dateStrings: true
});