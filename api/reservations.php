<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
include_once 'api.php'; 

$method = $_SERVER['REQUEST_METHOD'];

// Handle preflight OPTIONS request for CORS
if ($method === 'OPTIONS') {
    exit;
}

// --- 1. VIEW LOGIC (GET) ---
if ($method === 'GET') {
    try {
        // Including resource_id so the Scheduler knows which row to draw the event in
        $sql = "
            SELECT r.*, u.email
            FROM reservations r
            JOIN users u ON r.user_id = u.id
            WHERE r.end_time >= NOW()
            ORDER BY r.start_time ASC
        ";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($data);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $e->getMessage()]);
    }
    exit;
}

// --- 2. SUBMIT & VALIDATION LOGIC (POST) ---
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $user_id = $input['user_id'] ?? null;
    $resource_id = $input['resource_id'] ?? null; // Added this
    $service_type = $input['service_type'] ?? null;
    $start_time = $input['start_time'] ?? null;
    $end_time = $input['end_time'] ?? null;

    // Updated Validation: Added $resource_id to the check
    if (!$user_id || !$resource_id || !$service_type || !$start_time || !$end_time) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'message' => 'All fields are required (including resource_id).',
            'debug_received' => $input // This helps you see exactly what reached the server
        ]);
        exit;
    }

    // Validation: Valid Service Type (Matches your ENUM)
    $valid_services = ['bottle_service', 'event_ticket', 'bar'];
    if (!in_array($service_type, $valid_services)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid service type selected: ' . $service_type]);
        exit;
    }

    try {
        // --- CONFLICT CHECK ---
        // Checks if this specific resource (row) is already booked at this time
        $checkSql = "SELECT * FROM reservations 
                     WHERE resource_id = :rid 
                     AND status != 'cancelled'
                     AND NOT (end_time <= :start OR start_time >= :end)";
        
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->execute([
            ':rid' => $resource_id,
            ':start' => $start_time,
            ':end' => $end_time
        ]);

        if ($checkStmt->rowCount() > 0) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'This resource is already reserved during this time.']);
            exit;
        }

        // --- INSERT ---
        // Added resource_id to the insert query
        $insertSql = "INSERT INTO reservations (user_id, resource_id, service_type, start_time, end_time) 
                      VALUES (:uid, :rid, :service, :start, :end)";
        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->execute([
            ':uid' => $user_id,
            ':rid' => $resource_id,
            ':service' => $service_type,
            ':start' => $start_time,
            ':end' => $end_time
        ]);

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Reservation submitted successfully!']);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}