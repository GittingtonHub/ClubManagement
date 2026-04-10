<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    exit;
}

if ($method === 'GET') {
    try {
        $event_id = $_GET['event_id'] ?? null;
        
        if ($event_id) {
            // Check for specific event, making sure it isn't cancelled
            $stmt = $conn->prepare("SELECT * FROM events WHERE event_id = :event_id AND status = 'active'");
            $stmt->execute([':event_id' => $event_id]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            // Base query with JOIN to tickets, ONLY pulling 'active' events
            $sql = "SELECT DISTINCT e.* FROM events e 
                    LEFT JOIN tickets t ON e.event_id = t.event_id 
                    WHERE e.status = 'active'"; 
            $params = [];

            // Add dynamic filters if the query parameters exist
            if (!empty($_GET['performer'])) {
                $sql .= " AND e.performer LIKE :performer";
                $params[':performer'] = "%" . $_GET['performer'] . "%";
            }
            if (!empty($_GET['date'])) {
                $sql .= " AND DATE(e.`start`) = :date"; // Note: Ensure your column is actually `start` or `start_time`
                $params[':date'] = $_GET['date'];
            }
            if (!empty($_GET['price'])) {
                $sql .= " AND t.price <= :price"; 
                $params[':price'] = $_GET['price'];
            }

            $sql .= " ORDER BY e.`start` ASC";
            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
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

    // prevent  scheduling events in the past
    $start_time = $input['start'] ?? '';
    if (!empty($start_time)) {
        $event_start = strtotime($start_time);
        if ($event_start && $event_start < time()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Events cannot be scheduled in the past.']);
            exit;
        }
    }

    try {
        // Backticks required around `start` and `end`
        $insert = "INSERT INTO events (title, description, `start`, `end`, qty_tickets, performer) 
                   VALUES (:title, :description, :start, :end, :qty_tickets, :performer)";
        $stmt = $conn->prepare($insert);
        $stmt->execute([
            ':title' => $input['title'] ?? '',
            ':description' => $input['description'] ?? null,
            ':start' => $input['start'] ?? '',
            ':end' => $input['end'] ?? '',
            ':qty_tickets' => $input['qty_tickets'] ?? 0,
            ':performer' => $input['performer'] ?? null
        ]);
        $event_id = $conn->lastInsertId();

        $ticket_qty = $input['qty_tickets'] ?? 0;
        if ($ticket_qty > 0) {
            $ticketSql = "INSERT INTO tickets (event_id, ticket_tier, quantity) VALUES (:eid, 'GA', :qty)";
            $ticketStmt = $conn->prepare($ticketSql);
            $ticketStmt->execute([
                ':eid' => $event_id,
                ':qty' => $ticket_qty
            ]);
        }

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Event created successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to create event.', 'error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);

    //prevent editing an event from the past 
    $start_time = $input['start'] ?? '';
    if (!empty($start_time)) {
        $event_start = strtotime($start_time);
        if ($event_start && $event_start < time()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Events cannot be rescheduled to the past.']);
            exit;
        }
    }

    try {
        $update = "UPDATE events SET title = :title, description = :description, `start` = :start, `end` = :end, qty_tickets = :qty_tickets, performer = :performer 
                   WHERE event_id = :event_id";
        $stmt = $conn->prepare($update);
        $stmt->execute([
            ':title' => $input['title'] ?? '',
            ':description' => $input['description'] ?? null,
            ':start' => $input['start'] ?? '',
            ':end' => $input['end'] ?? '',
            ':qty_tickets' => $input['qty_tickets'] ?? 0,
            ':performer' => $input['performer'] ?? null,
            ':event_id' => $input['event_id'] ?? null
        ]);

        echo json_encode(['success' => true, 'message' => 'Event updated successfully.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to update event.', 'error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'DELETE') {
    $event_id = $_GET['event_id'] ?? null;
    if (!$event_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'event_id is required.']);
        exit;
    }

    try {
        // SOFT DELETE EVENT
        $update = $conn->prepare("
            UPDATE events 
            SET removed = 1, removed_by_user_id = :admin_id 
            WHERE event_id = :event_id
        ");
        $update->execute([
            ':event_id' => $event_id,
            ':admin_id' => $adminId
        ]);

        echo json_encode(['success' => true, 'message' => 'Event removed.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to remove event.']);
    }
    exit;
}
?>