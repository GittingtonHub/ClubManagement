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
(18, 'Ty Banks', 'Bouncer', 22.00, 'full_time', NULL);

-- =========================
-- AVAILABILITY (VARIED)
-- =========================
INSERT INTO availability (staff_id, day_of_week, start_time, end_time, is_available) VALUES

-- Bartenders
(4, 'Monday', '16:00:00', '23:00:00', 1),
(5, 'Friday', '20:00:00', '03:00:00', 1),
(6, 'Sunday', '14:00:00', '22:00:00', 1),

-- DJs
(7, 'Friday', '22:00:00', '04:00:00', 1),
(8, 'Saturday', '22:00:00', '04:00:00', 1),
(9, 'Wednesday', '19:00:00', '00:00:00', 1),
(10, 'Thursday', '21:00:00', '02:00:00', 1),
(11, 'Sunday', '18:00:00', '23:00:00', 1),

-- Bouncers
(12, 'Friday', '20:00:00', '04:00:00', 1),
(13, 'Saturday', '18:00:00', '03:00:00', 1),
(14, 'Thursday', '19:00:00', '02:00:00', 1),
(15, 'Sunday', '17:00:00', '00:00:00', 1),
(16, 'Wednesday', '18:00:00', '01:00:00', 1),
(17, 'Friday', '21:00:00', '03:00:00', 1),
(18, 'Saturday', '20:00:00', '04:00:00', 1);

-- =========================
-- RESOURCES
-- =========================
INSERT INTO resources (id, name, type, price, description) VALUES
(1, 'Open Bar Package', 'open_bar', 500.00, 'Unlimited drinks package'),
(2, 'Bottle Service', 'bottle_service', 1200.00, 'Premium bottle service');

-- =========================
-- EVENTS (UNCHANGED - GOOD)
-- =========================
INSERT INTO events (title, description, start, end, qty_tickets, performer) VALUES
('Week 1 Friday Night', 'EDM Night', '2026-03-27 21:00:00', '2026-03-28 02:00:00', 100, 'DJ Nova'),
('Week 1 Saturday Night', 'Hip Hop Night', '2026-03-28 22:00:00', '2026-03-29 03:00:00', 120, 'DJ Blaze'),
('Week 2 Friday Night', 'EDM Night', '2026-04-03 21:00:00', '2026-04-04 02:00:00', 100, 'DJ Nova'),
('Week 2 Saturday Night', 'Latin Night', '2026-04-04 22:00:00', '2026-04-05 03:00:00', 120, 'DJ Rico'),
('Week 3 Friday Night', 'EDM Night', '2026-04-10 21:00:00', '2026-04-11 02:00:00', 100, 'DJ Nova'),
('Week 3 Saturday Night', 'Hip Hop Night', '2026-04-11 22:00:00', '2026-04-12 03:00:00', 120, 'DJ Blaze'),
('Week 4 Friday Night', 'EDM Night', '2026-04-17 21:00:00', '2026-04-18 02:00:00', 100, 'DJ Nova'),
('Week 4 Saturday Night', 'Latin Night', '2026-04-18 22:00:00', '2026-04-19 03:00:00', 120, 'DJ Rico'),
('Week 5 Friday Night', 'EDM Night', '2026-04-24 21:00:00', '2026-04-25 02:00:00', 100, 'DJ Nova'),
('Week 5 Saturday Night', 'Hip Hop Night', '2026-04-25 22:00:00', '2026-04-26 03:00:00', 120, 'DJ Blaze'),
('Week 6 Friday Night', 'EDM Night', '2026-05-01 21:00:00', '2026-05-02 02:00:00', 100, 'DJ Nova'),
('Week 6 Saturday Night', 'Latin Night', '2026-05-02 22:00:00', '2026-05-03 03:00:00', 120, 'DJ Rico'),
('Week 7 Friday Night', 'EDM Night', '2026-05-08 21:00:00', '2026-05-09 02:00:00', 100, 'DJ Nova'),
('Week 7 Saturday Night', 'Hip Hop Night', '2026-05-09 22:00:00', '2026-05-10 03:00:00', 120, 'DJ Blaze'),
('Week 8 Friday Night', 'EDM Night', '2026-05-15 21:00:00', '2026-05-16 02:00:00', 100, 'DJ Nova'),
('Week 8 Saturday Night', 'Latin Night', '2026-05-16 22:00:00', '2026-05-17 03:00:00', 120, 'DJ Rico'),
('Week 9 Friday Night', 'EDM Night', '2026-05-22 21:00:00', '2026-05-23 02:00:00', 100, 'DJ Nova'),
('Week 9 Saturday Night', 'Hip Hop Night', '2026-05-23 22:00:00', '2026-05-24 03:00:00', 120, 'DJ Blaze'),
('Week 10 Friday Night', 'EDM Night', '2026-05-29 21:00:00', '2026-05-30 02:00:00', 100, 'DJ Nova'),
('Week 10 Saturday Night', 'Latin Night', '2026-05-30 22:00:00', '2026-05-31 03:00:00', 120, 'DJ Rico');

-- =========================
-- TICKETS
-- =========================
INSERT INTO tickets (tier, price, event_id) VALUES
('GA', 60.00, 1),
('VIP', 120.00, 1),
('GA', 70.00, 2),
('VIP', 150.00, 2);

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