USE ClubManagementDB;

-- =========================
-- USERS
-- =========================
INSERT INTO users (id, email, username, password_hash, profile_image, bio) VALUES
(1, 'alex.rivera@example.com', 'alex.rivera', '$2y$10$hash', 'alex.png', 'Frequent VIP guest'),
(2, 'jamie.park@example.com', 'jamie.park', '$2y$10$hash', 'jamie.png', 'Regular club visitor'),
(3, 'taylor.lee@example.com', 'taylor.lee', '$2y$10$hash', 'taylor.png', 'Event promoter'),
(4, 'morgan.kim@example.com', 'morgan.kim', '$2y$10$hash', 'morgan.png', 'VIP customer'),
(5, 'casey.chen@example.com', 'casey.chen', '$2y$10$hash', 'casey.png', 'Birthday guest');

INSERT INTO users (id, email, username, password_hash, privilege, profile_image, created_at) VALUES
(6, 'adminuser@adminuser.com', 'admin', '$2y$10$YqHFpNA8w2eEV1mbcn73a.tnSgOoY3jXxmQPyvqkvrvpNJm8l9Xj2', 'admin', 'default.png', '2026-04-01 04:47:25'),
(7, 'test1@gmail.com', 'test1', '$2y$10$xMByV0Hvx/pMBKoOTsWixei8UQZPDrO10UFJrfJb7nYypt2TF453m', 'user', 'default.png', '2026-04-01 04:48:00'),
(8, 'steve@gmail.com', 'steve', '$2y$10$AsErGyGYkUPlkWJDqnvaDu5CJcM/FP7IkS4cPLmsZYNAwAG/H0fTq', 'staff', 'default.png', '2026-04-01 04:48:20'),
(9, 'rob@gmail.com', 'rob', '$2y$10$1KkYFQGNRs/3Ju7lsIXrcuY/.a0rCDjpCKqV8t78CzTQO3.dj7Z4S', 'staff', 'default.png', '2026-04-01 04:49:00'),
(10, 'test@gmail.com', 'test', '$2y$10$/ZiHmw.EGYDwmuSnreFwdumyhin58f/fcWSFUhLGQ1wzZkGIB01jm', 'user', 'default.png', '2026-04-01 04:49:28');

-- =========================
-- STAFF (EXPANDED)
-- =========================
INSERT INTO staff (id, name, role, hourly_rate, employment_type, user_id) VALUES
(1, 'Alex Rivera', 'Bartender', 25.00, 'full_time', 1),
(2, 'DJ Nova', 'DJ', 60.00, 'contract', 2),
(3, 'Marcus Lee', 'Bouncer', 22.00, 'part_time', 3),

-- NEW BARTENDERS
(4, 'Chris Vale', 'Bartender', 22.00, 'part_time', NULL),
(5, 'Jordan Cruz', 'Bartender', 24.00, 'full_time', NULL),
(6, 'Sam Ortiz', 'Bartender', 23.00, 'part_time', NULL),

-- NEW DJs
(7, 'DJ Blaze', 'DJ', 65.00, 'contract', NULL),
(8, 'DJ Rico', 'DJ', 55.00, 'contract', NULL),
(9, 'DJ Vibe', 'DJ', 50.00, 'part_time', NULL),
(10, 'DJ Echo', 'DJ', 58.00, 'contract', NULL),
(11, 'DJ Pulse', 'DJ', 62.00, 'full_time', NULL),

-- NEW BOUNCERS
(12, 'Mike Stone', 'Bouncer', 20.00, 'full_time', NULL),
(13, 'Ray Knox', 'Bouncer', 19.00, 'part_time', NULL),
(14, 'Leo Grant', 'Bouncer', 21.00, 'full_time', NULL),
(15, 'Zack Cole', 'Bouncer', 18.00, 'part_time', NULL),
(16, 'Noah Reed', 'Bouncer', 20.00, 'full_time', NULL),
(17, 'Evan Shaw', 'Bouncer', 19.00, 'part_time', NULL),
(18, 'Ty Banks', 'Bouncer', 22.00, 'full_time', NULL),

