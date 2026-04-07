<?php
// to call this in front-end: http://167.99.165.60/api/resources.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");


include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'];


if($method === 'OPTIONS') {
    exit;
}

if($method === 'GET') {
    try{
        // For GET requests, we will return the list of resources
        $query = "SELECT id,name,price,description FROM resources  Where removed = 0";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to fetch resources.']);
        exit;
    }
}

if($method === 'POST'){
    $input = json_decode(file_get_contents('php://input'), true);
    $name = trim($input['name'] ?? '');

    if($name === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Resource name is required.']);
        exit;
    }

    try{
        $query = "INSERT INTO resources (name, description,price, removed) VALUES (:name, :description, :price, 0)";
        $stmt = $conn->prepare($query);
        $stmt->execute([
            ':name' => $name,
            ':description' => trim($input['description'] ?? ''),
            ':price' => $input['price'] ?? 0
        ]);
        echo json_encode(['success' => true, 'message' => 'Resource created successfully.']);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to create resource.']);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        exit;
    }
}


if($method === 'DELETE') {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Resource ID is required']);
        exit;
    }

    try {
        // Instead of DELETE FROM resources, we just mark them as removed
        $query = "UPDATE resources SET removed = 1 WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Resource marked as deleted successfully.']);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to delete resource.']);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        exit;
    }
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);

?>
