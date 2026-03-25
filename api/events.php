<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');

include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    exit;
}

function table_exists(PDO $conn, string $tableName): bool {
    $stmt = $conn->prepare('SHOW TABLES LIKE :table_name');
    $stmt->execute([':table_name' => $tableName]);
    return (bool)$stmt->fetchColumn();
}

function get_table_columns(PDO $conn, string $tableName): array {
    $stmt = $conn->query("DESCRIBE `{$tableName}`");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return array_map(static fn($row) => $row['Field'], $rows);
}

function pick_column(array $columns, array $candidates): ?string {
    foreach ($candidates as $candidate) {
        if (in_array($candidate, $columns, true)) {
            return $candidate;
        }
    }

    return null;
}

function quote_identifier(string $identifier): string {
    return '`' . str_replace('`', '``', $identifier) . '`';
}

function normalize_datetime(?string $value): ?string {
    if (!$value) {
        return null;
    }

    $timestamp = strtotime($value);
    if ($timestamp === false) {
        return null;
    }

    return date('Y-m-d H:i:s', $timestamp);
}

function get_events_column_map(PDO $conn): ?array {
    if (!table_exists($conn, 'events')) {
        return null;
    }

    $columns = get_table_columns($conn, 'events');

    $map = [
        'event_id' => pick_column($columns, ['event_id', 'id']),
        'event_title' => pick_column($columns, ['event_title', 'title', 'name']),
        'description' => pick_column($columns, ['description', 'details']),
        'start_time' => pick_column($columns, ['start_time', 'start', 'start_at']),
        'end_time' => pick_column($columns, ['end_time', 'end', 'end_at']),
        'qty_tickets' => pick_column($columns, ['qty_tickets', 'ticket_qty', 'quantity', 'tickets_qty']),
        'performer' => pick_column($columns, ['performer', 'performer_name', 'artist'])
    ];

    foreach ($map as $column) {
        if ($column === null) {
            return null;
        }
    }

    return $map;
}

function get_event_staff_column_map(PDO $conn): ?array {
    if (!table_exists($conn, 'event_staff') || !table_exists($conn, 'staff')) {
        return null;
    }

    $eventStaffColumns = get_table_columns($conn, 'event_staff');
    $staffColumns = get_table_columns($conn, 'staff');

    $eventIdColumn = pick_column($eventStaffColumns, ['event_id']);
    $staffIdColumn = pick_column($eventStaffColumns, ['staff_id']);
    $staffPkColumn = pick_column($staffColumns, ['id', 'staff_id']);
    $staffNameColumn = pick_column($staffColumns, ['name', 'staff_name']);

    if (!$eventIdColumn || !$staffIdColumn || !$staffPkColumn || !$staffNameColumn) {
        return null;
    }

    return [
        'event_id' => $eventIdColumn,
        'staff_id' => $staffIdColumn,
        'staff_pk' => $staffPkColumn,
        'staff_name' => $staffNameColumn
    ];
}

function get_resources_column_map(PDO $conn): ?array {
    if (!table_exists($conn, 'resources')) {
        return null;
    }

    $columns = get_table_columns($conn, 'resources');

    $map = [
        'name' => pick_column($columns, ['name', 'resource_name', 'title']),
        'price' => pick_column($columns, ['price', 'cost', 'amount'])
    ];

    if (!$map['name'] || !$map['price']) {
        return null;
    }

    return $map;
}

function set_event_ticket_resource_prices(PDO $conn, float $gaTicketPrice, float $vipTicketPrice): void {
    $resourcesMap = get_resources_column_map($conn);

    if ($resourcesMap === null) {
        return;
    }

    $resourceNameColumn = quote_identifier($resourcesMap['name']);
    $resourcePriceColumn = quote_identifier($resourcesMap['price']);

    $updateSql = sprintf(
        'UPDATE resources SET %s = :price WHERE LOWER(%s) = LOWER(:resource_name)',
        $resourcePriceColumn,
        $resourceNameColumn
    );

    $updateStmt = $conn->prepare($updateSql);

    $updateStmt->execute([
        ':price' => $gaTicketPrice,
        ':resource_name' => 'Event Ticket GA'
    ]);

    $updateStmt->execute([
        ':price' => $vipTicketPrice,
        ':resource_name' => 'Event Ticket VIP'
    ]);
}