-- NEW BOTTLE SERVICE PROMOTERS
(19, 'Ava Monroe', 'Bottle Service Promoter', 31.00, 'full_time', NULL),
(20, 'Bianca Hale', 'Bottle Service Promoter', 29.00, 'part_time', NULL),
(21, 'Carmen Vega', 'Bottle Service Promoter', 30.00, 'full_time', NULL),
(22, 'Daria Quinn', 'Bottle Service Promoter', 28.00, 'part_time', NULL),
(23, 'Elena Park', 'Bottle Service Promoter', 32.00, 'contract', NULL),
(24, 'Fiona West', 'Bottle Service Promoter', 27.00, 'part_time', NULL),
(25, 'Gia Torres', 'Bottle Service Promoter', 33.00, 'contract', NULL),

-- NEW BAR BACKS
(26, 'Hana Brooks', 'Bar Back', 21.00, 'part_time', NULL),
(27, 'Iris Cole', 'Bar Back', 22.00, 'full_time', NULL),
(28, 'Jade Flynn', 'Bar Back', 20.00, 'part_time', NULL),
(29, 'Kira Moss', 'Bar Back', 23.00, 'contract', NULL);

-- Ensure Security staff exists (idempotent inserts)
INSERT INTO staff (name, role, hourly_rate, employment_type, user_id)
SELECT 'Dante Cruz', 'Security', 24.00, 'full_time', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM staff WHERE name = 'Dante Cruz' AND role = 'Security'
);

INSERT INTO staff (name, role, hourly_rate, employment_type, user_id)
SELECT 'Mason Price', 'Security', 23.00, 'part_time', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM staff WHERE name = 'Mason Price' AND role = 'Security'
);

INSERT INTO staff (name, role, hourly_rate, employment_type, user_id)
SELECT 'Riley Shaw', 'Security', 25.00, 'full_time', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM staff WHERE name = 'Riley Shaw' AND role = 'Security'
);


-- =========================
-- AVAILABILITY (7 DAYS EACH)
-- =========================
INSERT INTO availability (staff_id, day_of_week, start_time, end_time, is_available) VALUES

-- ===== BARTENDERS =====
(4,'Monday','16:00:00','23:00:00',1),
(4,'Tuesday','17:00:00','23:00:00',1),
(4,'Wednesday','18:00:00','23:59:00',1),
(4,'Thursday','18:00:00','23:59:00',1),
(4,'Friday','20:00:00','23:59:00',1),
(4,'Saturday','20:00:00','23:59:00',1),
(4,'Sunday','14:00:00','21:00:00',1),

(5,'Monday','15:00:00','22:00:00',1),
(5,'Tuesday','16:00:00','22:00:00',1),
(5,'Wednesday','17:00:00','23:00:00',1),
(5,'Thursday','18:00:00','23:59:00',1),
(5,'Friday','20:00:00','23:59:00',1),
(5,'Saturday','19:00:00','23:59:00',1),
(5,'Sunday','13:00:00','20:00:00',1),

(6,'Monday','14:00:00','21:00:00',1),
(6,'Tuesday','15:00:00','22:00:00',1),
(6,'Wednesday','16:00:00','23:00:00',1),
(6,'Thursday','18:00:00','23:59:00',1),
(6,'Friday','20:00:00','23:59:00',1),
(6,'Saturday','20:00:00','23:59:00',1),
(6,'Sunday','14:00:00','22:00:00',1),

-- ===== DJs =====
(7,'Monday','18:00:00','23:59:00',1),
(7,'Tuesday','19:00:00','23:59:00',1),
(7,'Wednesday','20:00:00','23:59:00',1),
(7,'Thursday','21:00:00','23:59:00',1),
(7,'Friday','22:00:00','23:59:00',1),
(7,'Saturday','22:00:00','23:59:00',1),
(7,'Sunday','18:00:00','23:00:00',1),

(8,'Monday','18:00:00','23:00:00',1),
(8,'Tuesday','19:00:00','23:59:00',1),
(8,'Wednesday','20:00:00','23:59:00',1),
(8,'Thursday','21:00:00','23:59:00',1),
(8,'Friday','22:00:00','23:59:00',1),
(8,'Saturday','22:00:00','23:59:00',1),
(8,'Sunday','17:00:00','22:00:00',1),

