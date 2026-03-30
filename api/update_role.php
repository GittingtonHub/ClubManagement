<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: PUT, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') exit;

session_start();
// 🔒 SECURITY: Must be logged in AND be an admin
$sessionRole = $_SESSION['user']['role'] ?? ($_SESSION['user']['privilege'] ?? 'user');
if (!isset($_SESSION['user_id']) || $sessionRole !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden: Admins only.']);
    exit;
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $target_user_id = $input['user_id'] ?? null;
    $new_role = $input['new_role'] ?? null;

    $allowedRoles = ['user', 'admin', 'staff'];

    if (!$target_user_id || !in_array($new_role, $allowedRoles)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Valid user_id and new_role are required.']);
        exit;
    }

    try {
        // Update both privilege and role columns just to be safe with your schema
        $sql = "UPDATE users SET privilege = :role, role = :role WHERE id = :uid";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':role' => $new_role,
            ':uid' => $target_user_id
        ]);

        echo json_encode(['success' => true, 'message' => "User role updated to $new_role."]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error updating role.']);
    }
}
?>