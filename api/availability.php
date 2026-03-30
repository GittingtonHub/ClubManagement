<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') exit;

session_start();

// Security check to ensure only logged-in users can view staff schedules
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
    exit;
}

if ($method === 'GET') {
    // If the frontend passes a specific staff_id, return only their availability. 
    // Otherwise, return everyone's availability.
    $staff_id = $_GET['staff_id'] ?? null;

    try {
        $sql = "SELECT * FROM availability";
        $params = [];

        if ($staff_id) {
            $sql .= " WHERE staff_id = :staff_id";
            $params[':staff_id'] = $staff_id;
        }

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $availability = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $availability]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);

    try {
        $sql = "INSERT INTO availability (staff_id, resource_id, start_time, end_time, is_available)
                VALUES (:staff_id, :resource_id, :start_time, :end_time, :is_available)";

        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ":staff_id" => $input["staff_id"],
            ":resource_id" => $input["resource_id"] ?? null,
            ":start_time" => $input["start_time"],
            ":end_time" => $input["end_time"],
            ":is_available" => $input["is_available"] ?? 1
        ]);

        echo json_encode(["success" => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit;
}
?>