(9,'Monday','17:00:00','23:00:00',1),
(9,'Tuesday','18:00:00','23:59:00',1),
(9,'Wednesday','19:00:00','23:59:00',1),
(9,'Thursday','20:00:00','23:59:00',1),
(9,'Friday','21:00:00','23:59:00',1),
(9,'Saturday','21:00:00','23:59:00',1),
(9,'Sunday','16:00:00','22:00:00',1),

(10,'Monday','18:00:00','23:59:00',1),
(10,'Tuesday','19:00:00','23:59:00',1),
(10,'Wednesday','20:00:00','23:59:00',1),
(10,'Thursday','21:00:00','23:59:00',1),
(10,'Friday','22:00:00','23:59:00',1),
(10,'Saturday','22:00:00','23:59:00',1),
(10,'Sunday','18:00:00','23:00:00',1),

(11,'Monday','17:00:00','23:00:00',1),
(11,'Tuesday','18:00:00','23:59:00',1),
(11,'Wednesday','19:00:00','23:59:00',1),
(11,'Thursday','20:00:00','23:59:00',1),
(11,'Friday','21:00:00','23:59:00',1),
(11,'Saturday','21:00:00','23:59:00',1),
(11,'Sunday','16:00:00','22:00:00',1),

-- ===== BOUNCERS =====
(12,'Monday','18:00:00','01:00:00',1),
(12,'Tuesday','18:00:00','01:00:00',1),
(12,'Wednesday','19:00:00','02:00:00',1),
(12,'Thursday','20:00:00','03:00:00',1),
(12,'Friday','20:00:00','04:00:00',1),
(12,'Saturday','20:00:00','04:00:00',1),
(12,'Sunday','17:00:00','00:00:00',1),

(13,'Monday','17:00:00','00:00:00',1),
(13,'Tuesday','17:00:00','00:00:00',1),
(13,'Wednesday','18:00:00','01:00:00',1),
(13,'Thursday','19:00:00','02:00:00',1),
(13,'Friday','19:00:00','03:00:00',1),
(13,'Saturday','18:00:00','03:00:00',1),
(13,'Sunday','16:00:00','23:00:00',1),

(14,'Monday','18:00:00','01:00:00',1),
(14,'Tuesday','18:00:00','01:00:00',1),
(14,'Wednesday','19:00:00','02:00:00',1),
(14,'Thursday','19:00:00','02:00:00',1),
(14,'Friday','20:00:00','04:00:00',1),
(14,'Saturday','20:00:00','04:00:00',1),
(14,'Sunday','17:00:00','00:00:00',1),

(15,'Monday','16:00:00','23:00:00',1),
(15,'Tuesday','16:00:00','23:00:00',1),
(15,'Wednesday','17:00:00','00:00:00',1),
(15,'Thursday','18:00:00','01:00:00',1),
(15,'Friday','19:00:00','03:00:00',1),
(15,'Saturday','19:00:00','03:00:00',1),
(15,'Sunday','15:00:00','22:00:00',1),

(16,'Monday','17:00:00','00:00:00',1),
(16,'Tuesday','17:00:00','00:00:00',1),
(16,'Wednesday','18:00:00','01:00:00',1),
(16,'Thursday','19:00:00','02:00:00',1),
(16,'Friday','20:00:00','03:00:00',1),
(16,'Saturday','20:00:00','03:00:00',1),
(16,'Sunday','16:00:00','23:00:00',1),

(17,'Monday','18:00:00','01:00:00',1),
(17,'Tuesday','18:00:00','01:00:00',1),
(17,'Wednesday','19:00:00','02:00:00',1),
(17,'Thursday','20:00:00','03:00:00',1),
(17,'Friday','21:00:00','03:00:00',1),
(17,'Saturday','21:00:00','03:00:00',1),
(17,'Sunday','17:00:00','00:00:00',1),

(18,'Monday','18:00:00','01:00:00',1),
(18,'Tuesday','18:00:00','01:00:00',1),
(18,'Wednesday','19:00:00','02:00:00',1),
(18,'Thursday','20:00:00','03:00:00',1),
(18,'Friday','20:00:00','04:00:00',1),
(18,'Saturday','20:00:00','04:00:00',1),
(18,'Sunday','17:00:00','00:00:00',1);


