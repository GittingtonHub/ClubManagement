<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    exit;
}

if ($method === 'GET') {
    $event_id = $_GET['event_id'] ?? null;
    if (!$event_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'event_id is required.']);
        exit;
    }

    try {
        // Fetch staff details for a specific event
        $query = "SELECT s.id, s.name, s.role, s.hourly_rate 
                  FROM staff s 
                  JOIN EventStaff es ON s.id = es.staff_id 
                  WHERE es.event_id = :event_id";
        $stmt = $conn->prepare($query);
        $stmt->execute([':event_id' => $event_id]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to fetch event staff.', 'error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        // Just link the IDs in the Many-to-Many table
        $insert = "INSERT INTO EventStaff (event_id, staff_id) VALUES (:event_id, :staff_id)";
        $stmt = $conn->prepare($insert);
        $stmt->execute([
            ':event_id' => $input['event_id'] ?? null,
            ':staff_id' => $input['staff_id'] ?? null
        ]);

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Staff assigned to event successfully.']);

        $userLookup = $conn->prepare("SELECT user_id FROM staff WHERE id = :sid");
        $userLookup->execute([':sid' => $input['staff_id']]);
        $staffUser = $userLookup->fetch(PDO::FETCH_ASSOC);

        if ($staffUser && $staffUser['user_id']) {
            $notifSql = "INSERT INTO staff_notifications (staff_user_id, event_id, message) 
                        VALUES (:suid, :eid, :msg)";
            $conn->prepare($notifSql)->execute([
                ':suid' => $staffUser['user_id'],
                ':eid' => $input['event_id'],
                ':msg' => "You have been manually assigned to work an upcoming Event."
            ]);
        }

    } catch (PDOException $e) {
        // Catch duplicate assignment errors gracefully
        if ($e->getCode() == 23000) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Staff member is already assigned to this event.']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Unable to assign staff.', 'error' => $e->getMessage()]);
        }
    }
    exit;
}

if ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $event_id = $input['event_id'] ?? null;
    $staff_id = $input['staff_id'] ?? null;

    if (!$event_id || !$staff_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'event_id and staff_id are required.']);
        exit;
    }

    try {
        $delete = $conn->prepare("DELETE FROM EventStaff WHERE event_id = :event_id AND staff_id = :staff_id");
        $delete->execute([
            ':event_id' => $event_id,
            ':staff_id' => $staff_id
        ]);
        echo json_encode(['success' => true, 'message' => 'Staff assignment removed.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to remove staff assignment.', 'error' => $e->getMessage()]);
    }
    exit;
}
?>