<?php
// TODO CHECK IF STAFF IS AVAILABLE FOR THIS Reserved TIME SLOT

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
include_once 'email_notifications.php';

$method = $_SERVER['REQUEST_METHOD'];

// Handle preflight OPTIONS request for CORS
if ($method === 'OPTIONS') {
    exit;
}

// =========================================================
// 🔒 GLOBAL SECURITY CHECK: MUST BE LOGGED IN
// =========================================================
if (!isset($_SESSION['user']) || !isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Please log in.']);
    exit;
}

$current_user_id = $_SESSION['user_id'];
$sessionRole = $_SESSION['user']['role'] ?? ($_SESSION['user']['privilege'] ?? 'user');

function normalize_ticket_tier_value($tier): ?string
{
    $normalized = strtoupper(trim((string)$tier));
    if ($normalized === 'GA' || $normalized === 'VIP') {
        return $normalized;
    }
    return null;
}

function ticket_reservations_has_column(PDO $conn, string $columnName): bool
{
    static $columnCache = null;

    if ($columnCache === null) {
        try {
            $columnsStmt = $conn->query("SHOW COLUMNS FROM ticket_reservations");
            $columnCache = $columnsStmt->fetchAll(PDO::FETCH_COLUMN, 0);
        } catch (PDOException $e) {
            $columnCache = [];
        }
    }

    return in_array($columnName, $columnCache, true);
}

