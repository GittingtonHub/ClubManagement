-- =========================
-- FULL CLEAN RESET
-- =========================
DROP DATABASE IF EXISTS ClubManagementDB;
CREATE DATABASE ClubManagementDB;
USE ClubManagementDB;

-- Drop tables in correct order (to avoid FK conflicts)
DROP TABLE IF EXISTS user_notifications;
DROP TABLE IF EXISTS staff_notifications;
DROP TABLE IF EXISTS ReservationStaff;
DROP TABLE IF EXISTS EventStaff;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS events;

DROP TABLE IF EXISTS table_section;
DROP TABLE IF EXISTS ticket_reservations;
DROP TABLE IF EXISTS bottle_service;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS users;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  privilege ENUM('user','admin','staff') DEFAULT 'user',
  profile_image VARCHAR(255) DEFAULT 'default.png',
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- STAFF
-- =========================
CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  hourly_rate DECIMAL(5,2),
  employment_type ENUM('full_time','part_time','contract') NOT NULL,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =========================
-- RESOURCES
-- =========================
CREATE TABLE resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  price DECIMAL(6,2),
  description TEXT
);

-- =========================
-- EVENTS
-- =========================
CREATE TABLE events (
  event_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start DATETIME NOT NULL,
  end DATETIME NOT NULL,
  qty_tickets INT NOT NULL,
  performer VARCHAR(255)
);

-- =========================
-- TICKETS
-- =========================
CREATE TABLE tickets (
  ticket_id INT AUTO_INCREMENT PRIMARY KEY,
  tier VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  event_id INT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(event_id)
);

-- =========================
-- RESERVATIONS
-- =========================
CREATE TABLE reservations (
  reservation_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  resource_id INT NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  status ENUM('pending','confirmed','cancelled') DEFAULT 'pending',
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

-- =========================
-- RESERVATION SUBTYPES
-- =========================
CREATE TABLE bottle_service (
  reservation_id INT PRIMARY KEY,
  section_number INT NOT NULL,
  guest_count INT NOT NULL,
  minimum_spend DECIMAL(8,2) NOT NULL CHECK (minimum_spend >= 0),
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);

CREATE TABLE ticket_reservations (
  reservation_id INT PRIMARY KEY,
  event_id INT NOT NULL,
  ticket_tier VARCHAR(50),
  quantity INT NOT NULL CHECK (quantity >= 0),
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id),
  FOREIGN KEY (event_id) REFERENCES events(event_id)
);

CREATE TABLE table_section (
  reservation_id INT PRIMARY KEY,
  seat_count INT NOT NULL,
  section_number INT NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);

-- =========================
-- EVENT STAFF (M:M)
-- =========================
CREATE TABLE EventStaff (
  event_id INT,
  staff_id INT,
  PRIMARY KEY (event_id, staff_id),
  FOREIGN KEY (event_id) REFERENCES events(event_id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- =========================
-- RESERVATION STAFF (M:M)
-- =========================
CREATE TABLE ReservationStaff (
  reservation_id INT,
  staff_id INT,
  PRIMARY KEY (reservation_id, staff_id),
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- =========================
-- STAFF NOTIFICATIONS
-- =========================
CREATE TABLE staff_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_user_id INT NOT NULL,
  reservation_id INT DEFAULT NULL,
  event_id INT DEFAULT NULL,
  message VARCHAR(255) NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (staff_user_id) REFERENCES users(id),
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id),
  FOREIGN KEY (event_id) REFERENCES events(event_id)
);

-- =========================
-- USER NOTIFICATIONS
-- =========================
CREATE TABLE user_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reservation_id INT NOT NULL,
  notify_at DATETIME NOT NULL,
  is_sent TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);