CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  hourly_rate DECIMAL(5,2),
  employment_type ENUM('full_time','part_time','contract') NOT NULL
);

CREATE TABLE resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  price DECIMAL(6,2),
  description TEXT
);

CREATE TABLE reservations (
  reservation_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_type ENUM('bottle_service','event_ticket','bar') NOT NULL,
  status ENUM('pending','confirmed','cancelled') DEFAULT 'pending',
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE bottle_service (
  reservation_id INT PRIMARY KEY,
  section_number INT NOT NULL,
  guest_count INT NOT NULL,
  minimum_spend DECIMAL(8,2) NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);

CREATE TABLE ticket_reservations (
  reservation_id INT PRIMARY KEY,
  event_id INT NOT NULL,
  ticket_tier VARCHAR(50),
  quantity INT NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);

CREATE TABLE table_section (
  reservation_id INT PRIMARY KEY,
  seat_count INT NOT NULL,
  section_number INT NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);
