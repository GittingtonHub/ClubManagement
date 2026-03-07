<?php
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if ($authHeader && preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
    $sessionToken = trim($matches[1]);
    if ($sessionToken !== '') {
        session_id($sessionToken);
    }
}
session_start();
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
include_once 'api.php'; 



$method = $_SERVER['REQUEST_METHOD'];

// Handle preflight OPTIONS request for CORS
if ($method === 'OPTIONS') {
    exit;
}

// =============================
// 1. VIEW LOGIC (GET)
// =============================
if ($method === 'GET') {
    try {
        // Include resource info for scheduler mapping and display
        $sql = "SELECT r.*, 
                       res.name AS resource_name, 
                       res.type AS resource_type, 
                       res.description AS resource_description,
                       bs.section_number,
                       bs.guest_count,
                       bs.minimum_spend,
                       tr.event_id,
                       tr.ticket_tier,
                       tr.quantity
                FROM reservations r
                JOIN resources res ON r.resource_id = res.id
                LEFT JOIN bottle_service bs ON bs.reservation_id = r.reservation_id
                LEFT JOIN ticket_reservations tr ON tr.reservation_id = r.reservation_id
                Where res.user_id == 
                ORDER BY r.start_time ASC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        
        echo json_encode($data);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Unable to retrieve reservations.'
        ]);
    }
    exit;
}

// =============================
// 2. CREATE RESERVATION (POST)
// =============================
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = [];
    }

    $sessionRole = $_SESSION['user']['role'] ?? ($_SESSION['user']['privilege'] ?? 'user');
    if ($sessionRole === 'admin') {
        $user_id = $input['user_id'] ?? $_SESSION['user_id']; 
    } else {
        $user_id = $_SESSION['user_id'] ?? null; 
    }
    $resource_id = $input['resource_id'] ?? null; // Added this
    $service_type = $input['service_type'] ?? null;
    $start_time = $input['start_time'] ?? null;
    $end_time = $input['end_time'] ?? null;
    $section_number = $input['section_number'] ?? null;
    $guest_count = $input['guest_count'] ?? null;
    $minimum_spend = $input['minimum_spend'] ?? null;
    $event_id = $input['event_id'] ?? null;
    $ticket_tier = $input['ticket_tier'] ?? null;
    $quantity = $input['quantity'] ?? null;

    // Validate required fields except service_type (can be derived from resource)
    if (!$user_id || !$resource_id || !$start_time || !$end_time) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'message' => 'You must be logged in to make a reservation.'
        ]);
        exit;
    }
  
    // Ensure resource exists and service_type (if provided) matches resource name
    $resourceStmt = $conn->prepare("SELECT name, type, price FROM resources WHERE id = :rid");
    $resourceStmt->execute([':rid' => $resource_id]);
    $resource = $resourceStmt->fetch(PDO::FETCH_ASSOC);

    if (!$resource) {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'Invalid resource_id.']);
      exit;
    }

    // service_type defaults to resource name; if provided must match
    if (empty($service_type)) {
      $service_type = $resource['name'];
    } elseif ($service_type !== $resource['name']) {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'service_type must match resource name.']);
      exit;
    }

    // Validate timestamps only if provided
    if (!empty($start_time) || !empty($end_time)) {
      $timestampStart = strtotime($start_time ?? '');
      $timestampEnd   = strtotime($end_time ?? '');

      if (!$timestampStart || !$timestampEnd) {
          http_response_code(400);
          echo json_encode(['success' => false, 'message' => 'If provided, start_time and end_time must both be valid.']);
          exit;
      }

      if ($timestampStart >= $timestampEnd) {
          http_response_code(400);
          echo json_encode(['success' => false, 'message' => 'start_time must be before end_time.']);
          exit;
      }
    }

    

    try {
        $conn->beginTransaction();
        // --- CONFLICT CHECK ---
        // Checks if this specific resource (row) is already booked at this time
        $checkSql = "SELECT * FROM reservations 
                     WHERE resource_id = :rid 
                     AND status != 'cancelled'
                     AND NOT (end_time <= :start OR start_time >= :end)";
        
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->execute([
            ':rid' => $resource_id,
            ':start' => $start_time,
            ':end' => $end_time
        ]);

        if ($checkStmt->rowCount() > 0) {
            $conn->rollBack();
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'message' => 'This resource is already reserved during that time.'
            ]);
            exit;
        }

        // Added resource_id to the insert query
        $resource_name = $resource['name'];
        $resource_Type = $resource['type'];
        if ($resource_Type === 'Bottle Service') {
            
            // Your existing required fields check
            if (!$section_number || !$guest_count || !$minimum_spend) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Bottle service requires section_number, guest_count, and minimum_spend.']);
                exit;
            }
            // minimum spend validation based on resource type price
            $required_minimum = $resource['price'];
            if ($minimum_spend < $required_minimum) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => "The minimum spend for $resource_name is $$required_minimum."]);
                exit;
            }
        }
        $insertSql = "INSERT INTO reservations (user_id, resource_id, service_type, status, start_time, end_time)
                      VALUES (:uid, :rid, :service, 'pending', :start, :end)";
        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->execute([
            ':uid' => $user_id,
            ':rid' => $resource_id,
            ':service' => $service_type,
            ':start' => $start_time,
            ':end' => $end_time
        ]);

        $reservation_id = $conn->lastInsertId();

        if ($resource_name === 'Bottle Service Silver' || $resource_name === 'Bottle Service Gold') {
            if (!$section_number || !$guest_count || !$minimum_spend) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Bottle service requires section_number, guest_count, and minimum_spend.']);
                exit;
            }
            $childSql = "INSERT INTO bottle_service (reservation_id, section_number, guest_count, minimum_spend)
                         VALUES (:rid, :section, :guests, :min_spend)";
            $childStmt = $conn->prepare($childSql);
            $childStmt->execute([
                ':rid' => $reservation_id,
                ':section' => $section_number,
                ':guests' => $guest_count,
                ':min_spend' => $minimum_spend
            ]);
        } elseif ($resource_name === 'Event Ticket GA' || $resource_name === 'Event Ticket VIP') {
            if (!$event_id || !$ticket_tier || !$quantity) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Event ticket requires event_id, ticket_tier, and quantity.']);
                exit;
            }
            $childSql = "INSERT INTO ticket_reservations (reservation_id, event_id, ticket_tier, quantity)
                         VALUES (:rid, :event_id, :tier, :qty)";
            $childStmt = $conn->prepare($childSql);
            $childStmt->execute([
                ':rid' => $reservation_id,
                ':event_id' => $event_id,
                ':tier' => $ticket_tier,
                ':qty' => $quantity
            ]);
        }

        $conn->commit();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Reservation submitted successfully.'
        ]);

    } catch (PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Unable to save reservation.'
        ]);
    }

    exit;
}

