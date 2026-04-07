<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"); // Added PUT
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    exit;
}

// --- 1. GET: Fetch only active staff ---
if ($method === 'GET') {
    try {
        // Filter out anyone where removed = 1
        $query = "SELECT id, name, role, hourly_rate FROM staff WHERE removed = 0 ORDER BY id ASC";
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

// --- 2. POST: Create Staff ---
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

    try {
        $insert = "INSERT INTO staff (name, role, hourly_rate, employment_type) VALUES (:name, :role, :hourly_rate, 'part_time')";
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

// --- 3. PUT: Update Staff (Role and Rate) ---
if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? null;
    $role = trim($input['role'] ?? '');
    $hourly_rate = $input['hourly_rate'] ?? null;

    if (!$id || $role === '' || $hourly_rate === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id, role, and hourly_rate are required for updates.']);
        exit;
    }

    try {
        $update = "UPDATE staff SET role = :role, hourly_rate = :hourly_rate WHERE id = :id";
        $stmt = $conn->prepare($update);
        $stmt->execute([
            ':role' => $role,
            ':hourly_rate' => $hourly_rate,
            ':id' => $id
        ]);

        echo json_encode(['success' => true, 'message' => 'Staff member updated successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to update staff.']);
    }
    exit;
}

// --- 4. DELETE: Soft Delete ---
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id is required.']);
        exit;
    }

    try {
        // Switch from Hard Delete to Soft Delete
        $delete = $conn->prepare("UPDATE staff SET removed = 1 WHERE id = :id");
        $delete->execute([':id' => $id]);

        if ($delete->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Staff member not found.']);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'Staff member marked as removed.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to remove staff.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
?>