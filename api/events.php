<?php
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');

    include_once 'api.php';
    include_once 'email_notifications.php';

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'OPTIONS') {
        exit;
    }

    function table_exists(PDO $conn, string $tableName): bool {
        $stmt = $conn->prepare('SHOW TABLES LIKE :table_name');
        $stmt->execute([':table_name' => $tableName]);
        return (bool)$stmt->fetchColumn();
    }

    function get_existing_table_name(PDO $conn, array $candidates): ?string {
        foreach ($candidates as $candidate) {
            if (table_exists($conn, $candidate)) {
                return $candidate;
            }
        }
        return null;
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

    function format_time_window(?string $startTime, ?string $endTime): string {
        if (!$startTime && !$endTime) {
            return '';
        }

        return trim(($startTime ?? '') . ' - ' . ($endTime ?? ''));
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
        $eventStaffTable = get_existing_table_name($conn, ['event_staff', 'EventStaff']);
        if ($eventStaffTable === null || !table_exists($conn, 'staff')) {
            return null;
        }

        $eventStaffColumns = get_table_columns($conn, $eventStaffTable);
        $staffColumns = get_table_columns($conn, 'staff');

        $eventIdColumn = pick_column($eventStaffColumns, ['event_id']);
        $staffIdColumn = pick_column($eventStaffColumns, ['staff_id']);
        $staffPkColumn = pick_column($staffColumns, ['id', 'staff_id']);
        $staffNameColumn = pick_column($staffColumns, ['name', 'staff_name']);

        if (!$eventIdColumn || !$staffIdColumn || !$staffPkColumn || !$staffNameColumn) {
            return null;
        }

        return [
            'table_name' => $eventStaffTable,
            'event_id' => $eventIdColumn,
            'staff_id' => $staffIdColumn,
            'staff_pk' => $staffPkColumn,
            'staff_name' => $staffNameColumn
        ];
    }

    function fetch_available_staff_ids_for_window(
        PDO $conn,
        array $staffIds,
        string $startTime,
        string $endTime,
        array $eventMap,
        array $eventStaffMap
    ): array {
        if (empty($staffIds)) {
            return [];
        }

        $filteredIds = array_values(array_filter(array_unique(array_map(static fn($id) => (int)$id, $staffIds)), static fn($id) => $id > 0));
        if (empty($filteredIds)) {
            return [];
        }

        $staffIdPlaceholders = implode(',', array_fill(0, count($filteredIds), '?'));
        $params = $filteredIds;
        $availabilityParams = [$startTime, $startTime, $endTime];
        $reservationParams = [];
        $eventParams = [$endTime, $startTime];

        $reservationStaffTable = get_existing_table_name($conn, ['ReservationStaff', 'reservation_staff']);
        $reservationConflictClause = '';
        if ($reservationStaffTable !== null && table_exists($conn, 'reservations')) {
            $reservationConflictClause = "
                AND s.id NOT IN (
                    SELECT rs.staff_id
                    FROM " . quote_identifier($reservationStaffTable) . " rs
                    JOIN reservations r ON rs.reservation_id = r.reservation_id
                    WHERE r.status != 'cancelled'
                    AND (r.start_time < ? AND r.end_time > ?)
                )
            ";
            $reservationParams = [$endTime, $startTime];
        }

        $eventStaffTable = quote_identifier($eventStaffMap['table_name']);
        $eventStaffEventId = quote_identifier($eventStaffMap['event_id']);
        $eventStaffStaffId = quote_identifier($eventStaffMap['staff_id']);
        $eventIdColumn = quote_identifier($eventMap['event_id']);
        $eventStartColumn = quote_identifier($eventMap['start_time']);
        $eventEndColumn = quote_identifier($eventMap['end_time']);

        $sql = "
            SELECT DISTINCT s.id
            FROM staff s
            JOIN availability a ON a.staff_id = s.id
            WHERE s.id IN ({$staffIdPlaceholders})
            AND a.is_available = 1
            AND a.day_of_week = DAYNAME(?)
            AND a.start_time <= TIME(?)
            AND a.end_time >= TIME(?)
            {$reservationConflictClause}
            AND s.id NOT IN (
                SELECT es.{$eventStaffStaffId}
                FROM {$eventStaffTable} es
                JOIN events e ON es.{$eventStaffEventId} = e.{$eventIdColumn}
                WHERE e.{$eventStartColumn} < ?
                    AND e.{$eventEndColumn} > ?
                    AND e.removed = 0
                    AND e.status != 'cancelled'
            )
        ";
        $params = array_merge($params, $availabilityParams, $reservationParams, $eventParams);

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

        return array_values(array_unique(array_map(static fn($id) => (int)$id, $rows)));
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

    function get_tickets_column_map(PDO $conn): ?array {
        if (!table_exists($conn, 'tickets')) {
            return null;
        }

        $columns = get_table_columns($conn, 'tickets');

        $map = [
            'event_id' => pick_column($columns, ['event_id']),
            'price' => pick_column($columns, ['price', 'cost', 'amount']),
            'tier' => pick_column($columns, ['tier', 'ticket_tier', 'ticket_type', 'type', 'name'])
        ];

        if (!$map['event_id'] || !$map['price']) {
            return null;
        }

        return $map;
    }

    function replace_event_ticket_rows(PDO $conn, int $eventId, float $gaTicketPrice, float $vipTicketPrice): void {
        $ticketsMap = get_tickets_column_map($conn);
        if ($ticketsMap === null) {
            return;
        }

        $ticketEventIdColumn = quote_identifier($ticketsMap['event_id']);
        $ticketPriceColumn = quote_identifier($ticketsMap['price']);
        $ticketTierColumn = $ticketsMap['tier'] ? quote_identifier($ticketsMap['tier']) : null;

        $deleteSql = sprintf('DELETE FROM tickets WHERE %s = :event_id', $ticketEventIdColumn);
        $deleteStmt = $conn->prepare($deleteSql);
        $deleteStmt->execute([':event_id' => $eventId]);

        if ($ticketTierColumn !== null) {
            $insertSql = sprintf(
                'INSERT INTO tickets (%s, %s, %s) VALUES (:event_id, :tier, :price)',
                $ticketEventIdColumn,
                $ticketTierColumn,
                $ticketPriceColumn
            );

            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->execute([
                ':event_id' => $eventId,
                ':tier' => 'GA',
                ':price' => $gaTicketPrice
            ]);
            $insertStmt->execute([
                ':event_id' => $eventId,
                ':tier' => 'VIP',
                ':price' => $vipTicketPrice
            ]);
            return;
        }

        $insertSql = sprintf(
            'INSERT INTO tickets (%s, %s) VALUES (:event_id, :price)',
            $ticketEventIdColumn,
            $ticketPriceColumn
        );
        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->execute([
            ':event_id' => $eventId,
            ':price' => $gaTicketPrice
        ]);
    }

    function delete_event_ticket_rows(PDO $conn, int $eventId): void {
        $ticketsMap = get_tickets_column_map($conn);
        if ($ticketsMap === null) {
            return;
        }

        $ticketEventIdColumn = quote_identifier($ticketsMap['event_id']);
        $deleteSql = sprintf('DELETE FROM tickets WHERE %s = :event_id', $ticketEventIdColumn);
        $deleteStmt = $conn->prepare($deleteSql);
        $deleteStmt->execute([':event_id' => $eventId]);
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
        $ticketsMap = get_tickets_column_map($conn);

        if ($eventMap === null) {
            if (!table_exists($conn, 'ticket_reservations')) {
                return [];
            }

            $ticketJoin = '';
            $ticketPriceSelect = "NULL AS price, NULL AS ga_ticket_price, NULL AS vip_ticket_price";

            if ($ticketsMap !== null) {
                $ticketEventId = quote_identifier($ticketsMap['event_id']);
                $ticketPriceColumn = quote_identifier($ticketsMap['price']);
                $ticketTierColumn = $ticketsMap['tier'] ? quote_identifier($ticketsMap['tier']) : null;

                $ticketJoin = "LEFT JOIN tickets t ON t.{$ticketEventId} = tr.event_id";

                if ($ticketTierColumn !== null) {
                    $ticketPriceSelect = "
                        MIN(t.{$ticketPriceColumn}) AS price,
                        MAX(CASE WHEN LOWER(TRIM(t.{$ticketTierColumn})) IN ('ga', 'general admission', 'general') THEN t.{$ticketPriceColumn} END) AS ga_ticket_price,
                        MAX(CASE WHEN LOWER(TRIM(t.{$ticketTierColumn})) IN ('vip', 'v.i.p.') THEN t.{$ticketPriceColumn} END) AS vip_ticket_price
                    ";
                } else {
                    $ticketPriceSelect = "
                        MIN(t.{$ticketPriceColumn}) AS price,
                        NULL AS ga_ticket_price,
                        NULL AS vip_ticket_price
                    ";
                }
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
                    {$ticketPriceSelect},
                    '' AS assigned_staff_names,
                    '' AS assigned_staff_ids
                FROM ticket_reservations tr
                LEFT JOIN reservations r ON r.reservation_id = tr.reservation_id
                {$ticketJoin}
                WHERE r.start_time >= NOW() AND e.removed = 0 
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

        $ticketJoin = '';
        $ticketPriceSelect = "NULL AS price, NULL AS ga_ticket_price, NULL AS vip_ticket_price";

        if ($ticketsMap !== null) {
            $ticketEventId = quote_identifier($ticketsMap['event_id']);
            $ticketPriceColumn = quote_identifier($ticketsMap['price']);
            $ticketTierColumn = $ticketsMap['tier'] ? quote_identifier($ticketsMap['tier']) : null;

            $ticketJoin = "LEFT JOIN tickets t ON t.{$ticketEventId} = e.{$eventId}";

            if ($ticketTierColumn !== null) {
                $ticketPriceSelect = "
                    MIN(t.{$ticketPriceColumn}) AS price,
                    MAX(CASE WHEN LOWER(TRIM(t.{$ticketTierColumn})) IN ('ga', 'general admission', 'general') THEN t.{$ticketPriceColumn} END) AS ga_ticket_price,
                    MAX(CASE WHEN LOWER(TRIM(t.{$ticketTierColumn})) IN ('vip', 'v.i.p.') THEN t.{$ticketPriceColumn} END) AS vip_ticket_price
                ";
            } else {
                $ticketPriceSelect = "
                    MIN(t.{$ticketPriceColumn}) AS price,
                    NULL AS ga_ticket_price,
                    NULL AS vip_ticket_price
                ";
            }
        }

        if ($eventStaffMap !== null) {
            $eventStaffTableName = quote_identifier($eventStaffMap['table_name']);
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
                    e.{$qtyTickets} AS qty_tickets, // need to subtract on how many tickets have been reserved in the reservations table to and prevent overselling
                    e.{$performer} AS performer,
                    {$ticketPriceSelect},
                    COALESCE(GROUP_CONCAT(DISTINCT s.{$staffName} ORDER BY s.{$staffName} SEPARATOR ', '), '') AS assigned_staff_names,
                    COALESCE(GROUP_CONCAT(DISTINCT s.{$staffPk} ORDER BY s.{$staffPk} SEPARATOR ','), '') AS assigned_staff_ids
                FROM events e
                LEFT JOIN {$eventStaffTableName} es ON es.{$eventStaffEventId} = e.{$eventId}
                LEFT JOIN staff s ON s.{$staffPk} = es.{$eventStaffStaffId}
                {$ticketJoin}
                WHERE e.{$startTime} >= NOW() AND e.removed = 0
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
                {$ticketPriceSelect},
                '' AS assigned_staff_names,
                '' AS assigned_staff_ids
            FROM events e
            {$ticketJoin}
            GROUP BY e.{$eventId}, e.{$eventTitle}, e.{$description}, e.{$startTime}, e.{$endTime}, e.{$qtyTickets}, e.{$performer}
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

        $eventStaffMap = get_event_staff_column_map($conn);
        $uniqueStaffIds = array_values(array_unique(array_map(static fn($value) => (int)$value, $staffIds)));
        $validStaffIds = array_values(array_filter($uniqueStaffIds, static fn($value) => $value > 0));

        if (!empty($validStaffIds) && $eventStaffMap === null) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Staff assignment is unavailable because event staffing tables are not configured.'
            ]);
            exit;
        }

        if (!empty($validStaffIds) && $eventStaffMap !== null) {
            $availableStaffIds = fetch_available_staff_ids_for_window(
                $conn,
                $validStaffIds,
                $startTime,
                $endTime,
                $eventMap,
                $eventStaffMap
            );
            $unavailableStaffIds = array_values(array_diff($validStaffIds, $availableStaffIds));

            if (!empty($unavailableStaffIds)) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Some selected staff are unavailable for this event time.',
                    'unavailable_staff_ids' => $unavailableStaffIds
                ]);
                exit;
            }
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

            replace_event_ticket_rows($conn, (int)$eventId, $normalizedGaTicketPrice, $normalizedVipTicketPrice);

            if ($eventStaffMap !== null && !empty($validStaffIds)) {
                $eventStaffEventId = quote_identifier($eventStaffMap['event_id']);
                $eventStaffStaffId = quote_identifier($eventStaffMap['staff_id']);
                $eventStaffTableName = quote_identifier($eventStaffMap['table_name']);

                $assignSql = sprintf(
                    'INSERT INTO %s (%s, %s) VALUES (:event_id, :staff_id)',
                    $eventStaffTableName,
                    $eventStaffEventId,
                    $eventStaffStaffId
                );
                $assignStmt = $conn->prepare($assignSql);

                foreach ($validStaffIds as $staffId) {
                    $assignStmt->execute([
                        ':event_id' => (int)$eventId,
                        ':staff_id' => $staffId
                    ]);
                }
            }

            set_event_ticket_resource_prices($conn, $normalizedGaTicketPrice, $normalizedVipTicketPrice);

            $conn->commit();

            if (!empty($validStaffIds)) {
                $placeholders = implode(',', array_fill(0, count($validStaffIds), '?'));
                $staffQuery = "SELECT id, name FROM staff WHERE id IN ({$placeholders})";
                $staffStmt = $conn->prepare($staffQuery);
                $staffStmt->execute($validStaffIds);
                $assignedStaffRows = $staffStmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($assignedStaffRows as $staffRow) {
                    send_staff_assignment_email(
                        'SR-BA',
                        "New Event Assignment: {$eventTitle}",
                        (string)($staffRow['name'] ?? 'Staff Member'),
                        format_time_window($startTime, $endTime),
                        "You have been assigned to event \"{$eventTitle}\"" . ($performer !== '' ? " with performer {$performer}." : '.')
                    );
                }
            }

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
        // cancelation variables
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
            echo json_encode(['success' => false, 'message' => 'id is required.']);
            exit;
        }

        // --- CANCELLATION REASON & AUTH LOGIC ---
        $cancelled_by = $_SESSION['user_id'] ?? null;
        $user_role = $_SESSION['user']['role'] ?? ($_SESSION['user']['privilege'] ?? 'user');
        $cancel_reason = trim($_GET['reason'] ?? '');
        $eventIdCol =quote_identifier($eventMap['event_id']);
        $startTimeCol = quote_identifier($eventMap['start_time']);

        $checkStmt = $conn->prepare("SELECT e.{$eventIdCol}, e.{$startTimeCol} FROM events e WHERE e.{$eventIdCol} = :event_id AND e.removed = 0");
        $checkStmt->execute([':event_id' => $_GET['id']]);
        $existingEvent = $checkStmt->fetch(PDO::FETCH_ASSOC);

         // Check if event exists and is not already removed
        if (!$existingEvent) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Event not found.'
            ]);
            exit;
        }
        
        // CHECK if the event is from the past
        if (strtotime($existingEvent[$startTimeCol]) < time()) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Cannot cancel past events.'
            ]);
            exit;
        }

        // check if the user is a staff and if staff then assigned to the event
        if ($user_role === 'staff') {
            $eventStaffTable = get_existing_table_name($conn, ['event_staff', 'EventStaff']);
            // SAFETY CHECK: souldn't be possible unless no staffing table was set up
            if ($eventStaffTable === null) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Event staffing tables are not configured. Cannot verify staff permissions.'
                ]);
                exit;
            }
            $staffCheck = $conn -> prepare("
                Select 1 from {$eventStaffTable}' es
                JOIN staff s ON es.staff_id = s.id
                WHERE es.event_id = :event_id AND s.id = :staff_id AND s.removed = 0  
            ");
            $staffCheck->execute([
                ':event_id' => $_GET['id'],
                ':staff_id' => $cancelled_by
            ]);
            if(!(bool)$staffCheck->fetch()){
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'message' => 'You do not have permission to cancel this event because you are not assigned to it.'
                ]);
                exit;
            }
        }


        // Requirement: Admin/Staff MUST provide a reason
        if (($user_role === 'admin' || $user_role === 'staff') && empty($cancel_reason)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Cancellation reason is required for staff and admins.']);
            exit;
        }

        // Default reason for normal users
        if (empty($cancel_reason)) {
            $cancel_reason = 'Cancelled by user';
        }

        try {
            $conn->beginTransaction();

            $eventIdCol = quote_identifier($eventMap['event_id']);
            
            // UPDATE the event instead of deleting it
            $updateEventSql = "
                UPDATE events 
                SET status = 'cancelled', 
                    removed = 1, 
                    cancelled_by = :by, 
                    cancellation_reason = :reason 
                WHERE {$eventIdCol} = :event_id
            ";

            $updateEventStmt = $conn->prepare($updateEventSql);
            $updateEventStmt->execute([
                ':by' => $cancelled_by,
                ':reason' => $cancel_reason,
                ':event_id' => $eventId
            ]);

            if ($updateEventStmt->rowCount() === 0) {
                $conn->rollBack();
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Event not found.']);
                exit;
            }

            // NOTE: We do NOT delete the tickets or the event_staff anymore! 
            // We leave them in the database for the audit trail.

            $conn->commit();
            echo json_encode([
                'success' => true, 
                'message' => 'Event successfully cancelled and archived.'
            ]);
        } catch (PDOException $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Unable to cancel event.']);
        }

        exit;
    }

    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

?>