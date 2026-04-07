<?php

session_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, DELETE, OPTIONS");

include_once 'api.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// 1. MUST BE LOGGED IN
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit;
}

// 2. MUST BE AN ADMIN
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied. Admins only.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    // Determine if the column is 'role' or 'privilege'
    $columnsStmt = $conn->query("SHOW COLUMNS FROM users");
    $columns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN, 0);
    $roleExpression = in_array('role', $columns, true)
        ? 'role'
        : (in_array('privilege', $columns, true) ? 'privilege' : 'NULL');

    // --- GET METHOD: Fetch only active users ---
    if ($method === 'GET') {
        // We add WHERE removed = 0 so "deleted" users don't show up in the list
        $query = "SELECT id, email, {$roleExpression} AS role, created_at FROM users WHERE removed = 0";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($data);
    } 

    // --- DELETE METHOD: Perform Soft Delete ---
    else if ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'User ID is required']);
            exit;
        }

        // Instead of DELETE FROM users, we just mark them as removed
        $query = "UPDATE users SET removed = 1 WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->execute([':id' => $id]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'User marked as removed']);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User not found']);
        }
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
