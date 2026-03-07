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

// Read the incoming JSON data from React
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No user ID provided.']);
    exit;
}

$userToDelete = $data['id'];

try {
    // Prevent the admin from accidentally deleting themselves!
    if ($userToDelete == $_SESSION['user_id']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'You cannot delete your own admin account.']);
        exit;
    }

    $query = "DELETE FROM users WHERE id = :id";
    $stmt = $conn->prepare($query);
    $stmt->execute([':id' => $userToDelete]);

    echo json_encode(['success' => true, 'message' => 'User successfully deleted.']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to delete user.']);
}
?>