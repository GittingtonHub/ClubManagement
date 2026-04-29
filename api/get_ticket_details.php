<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Include your API helper/database connection
// Removed 'return' so the script continues to the code below
include_once __DIR__ . '/api.php'; 

session_start();

// 1. Check if they are actually logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401); // 401 means "Unauthorized"
    echo json_encode(["error" => "You must be logged in to view this receipt."]);
    exit;
}

$user_id = $_SESSION['user_id'];
$id = isset($_GET['id']) ? $_GET['id'] : null;

if ($id) {
    try {
        // 3. Query the database
        // Note: Ensure $conn is the variable name used inside api.php
        $query = "SELECT t.id, t.status, e.event_name, e.price, e.event_date 
                  FROM tickets t 
                  JOIN events e ON t.event_id = e.id 
                  WHERE t.id = :id LIMIT 1";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($ticket) {
            echo json_encode($ticket);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Ticket not found"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(["error" => "No ID provided"]);
}
?>