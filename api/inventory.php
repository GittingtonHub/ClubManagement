<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

include_once 'api.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    $name = $input['name'] ?? null;
    $type = $input['type'] ?? null;
    $price = $input['price'] ?? null;
    $description = $input['description'] ?? null;
    
    if (!$name || !$type || !$price || !$description) {
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
?>