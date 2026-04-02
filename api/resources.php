<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';
session_start();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    exit;
}

// ✅ GET (exclude removed)
if ($method === 'GET') {
    try {
        $query = "SELECT id, name, price, description 
                  FROM resources 
                  WHERE removed = 0 OR removed IS NULL";

        $stmt = $conn->prepare($query);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($data);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to fetch resources.']);
    }
    exit;
}

// ✅ SOFT DELETE
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    $adminId = $_SESSION['user_id'] ?? null;

    if (!$id || !$adminId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid request.']);
        exit;
    }

    try {
        $update = $conn->prepare("
            UPDATE resources 
            SET removed = 1, removed_by_user_id = :admin_id 
            WHERE id = :id
        ");
        $update->execute([
            ':id' => $id,
            ':admin_id' => $adminId
        ]);

        if ($update->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Resource not found.']);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'Resource removed.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to remove resource.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
?>