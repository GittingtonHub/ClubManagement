USE ClubManagementDB;

INSERT INTO users (id, email, password_hash) VALUES
(1, 'alex.rivera@example.com', '$2y$10$yH6mM7Hk1b0rW9Z0wQbOQeI2Yy8kYb8cV0U2wX4KQeJ3gV1Y9q2KS'),
(2, 'jamie.park@example.com', '$2y$10$yH6mM7Hk1b0rW9Z0wQbOQeI2Yy8kYb8cV0U2wX4KQeJ3gV1Y9q2KS'),
(3, 'taylor.lee@example.com', '$2y$10$yH6mM7Hk1b0rW9Z0wQbOQeI2Yy8kYb8cV0U2wX4KQeJ3gV1Y9q2KS'),
(4, 'morgan.kim@example.com', '$2y$10$yH6mM7Hk1b0rW9Z0wQbOQeI2Yy8kYb8cV0U2wX4KQeJ3gV1Y9q2KS'),
(5, 'casey.chen@example.com', '$2y$10$yH6mM7Hk1b0rW9Z0wQbOQeI2Yy8kYb8cV0U2wX4KQeJ3gV1Y9q2KS');

INSERT INTO staff (id, name, role, hourly_rate, employment_type) VALUES
(1, 'Alex Rivera', 'Bartender', 25.00, 'full_time'),
(2, 'DJ Nova', 'DJ', 60.00, 'contract'),
(3, 'Marcus Lee', 'Security', 22.00, 'part_time'),
(4, 'Priya Shah', 'Manager', 35.00, 'full_time'),
(5, 'Jordan Blake', 'Host', 18.50, 'part_time');

INSERT INTO resources (id, name, type, price, description) VALUES
(1, 'Open Bar Package', 'bar', 2500.00, 'Unlimited drinks for event'),
(2, 'Bottle Service Silver', 'bottle_service', 450.00, 'Standard bottle service package'),
(3, 'Bottle Service Gold', 'bottle_service', 850.00, 'Premium bottle service package'),
(4, 'Event Ticket GA', 'event_ticket', 50.00, 'General admission ticket'),
(5, 'Event Ticket VIP', 'event_ticket', 150.00, 'VIP admission ticket');

INSERT INTO reservations (reservation_id, user_id, resource_id, service_type, status, start_time, end_time) VALUES
(1, 1, 2, 'bottle_service', 'confirmed', '2026-02-10 20:00:00', '2026-02-10 22:00:00'),
(2, 2, 3, 'bottle_service', 'pending', '2026-02-11 21:00:00', '2026-02-11 23:00:00'),
(3, 3, 2, 'bottle_service', 'confirmed', '2026-02-12 19:00:00', '2026-02-12 21:30:00'),
(4, 4, 3, 'bottle_service', 'cancelled', '2026-02-13 20:30:00', '2026-02-13 22:30:00'),
(5, 5, 2, 'bottle_service', 'confirmed', '2026-02-14 21:00:00', '2026-02-14 23:30:00'),

(6, 1, 4, 'event_ticket', 'confirmed', '2026-02-10 19:00:00', '2026-02-10 23:00:00'),
(7, 2, 4, 'event_ticket', 'pending', '2026-02-11 19:30:00', '2026-02-11 23:30:00'),
(8, 3, 5, 'event_ticket', 'confirmed', '2026-02-12 20:00:00', '2026-02-12 23:59:00'),
(9, 4, 4, 'event_ticket', 'confirmed', '2026-02-13 19:00:00', '2026-02-13 23:00:00'),
(10, 5, 5, 'event_ticket', 'cancelled', '2026-02-14 20:00:00', '2026-02-14 23:00:00'),

(11, 1, 1, 'bar', 'confirmed', '2026-02-10 18:00:00', '2026-02-10 20:00:00'),
(12, 2, 1, 'bar', 'pending', '2026-02-11 18:30:00', '2026-02-11 20:30:00'),
(13, 3, 1, 'bar', 'confirmed', '2026-02-12 18:00:00', '2026-02-12 20:00:00'),
(14, 4, 1, 'bar', 'confirmed', '2026-02-13 18:30:00', '2026-02-13 20:30:00'),
(15, 5, 1, 'bar', 'cancelled', '2026-02-14 18:00:00', '2026-02-14 20:00:00');

INSERT INTO bottle_service (reservation_id, section_number, guest_count, minimum_spend) VALUES
(1, 101, 6, 1200.00),
(2, 102, 8, 1500.00),
(3, 103, 5, 1000.00),
(4, 104, 7, 1400.00),
(5, 105, 10, 2000.00);

INSERT INTO ticket_reservations (reservation_id, event_id, ticket_tier, quantity) VALUES
(6, 2001, 'GA', 2),
(7, 2001, 'GA', 4),
(8, 2002, 'VIP', 2),
(9, 2003, 'GA', 3),
(10, 2003, 'VIP', 1);

INSERT INTO table_section (reservation_id, seat_count, section_number) VALUES
(11, 4, 201),
(12, 6, 202),
(13, 2, 203),
(14, 8, 204),
(15, 5, 205);

-- ADMIN ACCOUNT
INSERT INTO users (email, username, password_hash, privilege, bio)
VALUES (
  'admin@club.com',
  'admin',
  '$2y$10$yH6mM7Hk1b0rW9Z0wQbOQeI2Yy8kYb8cV0U2wX4KQeJ3gV1Y9q2KS',
  'admin',
  'System administrator'
);

-- TEST USER WITH RESERVATIONS
INSERT INTO users (email, username, password_hash, privilege, bio)
VALUES (
  'testuser@club.com',
  'testuser',
  '$2y$10$yH6mM7Hk1b0rW9Z0wQbOQeI2Yy8kYb8cV0U2wX4KQeJ3gV1Y9q2KS',
  'user',
  'Test account with reservations'
);

-- TEST USER RESERVATIONS (PAST + TODAY + FUTURE)
INSERT INTO reservations (user_id, resource_id, service_type, status, start_time, end_time) VALUES
(7, 2, 'bottle_service', 'confirmed', '2026-02-05 20:00:00', '2026-02-05 22:00:00'),
(7, 4, 'event_ticket', 'confirmed', '2026-02-12 19:00:00', '2026-02-12 23:00:00'),
(7, 1, 'bar', 'confirmed', '2026-02-27 18:00:00', '2026-02-27 20:00:00'),
(7, 3, 'bottle_service', 'pending', '2026-03-05 21:00:00', '2026-03-05 23:00:00'),
(7, 5, 'event_ticket', 'confirmed', '2026-03-15 20:00:00', '2026-03-15 23:30:00');