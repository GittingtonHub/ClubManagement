<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

// Admin Security Check
$sessionRole = $_SESSION['user']['role'] ?? ($_SESSION['user']['privilege'] ?? 'user');
if (!isset($_SESSION['user_id']) || $sessionRole !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $user_id = filter_var($input['user_id'] ?? 0, FILTER_VALIDATE_INT);
    $name = substr(trim($input['name'] ?? ''), 0, 100);
    $role = trim($input['role'] ?? '');
    $rate = filter_var($input['hourly_rate'] ?? -1, FILTER_VALIDATE_FLOAT);

    if ($user_id <= 0 || empty($name) || empty($role) || $rate < 0 || $rate > 999.99) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid input data']);
        exit;
    }

    try {
        $conn->beginTransaction();

        // UPSERT Logic
        $check = $conn->prepare("SELECT id FROM staff WHERE user_id = :uid");
        $check->execute([':uid' => $user_id]);

        if ($check->fetch()) {
            $sql = "UPDATE staff SET name = :name, role = :role, hourly_rate = :rate, removed = 0 WHERE user_id = :uid";
            $stmt = $conn->prepare($sql);
            $stmt->execute([':name' => $name, ':role' => $role, ':rate' => $rate, ':uid' => $user_id]);
        } else {
            $sql = "INSERT INTO staff (user_id, name, role, hourly_rate, employment_type, removed) 
                    VALUES (:uid, :name, :role, :rate, 'part_time', 0)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([':uid' => $user_id, ':name' => $name, ':role' => $role, ':rate' => $rate]);
        }

        $conn->commit();
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'DB Error']);
    }
    exit;
}