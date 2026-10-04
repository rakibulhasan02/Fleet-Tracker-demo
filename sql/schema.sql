CREATE DATABASE IF NOT EXISTS fleet_tracker;
USE fleet_tracker;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner','driver','mechanic','admin') NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  driver_id INT NULL,
  reg_no VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(30),
  model VARCHAR(50),
  mileage INT DEFAULT 0,
  service_interval_km INT DEFAULT 5000,
  last_service_km INT DEFAULT 0,
  status ENUM('Active','In Service','Inactive') DEFAULT 'Active',
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fuel_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  driver_id INT NOT NULL,
  log_date DATE NOT NULL,
  liters DECIMAL(8,2) NOT NULL,
  price_per_liter DECIMAL(8,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  odometer INT NOT NULL,
  efficiency DECIMAL(6,2) NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  mechanic_id INT NULL,
  description VARCHAR(255) NOT NULL,
  status ENUM('Pending','In Progress','Done') DEFAULT 'Pending',
  parts_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (mechanic_id) REFERENCES users(id) ON DELETE SET NULL
);
