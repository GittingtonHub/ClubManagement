USE ClubManagementDB;

INSERT INTO rooms (name, capacity, location) VALUES
('Main Dance Floor', 300, 'First Floor'),
('VIP Lounge', 50, 'Second Floor'),
('Private Room A', 20, 'Back Wing');

INSERT INTO resources (name, type, price, description) VALUES
('Open Bar Package', 'Open Bar', 2500.00, 'Unlimited drinks for event'),
('Bottle Service', 'Bottle Service', 500.00, 'Premium bottle service'),
('Event Ticket', 'Ticket', 50.00, 'General admission ticket');

INSERT INTO staff (name, role, hourly_rate) VALUES
('Alex Rivera', 'Bartender', 25.00),
('DJ Nova', 'DJ', 60.00),
('Marcus Lee', 'Security', 22.00);
