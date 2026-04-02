<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json; charset=UTF-8");
include_once 'api.php';

// 1. MUST BE LOGGED IN & BE AN ADMIN
if (!isset($_SESSION['user']) || !isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied. Admins only.']);
    exit;
}

// Read JSON input
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No user ID provided.']);
    exit;
}

$userToDelete = $data['id'];
$adminId = $_SESSION['user_id'];

try {
    // Prevent admin from removing themselves
    if ($userToDelete == $adminId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'You cannot remove your own admin account.']);
        exit;
    }

    // SOFT DELETE (Sprint 5)
    $query = "UPDATE users 
              SET removed = 1, removed_by_user_id = :admin_id 
              WHERE id = :id";

    $stmt = $conn->prepare($query);
    $stmt->execute([
        ':id' => $userToDelete,
        ':admin_id' => $adminId
    ]);

    echo json_encode(['success' => true, 'message' => 'User successfully removed.']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to remove user.']);
}
?>