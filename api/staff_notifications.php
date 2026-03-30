<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, PUT, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') exit;

session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    exit;
}
$user_id = $_SESSION['user_id'];

// this API will handle staff notifications, such as new event assignments or reservation changes? 
// is this how we currently want to handle notifications, or will it be handled primarlily through frontend and backend logic without a dedicated table?

if ($method === 'GET') {
    // Fetch unread notifications
    try {
        $sql = "SELECT * FROM staff_notifications WHERE staff_user_id = :uid AND is_read = 0 ORDER BY created_at DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute([':uid' => $user_id]);
        echo json_encode(['success' => true, 'notifications' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        http_response_code(500);
    }
}

if ($method === 'PUT') {
    // Mark a notification as read
    $input = json_decode(file_get_contents('php://input'), true);
    $notif_id = $input['notification_id'] ?? null;

    try {
        $sql = "UPDATE staff_notifications SET is_read = 1 WHERE id = :nid AND staff_user_id = :uid";
        $stmt = $conn->prepare($sql);
        $stmt->execute([':nid' => $notif_id, ':uid' => $user_id]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
    }
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? null;

    if ($action === 'request_removal') {
        // =========================================================
        // TODO: IMPLEMENT "REQUEST TO BE REMOVED" LOGIC HERE
        // 1. Get the reservation_id or event_id from $input
        // 2. Check if it's too close to the start time (e.g., < 24 hours) 10 minutes before the event/reservation start
        // 3. If allowed, insert a notification for ADMINS to review, 
        //    OR automatically delete them from ReservationStaff and 
        //    trigger a re-assignment function.
        // =========================================================
        echo json_encode(['success' => true, 'message' => 'Removal request pending.']);
        exit;
    }
}
?>