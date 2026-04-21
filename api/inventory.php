<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    exit;
}

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if ($authHeader && preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
    $sessionToken = trim($matches[1]);
    if ($sessionToken !== '') {
        session_id($sessionToken);
    }
}

session_start();

if (!isset($_SESSION['user_id']) && isset($_SESSION['user']['id'])) {
    $_SESSION['user_id'] = $_SESSION['user']['id'];
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized: you must log in first']);
    exit;
}

$userRole = $_SESSION['user']['role'] ?? null;
$userPrivilege = $_SESSION['user']['privilege'] ?? null;
$isAdmin = ($userRole === 'admin' || $userPrivilege === 'admin');

if (in_array($method, ['POST', 'PUT', 'DELETE'], true) && !$isAdmin) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden: Admins only']);
    exit;
}





if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Get JSON input
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID required']);
        exit;
    }

    try {
        $sqlDelete = "DELETE FROM resources WHERE id = :id";
        $stmt = $conn->prepare($sqlDelete);
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        echo json_encode(['success' => true, 'message' => 'Item deleted']);
    } catch (PDOException $e) {
        $FOREIGN_KEY_VIOLATION = '23000';
        if ($e->getCode() == $FOREIGN_KEY_VIOLATION) {
            http_response_code(409); // 409 Conflict
            echo json_encode(['success' => false, 'message' => 'Cannot delete this resource because it has active reservations.']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        }
    }
    // exit after handling DELETE request so it doesnt also run the GET code below
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    $name = $input['name'] ?? null;
    $type = $input['type'] ?? null;
    $price = $input['price'] ?? null;
    $description = $input['description'] ?? null;

    if (!$name || !$type || $price === null || $price === "" || !$description) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All fields required']);
        exit;
    }

    $sqlInsert = "INSERT INTO resources (name, type, price, description) VALUES (:name, :type, :price, :description)";
    $stmt = $conn->prepare($sqlInsert);
    $stmt->bindParam(':name', $name); 
    $stmt->bindParam(':type', $type);
    $stmt->bindParam(':price', $price);
    $stmt->bindParam(':description', $description);
    $stmt->execute();

    $newId = $conn->lastInsertId();

    echo json_encode([
        'success' => true,
        'item' => [
            'id' => $newId,
            'name' => $name,
            'type' => $type,
            'price' => $price,
            'description' => $description
        ]
    ]);
} else {
    // GET request - return all resources
    $query = "SELECT id, name, type, price, description FROM resources";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($data);
}
