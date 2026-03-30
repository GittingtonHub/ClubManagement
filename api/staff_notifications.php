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
        $reservation_id = $input['reservation_id'] ?? null;

        if (!$reservation_id) {
            echo json_encode(['success' => false, 'message' => 'Missing reservation ID.']);
            exit;
        }

        try {
            // 1. Get the start time of the reservation
            $stmt = $conn->prepare("SELECT start_time FROM reservations WHERE reservation_id = :rid");
            $stmt->execute([':rid' => $reservation_id]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$res) {
                echo json_encode(['success' => false, 'message' => 'Reservation not found.']);
                exit;
            }

            // 2. Security Check: Is it too late? (e.g., less than 2 hours before)
            $startTime = strtotime($res['start_time']);
            $twoHoursFromNow = time() + (2 * 3600); // Current time + 2 hours

            if ($startTime < $twoHoursFromNow) {
                echo json_encode([
                    'success' => false, 
                    'message' => 'Too late to request removal. Shifts must be cancelled at least 2 hours in advance.'
                ]);
                exit;
            }

            // 3. Remove the staff member from the assignment
            // We use $user_id from the session to make sure they can only remove THEMSELVES
            $deleteSql = "DELETE FROM ReservationStaff 
                        WHERE reservation_id = :rid 
                        AND staff_id = (SELECT id FROM staff WHERE user_id = :uid)";
            $deleteStmt = $conn->prepare($deleteSql);
            $deleteStmt->execute([':rid' => $reservation_id, ':uid' => $user_id]);

            // 4. Notify Admins (Flow 2)
            // We insert a notification for all admin users
            $adminNotifSql = "INSERT INTO staff_notifications (staff_user_id, message) 
                            SELECT id, 'Staff member requested removal from Reservation #$reservation_id' 
                            FROM users WHERE role = 'admin'";
            $conn->query($adminNotifSql);

            echo json_encode(['success' => true, 'message' => 'You have been removed from this shift. Admins notified.']);
            
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error.']);
        }
        exit;
    }
    
}
?>