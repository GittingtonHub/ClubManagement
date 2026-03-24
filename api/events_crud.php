<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

require_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
    exit;
}

if ($method === 'GET') {
    try {
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $conn->prepare("SELECT * FROM events WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $stmt = $conn->prepare("SELECT * FROM events ORDER BY event_date ASC");
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        echo json_encode(['success' => true, 'data' => $data]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to fetch events.']);
    }
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        $insert = "INSERT INTO events (event_name, event_date, location, placeholder_feature_1, placeholder_feature_2) 
                   VALUES (:name, :date, :location, :feat1, :feat2)";
        $stmt = $conn->prepare($insert);
        $stmt->execute([
            ':name' => $input['name'] ?? '',
            ':date' => $input['date'] ?? '',
            ':location' => $input['location'] ?? '',
            ':feat1' => $input['feat1'] ?? '',
            ':feat2' => $input['feat2'] ?? ''
        ]);

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Event created successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to create event.']);
    }
    exit;
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    try {
        $update = "UPDATE events SET event_name = :name, event_date = :date, location = :location, placeholder_feature_1 = :feat1 
                   WHERE id = :id";
        $stmt = $conn->prepare($update);
        $stmt->execute([
            ':name' => $input['name'] ?? '',
            ':date' => $input['date'] ?? '',
            ':location' => $input['location'] ?? '',
            ':feat1' => $input['feat1'] ?? '',
            ':id' => $input['id'] ?? null
        ]);

        echo json_encode(['success' => true, 'message' => 'Event updated successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to update event.']);
    }
    exit;
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id is required.']);
        exit;
    }

    try {
        $delete = $conn->prepare("DELETE FROM events WHERE id = :id");
        $delete->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Event deleted.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to delete event.']);
    }
    exit;
}

?>
