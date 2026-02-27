USE ClubManagementDB;

-- =========================
-- USERS
-- =========================

INSERT INTO users (id, email, username, password_hash, privilege, profile_image, bio) VALUES
(1, 'alex.rivera@example.com', 'alexr', '$2y$10$yH6mM7Hk1b0rW9Z0wQbOQeI2Yy8kYb8cV0U2wX4KQeJ3gV1Y9q2KS', 'admin', 'default.png', 'Club administrator.'),
(2, 'jamie.park@example.com', 'jamiep', '$2y$10$yH6mM7Hk1b0rW9Z0wQbOQeI2Yy8kYb8cV0U2wX4KQeJ3gV1Y9q2KS', 'user', 'default.png', 'VIP member.'),
(3, 'taylor.lee@example.com', 'taylorl', '$2y$10$yH6mM7Hk1b0rW9Z0wQbOQeI2Yy8kYb8cV0U2wX4KQeJ3gV1Y9q2KS', 'user', 'default.png', 'Loyal guest.'),
(4, 'morgan.kim@example.com', 'morgank', '$2y$10$yH6mM7Hk1b0rW9Z0wQbOQeI2Yy8kYb8cV0U2wX4KQeJ3gV1Y9q2KS', 'user', 'default.png', 'Frequent attendee.'),
(5, 'casey.chen@example.com', 'caseyc', '$2y$10$yH6mM7Hk1b0rW9Z0wQbOQeI2Yy8kYb8cV0U2wX4KQeJ3gV1Y9q2KS', 'user', 'default.png', 'Event enthusiast.');

-- =========================
-- STAFF
-- =========================

INSERT INTO staff (id, name, role, hourly_rate, employment_type) VALUES
(1, 'Alex Rivera', 'Bartender', 25.00, 'full_time'),
(2, 'DJ Nova', 'DJ', 60.00, 'contract'),
(3, 'Marcus Lee', 'Security', 22.00, 'part_time');

-- =========================
-- RESOURCES
-- =========================

INSERT INTO resources (id, name, type, price, description) VALUES
(1, 'Open Bar Package', 'bar', 2500.00, 'Unlimited drinks for event'),
(2, 'Bottle Service Silver', 'bottle_service', 450.00, 'Standard bottle service package'),
(3, 'Bottle Service Gold', 'bottle_service', 850.00, 'Premium bottle service package'),
(4, 'Event Ticket GA', 'event_ticket', 50.00, 'General admission ticket'),
(5, 'Event Ticket VIP', 'event_ticket', 150.00, 'VIP admission ticket');

-- =========================
-- RESERVATIONS
-- =========================

INSERT INTO reservations (reservation_id, user_id, resource_id, service_type, status, start_time, end_time) VALUES
-- Past reservations
(1, 2, 2, 'Bottle Service Silver', 'confirmed', '2026-02-10 20:00:00', '2026-02-10 22:00:00'),
(2, 2, 4, 'Event Ticket GA', 'confirmed', '2026-02-11 19:00:00', '2026-02-11 23:00:00'),

-- Today's reservation (adjust if needed)
(3, 2, 1, 'Open Bar Package', 'confirmed', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 HOUR)),

-- Future reservations
(4, 2, 5, 'Event Ticket VIP', 'confirmed', '2026-03-20 20:00:00', '2026-03-20 23:00:00'),
(5, 2, 3, 'Bottle Service Gold', 'pending', '2026-03-22 21:00:00', '2026-03-22 23:30:00'),

-- Additional reservations for other users
(6, 3, 4, 'Event Ticket GA', 'confirmed', '2026-03-25 19:00:00', '2026-03-25 23:00:00'),
(7, 4, 2, 'Bottle Service Silver', 'confirmed', '2026-03-26 20:00:00', '2026-03-26 22:00:00'),
(8, 5, 1, 'Open Bar Package', 'pending', '2026-03-27 18:00:00', '2026-03-27 20:00:00');

-- =========================
-- BOTTLE SERVICE
-- =========================

INSERT INTO bottle_service (reservation_id, section_number, guest_count, minimum_spend) VALUES
(1, 101, 6, 1200.00),
(5, 102, 8, 1500.00),
(7, 103, 5, 1000.00);

-- =========================
-- TICKET RESERVATIONS
-- =========================

INSERT INTO ticket_reservations (reservation_id, event_id, ticket_tier, quantity) VALUES
(2, 2001, 'GA', 2),
(4, 2002, 'VIP', 2),
(6, 2003, 'GA', 3);

-- =========================
-- TABLE SECTION
-- =========================

INSERT INTO table_section (reservation_id, seat_count, section_number) VALUES
(3, 4, 201),
(8, 6, 202);