function fetch_events(PDO $conn): array {
    $eventMap = get_events_column_map($conn);

    if ($eventMap === null) {
        if (!table_exists($conn, 'ticket_reservations')) {
            return [];
        }

        $query = "
            SELECT
                tr.event_id AS event_id,
                CONCAT('Event ', tr.event_id) AS event_title,
                '' AS description,
                MIN(r.start_time) AS start_time,
                MAX(r.end_time) AS end_time,
                SUM(COALESCE(tr.quantity, 0)) AS qty_tickets,
                'TBD' AS performer,
                '' AS assigned_staff_names,
                '' AS assigned_staff_ids
            FROM ticket_reservations tr
            LEFT JOIN reservations r ON r.reservation_id = tr.reservation_id
            GROUP BY tr.event_id
            ORDER BY MIN(r.start_time) ASC, tr.event_id ASC
        ";

        $stmt = $conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    $eventStaffMap = get_event_staff_column_map($conn);

    $eventId = quote_identifier($eventMap['event_id']);
    $eventTitle = quote_identifier($eventMap['event_title']);
    $description = quote_identifier($eventMap['description']);
    $startTime = quote_identifier($eventMap['start_time']);
    $endTime = quote_identifier($eventMap['end_time']);
    $qtyTickets = quote_identifier($eventMap['qty_tickets']);
    $performer = quote_identifier($eventMap['performer']);

    if ($eventStaffMap !== null) {
        $eventStaffEventId = quote_identifier($eventStaffMap['event_id']);
        $eventStaffStaffId = quote_identifier($eventStaffMap['staff_id']);
        $staffPk = quote_identifier($eventStaffMap['staff_pk']);
        $staffName = quote_identifier($eventStaffMap['staff_name']);

        $query = "
            SELECT
                e.{$eventId} AS event_id,
                e.{$eventTitle} AS event_title,
                e.{$description} AS description,
                e.{$startTime} AS start_time,
                e.{$endTime} AS end_time,
                e.{$qtyTickets} AS qty_tickets,
                e.{$performer} AS performer,
                COALESCE(GROUP_CONCAT(DISTINCT s.{$staffName} ORDER BY s.{$staffName} SEPARATOR ', '), '') AS assigned_staff_names,
                COALESCE(GROUP_CONCAT(DISTINCT s.{$staffPk} ORDER BY s.{$staffPk} SEPARATOR ','), '') AS assigned_staff_ids
            FROM events e
            LEFT JOIN event_staff es ON es.{$eventStaffEventId} = e.{$eventId}
            LEFT JOIN staff s ON s.{$staffPk} = es.{$eventStaffStaffId}
            GROUP BY e.{$eventId}, e.{$eventTitle}, e.{$description}, e.{$startTime}, e.{$endTime}, e.{$qtyTickets}, e.{$performer}
            ORDER BY e.{$startTime} ASC, e.{$eventId} ASC
        ";

        $stmt = $conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    $query = "
        SELECT
            e.{$eventId} AS event_id,
            e.{$eventTitle} AS event_title,
            e.{$description} AS description,
            e.{$startTime} AS start_time,
            e.{$endTime} AS end_time,
            e.{$qtyTickets} AS qty_tickets,
            e.{$performer} AS performer,
            '' AS assigned_staff_names,
            '' AS assigned_staff_ids
        FROM events e
        ORDER BY e.{$startTime} ASC, e.{$eventId} ASC
    ";

    $stmt = $conn->prepare($query);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

if ($method === 'GET') {
    try {
        echo json_encode(fetch_events($conn));
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Unable to fetch events.'
        ]);
    }
    exit;
}

if ($method === 'POST') {
    $eventMap = get_events_column_map($conn);

    if ($eventMap === null) {
        http_response_code(501);
        echo json_encode([
            'success' => false,
            'message' => 'Events table is not set up yet. Create the sprint #4 events table first.'
        ]);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);

    $eventId = $input['event_id'] ?? null;
    $eventTitle = trim((string)($input['event_title'] ?? ''));
    $description = trim((string)($input['description'] ?? ''));
    $performer = trim((string)($input['performer'] ?? ''));
    $startTime = normalize_datetime($input['start_time'] ?? null);
    $endTime = normalize_datetime($input['end_time'] ?? null);
    $qtyTickets = $input['qty_tickets'] ?? null;
    $vipTicketPrice = $input['vip_ticket_price'] ?? null;
    $gaTicketPrice = $input['ga_ticket_price'] ?? null;
    $staffIds = is_array($input['staff_ids'] ?? null) ? $input['staff_ids'] : [];

    if (
        $eventId === null ||
        $eventTitle === '' ||
        $description === '' ||
        $performer === '' ||
        !$startTime ||
        !$endTime ||
        $qtyTickets === null ||
        $qtyTickets === '' ||
        $vipTicketPrice === null ||
        $vipTicketPrice === '' ||
        $gaTicketPrice === null ||
        $gaTicketPrice === ''
    ) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'event_id, event_title, description, performer, start_time, end_time, qty_tickets, vip_ticket_price, and ga_ticket_price are required.'
        ]);
        exit;
    }

    if (!is_numeric($eventId) || (int)$eventId <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'event_id must be a positive number.'
        ]);
        exit;
    }

    if (!is_numeric($qtyTickets) || (int)$qtyTickets < 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'qty_tickets must be a non-negative number.'
        ]);
        exit;
    }

    if (!is_numeric($vipTicketPrice) || (float)$vipTicketPrice < 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'vip_ticket_price must be a non-negative number.'
        ]);
        exit;
    }

    if (!is_numeric($gaTicketPrice) || (float)$gaTicketPrice < 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ga_ticket_price must be a non-negative number.'
        ]);
        exit;
    }

    $normalizedVipTicketPrice = round((float)$vipTicketPrice, 2);
    $normalizedGaTicketPrice = round((float)$gaTicketPrice, 2);

    if (strtotime($endTime) <= strtotime($startTime)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'end_time must be after start_time.'
        ]);
        exit;
    }

    $insertSql = sprintf(
        'INSERT INTO events (%s, %s, %s, %s, %s, %s, %s) VALUES (:event_id, :event_title, :description, :start_time, :end_time, :qty_tickets, :performer)',
        quote_identifier($eventMap['event_id']),
        quote_identifier($eventMap['event_title']),
        quote_identifier($eventMap['description']),
        quote_identifier($eventMap['start_time']),
        quote_identifier($eventMap['end_time']),
        quote_identifier($eventMap['qty_tickets']),
        quote_identifier($eventMap['performer'])
    );

    try {
        $conn->beginTransaction();

        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->execute([
            ':event_id' => (int)$eventId,
            ':event_title' => $eventTitle,
            ':description' => $description,
            ':start_time' => $startTime,
            ':end_time' => $endTime,
            ':qty_tickets' => (int)$qtyTickets,
            ':performer' => $performer
        ]);

        $eventStaffMap = get_event_staff_column_map($conn);
        if ($eventStaffMap !== null && !empty($staffIds)) {
            $eventStaffEventId = quote_identifier($eventStaffMap['event_id']);
            $eventStaffStaffId = quote_identifier($eventStaffMap['staff_id']);

            $assignSql = sprintf(
                'INSERT INTO event_staff (%s, %s) VALUES (:event_id, :staff_id)',
                $eventStaffEventId,
                $eventStaffStaffId
            );
            $assignStmt = $conn->prepare($assignSql);

            $uniqueStaffIds = array_values(array_unique(array_map(static fn($value) => (int)$value, $staffIds)));
            foreach ($uniqueStaffIds as $staffId) {
                if ($staffId <= 0) {
                    continue;
                }

                $assignStmt->execute([
                    ':event_id' => (int)$eventId,
                    ':staff_id' => $staffId
                ]);
            }
        }

        set_event_ticket_resource_prices($conn, $normalizedGaTicketPrice, $normalizedVipTicketPrice);

        $conn->commit();

        $createdEvent = null;
        $events = fetch_events($conn);
        foreach ($events as $event) {
            if (isset($event['event_id']) && (string)$event['event_id'] === (string)(int)$eventId) {
                $createdEvent = $event;
                break;
            }
        }

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'event' => $createdEvent
        ]);
    } catch (PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }

        if ($e->getCode() === '23000') {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'message' => 'An event with that event_id already exists.'
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Unable to create event.'
            ]);
        }
    }

    exit;
}

