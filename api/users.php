<?php
// check if the user is logged in
session_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit;
}

try {
    // Support both schemas: some environments use `role`, others use `privilege`.
    $columnsStmt = $conn->query("SHOW COLUMNS FROM users");
    $columns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN, 0);
    $roleExpression = in_array('role', $columns, true)
        ? 'role'
        : (in_array('privilege', $columns, true) ? 'privilege' : 'NULL');

    $query = "SELECT id, email, {$roleExpression} AS role, created_at FROM users";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($data);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to fetch users.'
    ]);
}
?>