-- Ensure Security availability exists (idempotent inserts)
INSERT INTO availability (staff_id, day_of_week, start_time, end_time, is_available)
SELECT s.id, 'Monday', '18:00:00', '23:59:00', 1
FROM staff s
WHERE s.role = 'Security'
AND NOT EXISTS (
  SELECT 1 FROM availability a
  WHERE a.staff_id = s.id
  AND a.day_of_week = 'Monday'
);

-- =========================
-- RESOURCES
-- =========================
INSERT INTO resources (id, name, type, price, description) VALUES
(1, 'Open Bar Package', 'open_bar', 500.00, 'Unlimited drinks package'),
(2, 'Bottle Service Silver', 'bottle_service', 1200.00, 'Premium bottle service (silver tier)'),
(3, 'Bottle Service Gold', 'bottle_service', 1500.00, 'Premium bottle service (gold tier)'),
(4, 'Event Ticket GA', 'event_ticket', 60.00, 'General admission event ticket');

-- =========================
-- EVENTS (SHIFTED TO MIDNIGHT END)
-- =========================
INSERT INTO events (title, description, start, end, qty_tickets, performer) VALUES
('Week 1 Friday Night', 'EDM Night', '2026-03-27 19:00:00', '2026-03-28 00:00:00', 100, 'DJ Nova'),
('Week 1 Saturday Night', 'Hip Hop Night', '2026-03-28 19:00:00', '2026-03-29 00:00:00', 120, 'DJ Blaze'),
('Week 2 Friday Night', 'EDM Night', '2026-04-03 19:00:00', '2026-04-04 00:00:00', 100, 'DJ Nova'),
('Week 2 Saturday Night', 'Latin Night', '2026-04-04 19:00:00', '2026-04-05 00:00:00', 120, 'DJ Rico'),
('Week 3 Friday Night', 'EDM Night', '2026-04-10 19:00:00', '2026-04-11 00:00:00', 100, 'DJ Nova'),
('Week 3 Saturday Night', 'Hip Hop Night', '2026-04-11 19:00:00', '2026-04-12 00:00:00', 120, 'DJ Blaze'),
('Week 4 Friday Night', 'EDM Night', '2026-04-17 19:00:00', '2026-04-18 00:00:00', 100, 'DJ Nova'),
('Week 4 Saturday Night', 'Latin Night', '2026-04-18 19:00:00', '2026-04-19 00:00:00', 120, 'DJ Rico'),
('Week 5 Friday Night', 'EDM Night', '2026-04-24 19:00:00', '2026-04-25 00:00:00', 100, 'DJ Nova'),
('Week 5 Saturday Night', 'Hip Hop Night', '2026-04-25 19:00:00', '2026-04-26 00:00:00', 120, 'DJ Blaze'),
('Week 6 Friday Night', 'EDM Night', '2026-05-01 19:00:00', '2026-05-02 00:00:00', 100, 'DJ Nova'),
('Week 6 Saturday Night', 'Latin Night', '2026-05-02 19:00:00', '2026-05-03 00:00:00', 120, 'DJ Rico'),
('Week 7 Friday Night', 'EDM Night', '2026-05-08 19:00:00', '2026-05-09 00:00:00', 100, 'DJ Nova'),
('Week 7 Saturday Night', 'Hip Hop Night', '2026-05-09 19:00:00', '2026-05-10 00:00:00', 120, 'DJ Blaze'),
('Week 8 Friday Night', 'EDM Night', '2026-05-15 19:00:00', '2026-05-16 00:00:00', 100, 'DJ Nova'),
('Week 8 Saturday Night', 'Latin Night', '2026-05-16 19:00:00', '2026-05-17 00:00:00', 120, 'DJ Rico'),
('Week 9 Friday Night', 'EDM Night', '2026-05-22 19:00:00', '2026-05-23 00:00:00', 100, 'DJ Nova'),
('Week 9 Saturday Night', 'Hip Hop Night', '2026-05-23 19:00:00', '2026-05-24 00:00:00', 120, 'DJ Blaze'),
('Week 10 Friday Night', 'EDM Night', '2026-05-29 19:00:00', '2026-05-30 00:00:00', 100, 'DJ Nova'),
('Week 10 Saturday Night', 'Latin Night', '2026-05-30 19:00:00', '2026-05-31 00:00:00', 120, 'DJ Rico');