if ($method === 'DELETE') {
    $eventMap = get_events_column_map($conn);

    if ($eventMap === null) {
        http_response_code(501);
        echo json_encode([
            'success' => false,
            'message' => 'Events table is not set up yet. Nothing to delete.'
        ]);
        exit;
    }

    $eventId = $_GET['id'] ?? null;
    if ($eventId === null || $eventId === '') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'id is required.'
        ]);
        exit;
    }

    try {
        $conn->beginTransaction();

        $eventStaffMap = get_event_staff_column_map($conn);
        if ($eventStaffMap !== null) {
            $deleteAssignmentsSql = sprintf(
                'DELETE FROM event_staff WHERE %s = :event_id',
                quote_identifier($eventStaffMap['event_id'])
            );

            $deleteAssignmentsStmt = $conn->prepare($deleteAssignmentsSql);
            $deleteAssignmentsStmt->execute([
                ':event_id' => $eventId
            ]);
        }

        $deleteEventSql = sprintf(
            'DELETE FROM events WHERE %s = :event_id',
            quote_identifier($eventMap['event_id'])
        );

        $deleteEventStmt = $conn->prepare($deleteEventSql);
        $deleteEventStmt->execute([
            ':event_id' => $eventId
        ]);

        if ($deleteEventStmt->rowCount() === 0) {
            $conn->rollBack();
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Event not found.'
            ]);
            exit;
        }

        $conn->commit();
        echo json_encode([
            'success' => true,
            'message' => 'Event deleted.'
        ]);
    } catch (PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }

        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Unable to delete event.'
        ]);
    }

    exit;
}

http_response_code(405);
echo json_encode([
    'success' => false,
    'message' => 'Method not allowed.'
]);
