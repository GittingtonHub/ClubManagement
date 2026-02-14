<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

include_once 'api.php';

try {
    $stmt = $conn->prepare("SELECT DISTINCT event_id FROM ticket_reservations ORDER BY event_id");
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($data);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Query failed: ' . $e->getMessage()]);
}
?>
