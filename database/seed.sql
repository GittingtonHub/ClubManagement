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
-- STAFF
-- =========================
INSERT INTO staff (id, name, role, hourly_rate, employment_type, user_id) VALUES
(1, 'Alex Rivera', 'Bartender', 25.00, 'full_time', 1),
(2, 'DJ Nova', 'DJ', 60.00, 'contract', 2),
(3, 'Marcus Lee', 'Security', 22.00, 'part_time', 3);

-- =========================
-- AVAILABILITY
-- =========================
INSERT INTO availability (staff_id, day_of_week, start_time, end_time, is_available) VALUES
(1, 'Monday', '00:00:00', '23:59:00', 1),
(1, 'Tuesday', '00:00:00', '23:59:00', 1),
(1, 'Wednesday', '00:00:00', '23:59:00', 1),
(1, 'Thursday', '00:00:00', '23:59:00', 1),
(1, 'Friday', '00:00:00', '23:59:00', 1),
(1, 'Saturday', '00:00:00', '23:59:00', 1),
(1, 'Sunday', '00:00:00', '23:59:00', 1),
(2, 'Monday', '00:00:00', '23:59:00', 1),
(2, 'Tuesday', '00:00:00', '23:59:00', 1),
(2, 'Wednesday', '00:00:00', '23:59:00', 1),
(2, 'Thursday', '00:00:00', '23:59:00', 1),
(2, 'Friday', '00:00:00', '23:59:00', 1),
(2, 'Saturday', '00:00:00', '23:59:00', 1),
(2, 'Sunday', '00:00:00', '23:59:00', 1),
(3, 'Monday', '00:00:00', '23:59:00', 1),
(3, 'Tuesday', '00:00:00', '23:59:00', 1),
(3, 'Wednesday', '00:00:00', '23:59:00', 1),
(3, 'Thursday', '00:00:00', '23:59:00', 1),
(3, 'Friday', '00:00:00', '23:59:00', 1),
(3, 'Saturday', '00:00:00', '23:59:00', 1),
(3, 'Sunday', '00:00:00', '23:59:00', 1);

-- =========================
-- RESOURCES
-- =========================
INSERT INTO resources (id, name, type, price, description) VALUES
(1, 'Open Bar Package', 'open_bar', 500.00, 'Unlimited drinks package'),
(2, 'Bottle Service Silver', 'bottle_service', 1200.00, 'Premium bottle service (silver tier)'),
(3, 'Bottle Service Gold', 'bottle_service', 1500.00, 'Premium bottle service (gold tier)'),
(4, 'Event Ticket GA', 'event_ticket', 60.00, 'General admission event ticket');

-- =========================
-- EVENTS (NEW)
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
-- TICKETS (NEW)
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
-- RESERVATIONS
-- =========================
INSERT INTO reservations (reservation_id, user_id, resource_id, service_type, status, start_time, end_time) VALUES
(1, 1, 2, 'bottle_service', 'confirmed', '2026-02-10 20:00:00', '2026-02-10 22:00:00'),
(2, 2, 3, 'bottle_service', 'pending', '2026-02-11 21:00:00', '2026-02-11 23:00:00'),
(6, 1, 4, 'event_ticket', 'confirmed', '2026-02-10 19:00:00', '2026-02-10 23:00:00'),
(7, 2, 4, 'event_ticket', 'pending', '2026-02-11 19:30:00', '2026-02-11 23:30:00');

-- =========================
-- SUBTABLES
-- =========================
INSERT INTO bottle_service VALUES
(1, 101, 6, 1200.00),
(2, 102, 8, 1500.00);

INSERT INTO ticket_reservations VALUES
(6, 1, 'GA', 2),
(7, 1, 'GA', 4);

-- =========================
-- STAFF ASSIGNMENTS (NEW)
-- =========================
INSERT INTO EventStaff VALUES
(1, 1),
(2, 2);

INSERT INTO ReservationStaff VALUES
(1, 1),
(2, 2);

-- =========================
-- STAFF NOTIFICATIONS (NEW)
-- =========================
INSERT INTO staff_notifications (staff_user_id, reservation_id, event_id, message) VALUES
(1, 1, NULL, 'Assigned to reservation'),
(2, NULL, 1, 'Assigned to Friday DJ Night');

-- =========================
-- USER NOTIFICATIONS (NEW)
-- =========================
INSERT INTO user_notifications (user_id, reservation_id, notify_at) VALUES
(1, 1, DATE_SUB('2026-02-10 20:00:00', INTERVAL 10 MINUTE)),
(2, 2, DATE_SUB('2026-02-11 21:00:00', INTERVAL 10 MINUTE));
