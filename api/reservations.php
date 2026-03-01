<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

session_start();

include_once 'api.php'; 

$method = $_SERVER['REQUEST_METHOD'];

// Handle preflight OPTIONS request for CORS
if ($method === 'OPTIONS') {
    exit;
}

// =============================
// 1. VIEW LOGIC (GET)
// =============================
if ($method === 'GET') {
    try {
        // Show only today + future reservations
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
        echo json_encode([
            'success' => false, 
            'message' => 'Unable to retrieve reservations.'
        ]);
    }
    exit;
}

// =============================
// 2. CREATE RESERVATION (POST)
// =============================
if ($method === 'POST') {

    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false, 
            'message' => 'You must be logged in to make a reservation.'
        ]);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);

    $user_id = $_SESSION['user_id'];
    $resource_id = $input['resource_id'] ?? null;
    $service_type = $input['service_type'] ?? null;
    $start_time = $input['start_time'] ?? null;
    $end_time = $input['end_time'] ?? null;

    // Required fields check
    if (!$resource_id || !$service_type || !$start_time || !$end_time) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'All required fields must be provided.'
        ]);
        exit;
    }

    // Validate service type
    $valid_services = ['bottle_service', 'event_ticket', 'bar'];
    if (!in_array($service_type, $valid_services)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid service type selected.'
        ]);
        exit;
    }

    // Validate time logic
    if (strtotime($end_time) <= strtotime($start_time)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'End time must be after start time.'
        ]);
        exit;
    }

    // Numeric validation
    if (isset($input['quantity']) && $input['quantity'] < 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Quantity cannot be negative.'
        ]);
        exit;
    }

    if (isset($input['minimum_spend']) && $input['minimum_spend'] < 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Minimum spend cannot be negative.'
        ]);
        exit;
    }

    try {
        // Conflict check
        $checkSql = "
            SELECT * FROM reservations 
            WHERE resource_id = :rid
            AND status != 'cancelled'
            AND NOT (end_time <= :start OR start_time >= :end)
        ";

        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->execute([
            ':rid' => $resource_id,
            ':start' => $start_time,
            ':end' => $end_time
        ]);

        if ($checkStmt->rowCount() > 0) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'message' => 'This resource is already reserved during that time.'
            ]);
            exit;
        }

        // Insert reservation
        $insertSql = "
            INSERT INTO reservations 
            (user_id, resource_id, service_type, start_time, end_time) 
            VALUES (:uid, :rid, :service, :start, :end)
        ";

        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->execute([
            ':uid' => $user_id,
            ':rid' => $resource_id,
            ':service' => $service_type,
            ':start' => $start_time,
            ':end' => $end_time
        ]);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Reservation submitted successfully.'
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Unable to save reservation.'
        ]);
    }

    exit;
}