-- =========================
-- TICKETS
-- =========================
INSERT INTO tickets (tier, price, event_id) VALUES
('GA', 60.00, 1),
('VIP', 120.00, 1),
('GA', 70.00, 2),
('VIP', 150.00, 2),
('GA', 60.00, 3),
('VIP', 120.00, 3),
('GA', 70.00, 4),
('VIP', 150.00, 4),
('GA', 60.00, 5),
('VIP', 120.00, 5),
('GA', 70.00, 6),
('VIP', 150.00, 6),
('GA', 60.00, 7),
('VIP', 120.00, 7),
('GA', 70.00, 8),
('VIP', 150.00, 8),
('GA', 60.00, 9),
('VIP', 120.00, 9),
('GA', 70.00, 10),
('VIP', 150.00, 10),
('GA', 60.00, 11),
('VIP', 120.00, 11),
('GA', 70.00, 12),
('VIP', 150.00, 12),
('GA', 60.00, 13),
('VIP', 120.00, 13),
('GA', 70.00, 14),
('VIP', 150.00, 14),
('GA', 60.00, 15),
('VIP', 120.00, 15),
('GA', 70.00, 16),
('VIP', 150.00, 16),
('GA', 60.00, 17),
('VIP', 120.00, 17),
('GA', 70.00, 18),
('VIP', 150.00, 18),
('GA', 60.00, 19),
('VIP', 120.00, 19),
('GA', 70.00, 20),
('VIP', 150.00, 20);

-- =========================
-- RESERVATIONS (FIXED IDS)
-- =========================
INSERT INTO reservations (reservation_id, user_id, resource_id, service_type, status, start_time, end_time) VALUES
(1, 1, 2, 'Bottle Service', 'confirmed', '2026-04-10 20:00:00', '2026-04-10 22:00:00'),
(2, 2, 2, 'Bottle Service', 'pending', '2026-04-11 21:00:00', '2026-04-11 23:00:00');

-- =========================
-- SUBTABLES
-- =========================
INSERT INTO bottle_service VALUES
(1, 101, 6, 1200.00),
(2, 102, 8, 1500.00);

-- =========================
-- STAFF ASSIGNMENTS
-- =========================
INSERT INTO ReservationStaff VALUES
(1, 4),
(1, 12),
(2, 5),
(2, 13);

-- =========================
-- FUTURE RESERVATION ACTIVITY (ADDITIONAL SEED DATA)
-- =========================
-- Ticket resources required by reservation flow
INSERT INTO resources (id, name, type, price, description) VALUES
(5, 'Event Ticket VIP', 'event_ticket', 120.00, 'VIP event ticket reservation');

-- 10 additional future reservations
INSERT INTO reservations (reservation_id, user_id, resource_id, service_type, status, start_time, end_time) VALUES
(3, 1, 4, 'Event Ticket GA', 'confirmed', '2026-04-03 20:30:00', '2026-04-03 21:00:00'),
(4, 2, 5, 'Event Ticket VIP', 'confirmed', '2026-04-04 21:30:00', '2026-04-04 22:00:00'),
(5, 5, 4, 'Event Ticket GA', 'pending', '2026-04-10 20:15:00', '2026-04-10 20:45:00'),
(6, 4, 5, 'Event Ticket VIP', 'confirmed', '2026-04-11 21:20:00', '2026-04-11 21:50:00'),
(7, 3, 4, 'Event Ticket GA', 'confirmed', '2026-04-17 20:40:00', '2026-04-17 21:10:00'),
(8, 2, 5, 'Event Ticket VIP', 'pending', '2026-04-18 21:35:00', '2026-04-18 22:05:00'),
(9, 1, 4, 'Event Ticket GA', 'confirmed', '2026-04-24 20:10:00', '2026-04-24 20:40:00'),
(10, 5, 5, 'Event Ticket VIP', 'confirmed', '2026-04-25 21:25:00', '2026-04-25 21:55:00'),
(11, 4, 4, 'Event Ticket GA', 'pending', '2026-05-01 20:50:00', '2026-05-01 21:20:00'),
(12, 3, 5, 'Event Ticket VIP', 'confirmed', '2026-05-02 21:45:00', '2026-05-02 22:15:00');

