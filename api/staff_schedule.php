<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') exit;

session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
    exit;
}

// We need the staff.id that belongs to this logged-in users.id
$user_id = $_SESSION['user_id'];

try {
    // 1. Find the staff ID for this user
    $staffStmt = $conn->prepare("SELECT id FROM staff WHERE user_id = :uid");
    $staffStmt->execute([':uid' => $user_id]);
    $staffRecord = $staffStmt->fetch(PDO::FETCH_ASSOC);

    if (!$staffRecord) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No staff profile linked to this user.']);
        exit;
    }

    $staff_id = $staffRecord['id'];

    // 2. Get their Reservations
    $resSql = "SELECT r.*, res.name AS resource_name 
               FROM reservations r
               JOIN resources res ON r.resource_id = res.id
               JOIN ReservationStaff rs ON r.reservation_id = rs.reservation_id
               WHERE rs.staff_id = :staff_id
               ORDER BY r.start_time ASC";
    $resStmt = $conn->prepare($resSql);
    $resStmt->execute([':staff_id' => $staff_id]);
    $reservations = $resStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Get their Events
    $eventSql = "SELECT e.* FROM events e
                 JOIN EventStaff es ON e.event_id = es.event_id
                 WHERE es.staff_id = :staff_id
                 ORDER BY e.start ASC";
    $eventStmt = $conn->prepare($eventSql);
    $eventStmt->execute([':staff_id' => $staff_id]);
    $events = $eventStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'schedule' => [
            'reservations' => $reservations,
            'events' => $events
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error.']);
}
?>