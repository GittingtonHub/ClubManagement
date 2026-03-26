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
        $query = "SELECT s.id, s.name, s.role, es.role_placeholder 
                  FROM staff s 
                  JOIN event_staff es ON s.id = es.staff_id 
                  WHERE es.event_id = :event_id";
        $stmt = $conn->prepare($query);
        $stmt->execute([':event_id' => $event_id]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to fetch event staff.']);
    }
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        $insert = "INSERT INTO event_staff (event_id, staff_id, role_placeholder) VALUES (:event_id, :staff_id, :role)";
        $stmt = $conn->prepare($insert);
        $stmt->execute([
            ':event_id' => $input['event_id'] ?? null,
            ':staff_id' => $input['staff_id'] ?? null,
            ':role' => $input['role'] ?? ''
        ]);

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Staff assigned to event successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to assign staff.']);
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
        $delete = $conn->prepare("DELETE FROM event_staff WHERE event_id = :event_id AND staff_id = :staff_id");
        $delete->execute([
            ':event_id' => $event_id,
            ':staff_id' => $staff_id
        ]);
        echo json_encode(['success' => true, 'message' => 'Staff assignment removed.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to remove staff assignment.']);
    }
    exit;
}
?>