-- Ticket reservation child rows
INSERT INTO ticket_reservations (reservation_id, event_id, ticket_tier, quantity) VALUES
(3, 3, 'GA', 2),
(4, 4, 'VIP', 1),
(5, 5, 'GA', 4),
(6, 6, 'VIP', 2),
(7, 7, 'GA', 3),
(8, 8, 'VIP', 2),
(9, 9, 'GA', 1),
(10, 10, 'VIP', 3),
(11, 11, 'GA', 2),
(12, 12, 'VIP', 1);

-- Reservation staff assignments
INSERT INTO ReservationStaff VALUES
(3, 3),
(3, 12),
(4, 1),
(4, 14),
(5, 13),
(5, 4),
(6, 16),
(6, 5),
(7, 17),
(7, 6),
(8, 18),
(8, 12),
(9, 14),
(9, 4),
(10, 15),
(10, 5),
(11, 3),
(11, 6),
(12, 13),
(12, 1);

-- Event staffing to match reservation/event load
INSERT INTO EventStaff (event_id, staff_id) VALUES
(3, 2), (3, 12), (3, 4),
(4, 8), (4, 13), (4, 5),
(5, 2), (5, 14), (5, 6),
(6, 8), (6, 15), (6, 4),
(7, 2), (7, 16), (7, 5),
(8, 8), (8, 17), (8, 6),
(9, 2), (9, 18), (9, 4),
(10, 7), (10, 12), (10, 5),
(11, 2), (11, 13), (11, 6),
(12, 8), (12, 14), (12, 4);

-- User reminder notifications (10 minutes before start)
INSERT INTO user_notifications (user_id, reservation_id, notify_at) VALUES
(1, 3, '2026-04-03 20:20:00'),
(2, 4, '2026-04-04 21:20:00'),
(5, 5, '2026-04-10 20:05:00'),
(4, 6, '2026-04-11 21:10:00'),
(3, 7, '2026-04-17 20:30:00'),
(2, 8, '2026-04-18 21:25:00'),
(1, 9, '2026-04-24 20:00:00'),
(5, 10, '2026-04-25 21:15:00'),
(4, 11, '2026-05-01 20:40:00'),
(3, 12, '2026-05-02 21:35:00');

-- Staff notifications for users linked to assigned staff members
INSERT INTO staff_notifications (staff_user_id, reservation_id, message) VALUES
(3, 3, 'New Assignment: You have been assigned to Event Ticket GA shift.'),
(1, 4, 'New Assignment: You have been assigned to Event Ticket VIP shift.'),
(3, 11, 'New Assignment: You have been assigned to Event Ticket GA shift.'),
(1, 12, 'New Assignment: You have been assigned to Event Ticket VIP shift.');

INSERT INTO staff_notifications (staff_user_id, event_id, message) VALUES
(2, 3, 'Event Assignment: You have been assigned to Week 2 Friday Night.'),
(2, 5, 'Event Assignment: You have been assigned to Week 3 Friday Night.'),
(2, 7, 'Event Assignment: You have been assigned to Week 4 Friday Night.'),
(2, 9, 'Event Assignment: You have been assigned to Week 5 Friday Night.'),
(2, 11, 'Event Assignment: You have been assigned to Week 6 Friday Night.');


-- =========================
-- SPRINT 5 TEST DATA
-- =========================

-- Soft deleted records
UPDATE users SET removed = 1, removed_by_user_id = 6 WHERE id = 5;
UPDATE staff SET removed = 1, removed_by_user_id = 6 WHERE id = 29;
UPDATE resources SET removed = 1, removed_by_user_id = 6 WHERE id = 4;
UPDATE events SET removed = 1, removed_by_user_id = 6 WHERE event_id = 1;

-- Cancelled reservation
UPDATE reservations 
SET status = 'cancelled',
    cancellation_reason = 'Admin cancelled due to maintenance',
    cancelled_by_user_id = 6
WHERE reservation_id = 2;

-- Cancelled event
UPDATE events
SET status = 'cancelled',
    cancellation_reason = 'Weather issues',
    cancelled_by_user_id = 6
WHERE event_id = 2;