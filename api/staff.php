<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';
session_start();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    exit;
}

if ($method === 'GET') {
    try {
        // ❗ exclude removed staff
        $query = "SELECT id, name, role, hourly_rate 
                  FROM staff 
                  WHERE removed = 0 
                  ORDER BY id ASC";

        $stmt = $conn->prepare($query);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($data);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to fetch staff.']);
    }
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $name = trim($input['name'] ?? '');
    $role = trim($input['role'] ?? '');
    $hourly_rate = $input['hourly_rate'] ?? null;

    if ($name === '' || $role === '' || $hourly_rate === null || $hourly_rate === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'name, role, and hourly_rate are required.']);
        exit;
    }

    if (!is_numeric($hourly_rate) || (float)$hourly_rate < 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'hourly_rate must be a non-negative number.']);
        exit;
    }

    try {
        $insert = "INSERT INTO staff (name, role, hourly_rate, employment_type)
                   VALUES (:name, :role, :hourly_rate, 'part_time')";
        $stmt = $conn->prepare($insert);
        $stmt->execute([
            ':name' => $name,
            ':role' => $role,
            ':hourly_rate' => $hourly_rate
        ]);

        $staffId = (int)$conn->lastInsertId();
        $select = $conn->prepare("SELECT id, name, role, hourly_rate FROM staff WHERE id = :id");
        $select->execute([':id' => $staffId]);
        $staff = $select->fetch(PDO::FETCH_ASSOC);

        http_response_code(201);
        echo json_encode(['success' => true, 'staff' => $staff]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to add staff.']);
    }
    exit;
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    $adminId = $_SESSION['user_id'] ?? null;

    if (!$id || !$adminId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid request.']);
        exit;
    }

    try {
        // ✅ SOFT DELETE
        $update = $conn->prepare("
            UPDATE staff 
            SET removed = 1, removed_by_user_id = :admin_id 
            WHERE id = :id
        ");
        $update->execute([
            ':id' => $id,
            ':admin_id' => $adminId
        ]);

        if ($update->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Staff member not found.']);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'Staff member removed.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to remove staff.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
?>