function resolve_ticket_for_event(PDO $conn, $eventId, $ticketTier): ?array
{
    $normalizedTier = normalize_ticket_tier_value($ticketTier);
    if (!$eventId || !$normalizedTier) {
        return null;
    }

    try {
        $ticketStmt = $conn->prepare("
            SELECT ticket_id, tier, price
            FROM tickets
            WHERE event_id = :event_id
              AND UPPER(TRIM(tier)) = :tier
            LIMIT 1
        ");
        $ticketStmt->execute([
            ':event_id' => $eventId,
            ':tier' => $normalizedTier
        ]);
        $ticketRow = $ticketStmt->fetch(PDO::FETCH_ASSOC);

        return $ticketRow ?: null;
    } catch (PDOException $e) {
        return null;
    }
}

function table_exists(PDO $conn, string $tableName): bool
{
    $stmt = $conn->prepare('SHOW TABLES LIKE :table_name');
    $stmt->execute([':table_name' => $tableName]);
    return (bool)$stmt->fetchColumn();
}

function get_existing_table_name(PDO $conn, array $candidates): ?string
{
    foreach ($candidates as $candidate) {
        if (table_exists($conn, $candidate)) {
            return $candidate;
        }
    }
    return null;
}

function get_assigned_event_staff_ids(PDO $conn, int $eventId): array
{
    if ($eventId <= 0) {
        return [];
    }

    $eventStaffTable = get_existing_table_name($conn, ['EventStaff', 'event_staff']);
    if ($eventStaffTable === null) {
        return [];
    }

    $sql = "SELECT staff_id FROM `{$eventStaffTable}` WHERE event_id = :event_id";
    $stmt = $conn->prepare($sql);
    $stmt->execute([':event_id' => $eventId]);
    $rows = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

    return array_values(array_unique(array_filter(array_map(static fn($id) => (int)$id, $rows), static fn($id) => $id > 0)));
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
               tr.quantity,
               rs.staff_ids
        FROM reservations r
        JOIN resources res ON r.resource_id = res.id
        LEFT JOIN bottle_service bs ON bs.reservation_id = r.reservation_id
        LEFT JOIN ticket_reservations tr ON tr.reservation_id = r.reservation_id
        LEFT JOIN (
            SELECT reservation_id,
                   GROUP_CONCAT(DISTINCT staff_id ORDER BY staff_id SEPARATOR ',') AS staff_ids
            FROM ReservationStaff
            GROUP BY reservation_id
        ) rs ON r.reservation_id = rs.reservation_id";

        if ($sessionRole === 'staff') {
            $sql .= " WHERE EXISTS (
                        SELECT 1
                        FROM ReservationStaff rs_filter
                        WHERE rs_filter.reservation_id = r.reservation_id
                          AND rs_filter.staff_id = :uid
                      )";
        } elseif ($sessionRole !== 'admin') {
            $sql .= " WHERE r.user_id = :uid";
        }

        $sql .= " ORDER BY r.start_time ASC";
        $stmt = $conn->prepare($sql);

        if ($sessionRole !== 'admin') {
            $stmt->bindParam(':uid', $current_user_id);
        }

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

    if ($sessionRole === 'admin') {
        $user_id = $input['user_id'] ?? $_SESSION['user_id'];
    } else {
        $user_id = $_SESSION['user_id'] ?? null;
    }

    $resource_id = $input['resource_id'] ?? null;
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

        // just in case someone tries to bypass frontend validation, we also prevent for past times here
        if ($timestampStart < time()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Reservations cannot be made in the past.']);
            exit;
        }
    }


    try {
        $conn->beginTransaction();
        $assigned_staff_ids = [];
        $assignedStaffDetails = [];
        $emailDispatch = [
            'trigger' => 'reservation_assignment',
            'attempted' => 0,
            'sent' => 0,
            'failed' => 0,
            'staff_ids' => []
        ];

        $resourceTypeNormalized = strtolower(trim((string)($resource['type'] ?? '')));
        $resourceNameNormalized = strtolower(trim((string)($resource['name'] ?? '')));
        $isTicketResource = $resourceTypeNormalized === 'event_ticket' || strpos($resourceNameNormalized, 'event ticket') !== false;

        // --- CONFLICT CHECK ---
        // Tickets are non-exclusive inventory (many reservations can share the same event window).
        // Keep exclusivity checks for non-ticket resources (e.g., bottle/open bar slots).
        if (!$isTicketResource) {
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
        }

        // Added resource_id to the insert query
        $resource_name = $resource['name'];
        $resource_Type = $resource['type'];
        $resolved_ticket_id = null;

        if ($resource_Type === 'Bottle Service') {
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

        // --- FLOW 1: USER 10-MIN WARNING (DB RECORD) ---
        $notify_at = date('Y-m-d H:i:s', strtotime($start_time . ' -10 minutes'));

        $userNotifSql = "INSERT INTO user_notifications (user_id, reservation_id, notify_at) 
                        VALUES (:uid, :rid, :nat)";
        $conn->prepare($userNotifSql)->execute([
            ':uid' => $user_id,
            ':rid' => $reservation_id,
            ':nat' => $notify_at
        ]);

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
            $normalizedTicketTier = normalize_ticket_tier_value($ticket_tier);
            if (!$normalizedTicketTier) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ticket_tier must be GA or VIP.']);
                exit;
            }

            $resolvedTicket = resolve_ticket_for_event($conn, $event_id, $normalizedTicketTier);
            if (!$resolvedTicket) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No ticket found for the selected event and tier.']);
                exit;
            }

            $resolved_ticket_id = isset($resolvedTicket['ticket_id']) ? (int)$resolvedTicket['ticket_id'] : null;

            if (ticket_reservations_has_column($conn, 'ticket_id')) {
                $childSql = "INSERT INTO ticket_reservations (reservation_id, event_id, ticket_tier, quantity, ticket_id)
                             VALUES (:rid, :event_id, :tier, :qty, :ticket_id)";
                $childStmt = $conn->prepare($childSql);
                $childStmt->execute([
                    ':rid' => $reservation_id,
                    ':event_id' => $event_id,
                    ':tier' => $normalizedTicketTier,
                    ':qty' => $quantity,
                    ':ticket_id' => $resolved_ticket_id
                ]);
            } else {
                $childSql = "INSERT INTO ticket_reservations (reservation_id, event_id, ticket_tier, quantity)
                             VALUES (:rid, :event_id, :tier, :qty)";
                $childStmt = $conn->prepare($childSql);
                $childStmt->execute([
                    ':rid' => $reservation_id,
                    ':event_id' => $event_id,
                    ':tier' => $normalizedTicketTier,
                    ':qty' => $quantity
                ]);
            }
        }

        // STAFF ASSIGNMENT
        // Ticket reservations inherit the event's assigned staff directly.
        if ($isTicketResource) {
            $assigned_staff_ids = get_assigned_event_staff_ids($conn, (int)$event_id);
            if (empty($assigned_staff_ids)) {
                $conn->rollBack();
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Conflict: No staff are assigned to the selected event. Please assign event staff first.'
                ]);
                exit;
            }
        } else {
            $required_roles = [];

            if ($resource_Type === 'Open Bar' || strpos($resource_name, 'Open Bar') !== false) {
                $required_roles = ['Bartender', 'Bar Back'];
            } elseif ($resource_Type === 'Bottle Service' || strpos($resource_name, 'Bottle Service') !== false) {
                $required_roles = ['Bottle Service Promoter'];
            } elseif ($resource_Type === 'Event' || strpos($resource_name, 'Event') !== false) {
                $required_roles = ['Security', 'Bouncer'];
            }

            foreach ($required_roles as $role) {
                // Find one staff member who fits the role and has NO overlapping reservations
                $findStaffSql = "
                    SELECT s.id FROM staff s
                    WHERE s.role = :role 
                    AND s.id NOT IN (
                        SELECT rs.staff_id FROM ReservationStaff rs
                        JOIN reservations r ON rs.reservation_id = r.reservation_id
                        WHERE (r.start_time < :end_time AND r.end_time > :start_time)
                        AND r.status != 'cancelled'
                    )
                    LIMIT 1
                ";

                $staffStmt = $conn->prepare($findStaffSql);
                $staffStmt->execute([
                    ':role' => $role,
                    ':end_time' => $end_time,
                    ':start_time' => $start_time
                ]);

                $available_staff = $staffStmt->fetch(PDO::FETCH_ASSOC);

                // If we can't find a staff member for this role, abort the whole reservation
                if (!$available_staff) {
                    $conn->rollBack();
                    http_response_code(409);
                    echo json_encode([
                        'success' => false,
                        'message' => "Conflict: No available staff for the required role: $role. Please try a different time."
                    ]);
                    exit;
                }

                $assigned_staff_ids[] = $available_staff['id'];
            }
        }

        // If we found everyone we need, map them to the new reservation in ReservationStaff
        foreach ($assigned_staff_ids as $staff_id) {
            $assignSql = "INSERT INTO ReservationStaff (reservation_id, staff_id) VALUES (:res_id, :staff_id)";
            $assignStmt = $conn->prepare($assignSql);
            $assignStmt->execute([
                ':res_id' => $reservation_id,
                ':staff_id' => $staff_id
            ]);
        }

        foreach ($assigned_staff_ids as $staff_id) {
            $staffDetailsSql = "SELECT id, name, role, user_id FROM staff WHERE id = :sid LIMIT 1";
            $staffDetailsStmt = $conn->prepare($staffDetailsSql);
            $staffDetailsStmt->execute([':sid' => $staff_id]);
            $staffDetails = $staffDetailsStmt->fetch(PDO::FETCH_ASSOC);

            if (!$staffDetails) {
                continue;
            }

            $assignedStaffDetails[] = [
                'id' => (int)($staffDetails['id'] ?? 0),
                'name' => $staffDetails['name'] ?? '',
                'role' => $staffDetails['role'] ?? '',
                'user_id' => $staffDetails['user_id'] ?? null
            ];

            if (!empty($staffDetails['user_id'])) {
                $staffNotifSql = "INSERT INTO staff_notifications (staff_user_id, reservation_id, message) 
                                  VALUES (:suid, :rid, :msg)";
                $conn->prepare($staffNotifSql)->execute([
                    ':suid' => $staffDetails['user_id'],
                    ':rid' => $reservation_id,
                    ':msg' => "New Assignment: You have been assigned to a $service_type shift."
                ]);
            }
        }


        $conn->commit();

        if (!empty($assignedStaffDetails)) {
            $timeWindow = trim(($start_time ?? '') . ' - ' . ($end_time ?? ''));
            $emailDispatch['staff_ids'] = array_values(array_map(static fn($row) => (int)($row['id'] ?? 0), $assignedStaffDetails));
            $emailDispatch['attempted'] = count($assignedStaffDetails);
            // Frontend now sends assignment emails directly after successful create.
            $emailDispatch['sent'] = 0;
            $emailDispatch['failed'] = 0;
            $emailDispatch['delivery_mode'] = 'frontend';
            log_email_trigger('reservation_assignment_email_backend_skipped', [
                'reservation_id' => (int)$reservation_id,
                'staff_ids' => $emailDispatch['staff_ids'],
                'attempted' => $emailDispatch['attempted'],
                'time_window' => $timeWindow,
                'delivery_mode' => 'frontend'
            ]);
        }

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Reservation submitted and staff automatically assigned successfully.',
            'reservation_id' => (int)$reservation_id,
            'resource_name' => $resource_name,
            'start_time' => $start_time,
            'end_time' => $end_time,
            'ticket_id' => $resolved_ticket_id,
            'assigned_staff' => $assignedStaffDetails,
            'email_dispatch' => $emailDispatch
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

    if ($sessionRole === 'admin') {
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

    // Prevent editing a reservation to push it into the past
    $timestampStart = strtotime($start_time ?? '');
    $timestampEnd   = strtotime($end_time ?? '');

    if ($timestampStart && $timestampStart < time()) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Reservations cannot be rescheduled to the past.']);
        exit;
    }
    if ($timestampStart && $timestampEnd && $timestampStart >= $timestampEnd) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'start_time must be before end_time.']);
        exit;
    }

    try {
        $conn->beginTransaction();

        $existsStmt = $conn->prepare("SELECT user_id, reservation_id FROM reservations WHERE reservation_id = :reservation_id");
        $existsStmt->execute([':reservation_id' => $reservation_id]);
        $existingRes = $existsStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existingRes) {
            $conn->rollBack();
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Reservation not found.']);
            exit;
        }

        // 🔒 SECURITY CHECK: Verify ownership
        if ($sessionRole !== 'admin' && $existingRes['user_id'] !== $current_user_id) {
            $conn->rollBack();
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Forbidden: You do not own this reservation.']);
            exit;
        }

        $resourceStmt = $conn->prepare("SELECT name, type, price FROM resources WHERE id = :rid");
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

        $resourceTypeNormalized = strtolower(trim((string)($resource['type'] ?? '')));
        $resourceNameNormalized = strtolower(trim((string)($resource['name'] ?? '')));
        $isTicketResource = $resourceTypeNormalized === 'event_ticket' || strpos($resourceNameNormalized, 'event ticket') !== false;

        if (!$isTicketResource) {
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

        // Keep the user reminder in sync when reservation details change.
        $conn->prepare("DELETE FROM user_notifications WHERE reservation_id = :rid")
            ->execute([':rid' => $reservation_id]);
        if (strtolower((string)$status) !== 'cancelled') {
            $notify_at = date('Y-m-d H:i:s', strtotime($start_time . ' -10 minutes'));
            $userNotifSql = "INSERT INTO user_notifications (user_id, reservation_id, notify_at)
                             VALUES (:uid, :rid, :nat)";
            $conn->prepare($userNotifSql)->execute([
                ':uid' => $user_id,
                ':rid' => $reservation_id,
                ':nat' => $notify_at
            ]);
        }


        $resource_Type = $resource['type'];
        $resource_name = $resource['name'];

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

            // Handle updates or inserts for bottle service
            $childSql = "INSERT INTO bottle_service (reservation_id, section_number, guest_count, minimum_spend)
                         VALUES (:rid, :section, :guests, :min_spend)
                         ON DUPLICATE KEY UPDATE
                            section_number = VALUES(section_number),
                            guest_count = VALUES(guest_count),
                            minimum_spend = VALUES(minimum_spend)";
            $childStmt = $conn->prepare($childSql);
            $childStmt->execute([
                ':rid' => $reservation_id,
                ':section' => $section_number,
                ':guests' => $guest_count,
                ':min_spend' => $minimum_spend
            ]);

            $conn->prepare("DELETE FROM ticket_reservations WHERE reservation_id = :rid")
                ->execute([':rid' => $reservation_id]);
        } elseif ($resource_name === 'Event Ticket GA' || $resource_name === 'Event Ticket VIP') {
            if (!$event_id || !$ticket_tier || !$quantity) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Event ticket requires event_id, ticket_tier, and quantity.']);
                exit;
            }
            $normalizedTicketTier = normalize_ticket_tier_value($ticket_tier);
            if (!$normalizedTicketTier) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ticket_tier must be GA or VIP.']);
                exit;
            }

            $resolvedTicket = resolve_ticket_for_event($conn, $event_id, $normalizedTicketTier);
            if (!$resolvedTicket) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No ticket found for the selected event and tier.']);
                exit;
            }

            $resolvedTicketId = isset($resolvedTicket['ticket_id']) ? (int)$resolvedTicket['ticket_id'] : null;

            if (ticket_reservations_has_column($conn, 'ticket_id')) {
                $childSql = "INSERT INTO ticket_reservations (reservation_id, event_id, ticket_tier, quantity, ticket_id)
                             VALUES (:rid, :event_id, :tier, :qty, :ticket_id)
                             ON DUPLICATE KEY UPDATE
                                event_id = VALUES(event_id),
                                ticket_tier = VALUES(ticket_tier),
                                quantity = VALUES(quantity),
                                ticket_id = VALUES(ticket_id)";
                $childStmt = $conn->prepare($childSql);
                $childStmt->execute([
                    ':rid' => $reservation_id,
                    ':event_id' => $event_id,
                    ':tier' => $normalizedTicketTier,
                    ':qty' => $quantity,
                    ':ticket_id' => $resolvedTicketId
                ]);
            } else {
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
                    ':tier' => $normalizedTicketTier,
                    ':qty' => $quantity
                ]);
            }

            $conn->prepare("DELETE FROM bottle_service WHERE reservation_id = :rid")
                ->execute([':rid' => $reservation_id]);
        }


        $conn->prepare("DELETE FROM ReservationStaff WHERE reservation_id = :rid")
            ->execute([':rid' => $reservation_id]);

        $assigned_staff_ids = [];

        if ($isTicketResource) {
            $assigned_staff_ids = get_assigned_event_staff_ids($conn, (int)$event_id);
            if (empty($assigned_staff_ids)) {
                $conn->rollBack();
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Conflict: No staff are assigned to the selected event. Please assign event staff first.'
                ]);
                exit;
            }
        } else {
            $required_roles = [];
            if ($resource_Type === 'Open Bar' || strpos($resource_name, 'Open Bar') !== false) {
                $required_roles = ['Bartender', 'Bar Back'];
            } elseif ($resource_Type === 'Bottle Service' || strpos($resource_name, 'Bottle Service') !== false) {
                $required_roles = ['Bottle Service Promoter'];
            } elseif ($resource_Type === 'Event' || strpos($resource_name, 'Event') !== false) {
                $required_roles = ['Security', 'Bouncer'];
            }

            foreach ($required_roles as $role) {
                // Find staff who are free during the NEW time slot
                $findStaffSql = "
                    SELECT s.id 
                    FROM staff s
                    JOIN availability a ON s.id = a.staff_id
                    WHERE s.role = :role 
                    AND a.day_of_week = DAYNAME(:start_date)
                    AND a.start_time <= TIME(:start_time)
                    AND a.end_time >= TIME(:end_time)
                    AND s.id NOT IN (
                        SELECT rs.staff_id FROM ReservationStaff rs
                        JOIN reservations r ON rs.reservation_id = r.reservation_id
                        WHERE (r.start_time < :end_time_check AND r.end_time > :start_time_check)
                        AND r.status != 'cancelled'
                    )
                    LIMIT 1
                ";

                $staffStmt = $conn->prepare($findStaffSql);
                $staffStmt->execute([
                    ':role' => $role,
                    ':start_date' => $start_time,
                    ':start_time' => $start_time,
                    ':end_time' => $end_time,
                    ':start_time_check' => $start_time,
                    ':end_time_check' => $end_time
                ]);

                $available_staff = $staffStmt->fetch(PDO::FETCH_ASSOC);

                if (!$available_staff) {
                    $conn->rollBack();
                    http_response_code(409);
                    echo json_encode([
                        'success' => false,
                        'message' => "Conflict: No available staff for the required role: $role at this new time."
                    ]);
                    exit;
                }
                $assigned_staff_ids[] = $available_staff['id'];
            }
        }

        foreach ($assigned_staff_ids as $staff_id) {
            $assignSql = "INSERT INTO ReservationStaff (reservation_id, staff_id) VALUES (:res_id, :staff_id)";
            $assignStmt = $conn->prepare($assignSql);
            $assignStmt->execute([
                ':res_id' => $reservation_id,
                ':staff_id' => $staff_id
            ]);

            // Trigger Staff Notification for Updated Time
            $userLookup = $conn->prepare("SELECT user_id FROM staff WHERE id = :sid");
            $userLookup->execute([':sid' => $staff_id]);
            $staffUser = $userLookup->fetch(PDO::FETCH_ASSOC);

            if ($staffUser && $staffUser['user_id']) {
                $notifSql = "INSERT INTO staff_notifications (staff_user_id, reservation_id, message) 
                             VALUES (:suid, :rid, :msg)";
                $conn->prepare($notifSql)->execute([
                    ':suid' => $staffUser['user_id'],
                    ':rid' => $reservation_id,
                    ':msg' => "Your $resource_name reservation time has been updated."
                ]);
            }
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

        $existsStmt = $conn->prepare("SELECT user_id FROM reservations WHERE reservation_id = :reservation_id");
        $existsStmt->execute([':reservation_id' => $reservation_id]);
        $existingRes = $existsStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existingRes) {
            $conn->rollBack();
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Reservation not found.']);
            exit;
        }

        // 🔒 SECURITY CHECK: Verify ownership
        if ($sessionRole !== 'admin' && $existingRes['user_id'] !== $current_user_id) {
            $conn->rollBack();
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Forbidden: You do not own this reservation.']);
            exit;
        }

        $cancel_reason = trim($_GET['reason'] ?? '');

        if (($sessionRole === 'admin' || $sessionRole === 'staff') && empty($cancel_reason)) {
            $conn->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Cancellation reason is required for staff and admins.']);
            exit;
        }

        if (empty($cancel_reason)) {
            $cancel_reason = 'Cancelled by user';
        }

        $update = $conn->prepare("
            UPDATE reservations
            SET status = 'cancelled',
                cancellation_reason = :reason,
                cancelled_by_user_id = :uid
            WHERE reservation_id = :rid
        ");

        $update->execute([
            ':rid' => $reservation_id,
            ':reason' => $cancel_reason,
            ':uid' => $current_user_id
        ]);

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

?>