// --- 3. UPDATE LOGIC (PUT) ---
if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);

    $reservation_id = $input['reservation_id'] ?? null;
    if (isset($_SESSION['user']) && $_SESSION['user']['role'] === 'admin') {
        $user_id = $input['user_id'] ?? $_SESSION['user_id']; 
    } else {
        $user_id = $_SESSION['user_id'] ?? null; 
    }
    $resource_id = $input['resource_id'] ?? null;
    $service_type = $input['service_type'] ?? null;
    $status = $input['status'] ?? null;
    $start_time = $input['start_time'] ?? null;
    $end_time = $input['end_time'] ?? null;
    $section_number = $input['section_number'] ?? null;
    $guest_count = $input['guest_count'] ?? null;
    $minimum_spend = $input['minimum_spend'] ?? null;
    $event_id = $input['event_id'] ?? null;
    $ticket_tier = $input['ticket_tier'] ?? null;
    $quantity = $input['quantity'] ?? null;

    if (!$reservation_id || !$user_id || !$resource_id || !$start_time || !$end_time || !$status) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'reservation_id, user_id, resource_id, status, start_time, and end_time are required.'
        ]);
        exit;
    }

    try {
        $conn->beginTransaction();

        $existsStmt = $conn->prepare("SELECT reservation_id FROM reservations WHERE reservation_id = :reservation_id");
        $existsStmt->execute([':reservation_id' => $reservation_id]);
        if (!$existsStmt->fetch(PDO::FETCH_ASSOC)) {
            $conn->rollBack();
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Reservation not found.']);
            exit;
        }

        $resourceStmt = $conn->prepare("SELECT name FROM resources WHERE id = :rid");
        $resourceStmt->execute([':rid' => $resource_id]);
        $resource = $resourceStmt->fetch(PDO::FETCH_ASSOC);
        if (!$resource) {
            $conn->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid resource_id.']);
            exit;
        }

        if (!$service_type) {
            $service_type = $resource['name'];
        } elseif ($service_type !== $resource['name']) {
            $conn->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'service_type must match resource name.']);
            exit;
        }

        $checkSql = "SELECT reservation_id
                     FROM reservations
                     WHERE resource_id = :rid
                     AND reservation_id <> :reservation_id
                     AND status != 'cancelled'
                     AND NOT (end_time <= :start OR start_time >= :end)";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->execute([
            ':rid' => $resource_id,
            ':reservation_id' => $reservation_id,
            ':start' => $start_time,
            ':end' => $end_time
        ]);

        if ($checkStmt->rowCount() > 0) {
            $conn->rollBack();
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'This resource is already reserved during this time.']);
            exit;
        }

        $updateSql = "UPDATE reservations
                      SET user_id = :uid,
                          resource_id = :rid,
                          service_type = :service,
                          status = :status,
                          start_time = :start,
                          end_time = :end
                      WHERE reservation_id = :reservation_id";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->execute([
            ':uid' => $user_id,
            ':rid' => $resource_id,
            ':service' => $service_type,
            ':status' => $status,
            ':start' => $start_time,
            ':end' => $end_time,
            ':reservation_id' => $reservation_id
        ]);

        $resource_Type = $resource['type'];
        if ($resource_Type === 'Bottle Service') {
            if (!$section_number || !$guest_count || !$minimum_spend) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Bottle service requires section_number, guest_count, and minimum_spend.']);
                exit;
            }

            $required_minimum = $resource['price']; 
            
            if ($minimum_spend < $required_minimum) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => "The minimum spend for " . $resource['name'] . " is $" . $required_minimum . "."]);
                exit;
            }
            $conn->prepare("DELETE FROM ticket_reservations WHERE reservation_id = :rid")
                 ->execute([':rid' => $reservation_id]);
        } elseif ($resource_name === 'Event Ticket GA' || $resource_name === 'Event Ticket VIP') {
            if (!$event_id || !$ticket_tier || !$quantity) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Event ticket requires event_id, ticket_tier, and quantity.']);
                exit;
            }
            $childSql = "INSERT INTO ticket_reservations (reservation_id, event_id, ticket_tier, quantity)
                         VALUES (:rid, :event_id, :tier, :qty)
                         ON DUPLICATE KEY UPDATE
                            event_id = VALUES(event_id),
                            ticket_tier = VALUES(ticket_tier),
                            quantity = VALUES(quantity)";
            $childStmt = $conn->prepare($childSql);
            $childStmt->execute([
                ':rid' => $reservation_id,
                ':event_id' => $event_id,
                ':tier' => $ticket_tier,
                ':qty' => $quantity
            ]);

            $conn->prepare("DELETE FROM bottle_service WHERE reservation_id = :rid")
                 ->execute([':rid' => $reservation_id]);
        }

        $conn->commit();

        echo json_encode(['success' => true, 'message' => 'Reservation updated successfully.']);
    } catch (PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

// --- 4. DELETE LOGIC (DELETE) ---
if ($method === 'DELETE') {
    $reservation_id = $_GET['id'] ?? null;

    if (!$reservation_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing reservation id.']);
        exit;
    }

    try {
        $conn->beginTransaction();

        $conn->prepare("DELETE FROM bottle_service WHERE reservation_id = :rid")
              ->execute([':rid' => $reservation_id]);
        $conn->prepare("DELETE FROM ticket_reservations WHERE reservation_id = :rid")
              ->execute([':rid' => $reservation_id]);
        $conn->prepare("DELETE FROM table_section WHERE reservation_id = :rid")
              ->execute([':rid' => $reservation_id]);

        $deleteSql = "DELETE FROM reservations WHERE reservation_id = :rid";
        $deleteStmt = $conn->prepare($deleteSql);
        $deleteStmt->execute([':rid' => $reservation_id]);

        $conn->commit();

        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}
