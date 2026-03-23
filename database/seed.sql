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
-- RESOURCES
-- =========================
INSERT INTO resources (id, name, type, price, description) VALUES
(1, 'VIP Section A Bottle Service', 'bottle_service', 1200.00, 'Premium VIP'),
(2, 'VIP Section B Bottle Service', 'bottle_service', 900.00, 'Standard VIP'),
(3, 'Main Floor Table', 'bottle_service', 700.00, 'Dancefloor table'),
(4, 'Friday Event Ticket', 'event_ticket', 60.00, 'Friday event'),
(5, 'Saturday VIP Ticket', 'event_ticket', 150.00, 'VIP ticket');

-- =========================
-- EVENTS (NEW)
-- =========================
INSERT INTO events (event_id, title, description, start, end, qty_tickets, performer) VALUES
(1, 'Friday DJ Night', 'EDM night', '2026-02-10 21:00:00', '2026-02-11 02:00:00', 100, 'DJ Nova'),
(2, 'Saturday Headliner', 'Main event', '2026-02-11 22:00:00', '2026-02-12 03:00:00', 150, 'DJ Blaze');

-- =========================
-- TICKETS (NEW)
-- =========================
INSERT INTO tickets (tier, price, event_id) VALUES
('GA', 60.00, 1),
('VIP', 120.00, 1),
('GA', 70.00, 2),
('VIP', 150.00, 2);

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