<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    exit;
}

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
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

if ($method === 'GET') {
    $staffId = $_GET['staff_id'] ?? null;
    $startTime = $_GET['start_time'] ?? null;
    $endTime = $_GET['end_time'] ?? null;

    try {
        if ($startTime && $endTime) {
            $startTimestamp = strtotime((string)$startTime);
            $endTimestamp = strtotime((string)$endTime);

            if ($startTimestamp === false || $endTimestamp === false || $endTimestamp <= $startTimestamp) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'start_time and end_time must be valid, and end_time must be after start_time.'
                ]);
                exit;
            }

            $normalizedStartDateTime = date('Y-m-d H:i:s', $startTimestamp);
            $normalizedEndDateTime = date('Y-m-d H:i:s', $endTimestamp);
            $dayOfWeek = date('l', $startTimestamp);

            $sql = "
                SELECT
                    s.id AS id,
                    s.id AS staff_id,
                    s.name,
                    s.role,
                    1 AS is_available
                FROM staff s
                JOIN availability a ON a.staff_id = s.id
                WHERE a.is_available = 1
                AND a.day_of_week = :day_of_week
                AND a.start_time <= TIME(:start_time)
                AND a.end_time >= TIME(:end_time)
                AND s.id NOT IN (
                    SELECT rs.staff_id
                    FROM ReservationStaff rs
                    JOIN reservations r ON rs.reservation_id = r.reservation_id
                    WHERE r.status != 'cancelled'
                    AND (r.start_time < :end_time_check AND r.end_time > :start_time_check)
                )
            ";

            $params = [
                ':day_of_week' => $dayOfWeek,
                ':start_time' => $normalizedStartDateTime,
                ':end_time' => $normalizedEndDateTime,
                ':start_time_check' => $normalizedStartDateTime,
                ':end_time_check' => $normalizedEndDateTime
            ];

            $eventConflictClause = '';
            $eventStaffTable = get_existing_table_name($conn, ['event_staff', 'EventStaff']);
            if ($eventStaffTable !== null && table_exists($conn, 'events')) {
                $eventStaffColumns = get_table_columns($conn, $eventStaffTable);
                $eventsColumns = get_table_columns($conn, 'events');

                $eventStaffIdColumn = pick_column($eventStaffColumns, ['staff_id']);
                $eventStaffEventColumn = pick_column($eventStaffColumns, ['event_id']);
                $eventIdColumn = pick_column($eventsColumns, ['event_id', 'id']);
                $eventStartColumn = pick_column($eventsColumns, ['start_time', 'start', 'start_at']);
                $eventEndColumn = pick_column($eventsColumns, ['end_time', 'end', 'end_at']);

                if ($eventStaffIdColumn && $eventStaffEventColumn && $eventIdColumn && $eventStartColumn && $eventEndColumn) {
                    $eventConflictClause = "
                        AND s.id NOT IN (
                            SELECT es." . quote_identifier($eventStaffIdColumn) . "
                            FROM " . quote_identifier($eventStaffTable) . " es
                            JOIN events e ON es." . quote_identifier($eventStaffEventColumn) . " = e." . quote_identifier($eventIdColumn) . "
                            WHERE e." . quote_identifier($eventStartColumn) . " < :event_end_check
                              AND e." . quote_identifier($eventEndColumn) . " > :event_start_check
                        )
                    ";

                    $params[':event_end_check'] = $normalizedEndDateTime;
                    $params[':event_start_check'] = $normalizedStartDateTime;
                }
            }

            $sql .= $eventConflictClause;

            if ($staffId !== null && $staffId !== '') {
                $sql .= " AND s.id = :staff_id";
                $params[':staff_id'] = $staffId;
            }

            $sql .= " GROUP BY s.id, s.name, s.role ORDER BY s.id ASC";

            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            $availableStaff = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'available_staff' => $availableStaff,
                'data' => $availableStaff
            ]);
            exit;
        }

        $sql = "SELECT availability_id, staff_id, day_of_week, start_time, end_time, is_available FROM availability";
        $params = [];

        if ($staffId !== null && $staffId !== '') {
            $sql .= " WHERE staff_id = :staff_id";
            $params[':staff_id'] = $staffId;
        }

        $sql .= " ORDER BY staff_id ASC, FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), start_time ASC";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $rows]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        $input = [];
    }

    $staffId = $input['staff_id'] ?? null;
    $dayOfWeek = trim((string)($input['day_of_week'] ?? ''));
    $startTime = $input['start_time'] ?? null;
    $endTime = $input['end_time'] ?? null;
    $isAvailable = $input['is_available'] ?? 1;

    $allowedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!$staffId || !$startTime || !$endTime) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'staff_id, start_time, and end_time are required.'
        ]);
        exit;
    }

    $startTimestamp = strtotime((string)$startTime);
    $endTimestamp = strtotime((string)$endTime);
    if ($startTimestamp === false || $endTimestamp === false || $endTimestamp <= $startTimestamp) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'start_time and end_time must be valid times, and end_time must be after start_time.'
        ]);
        exit;
    }

    if ($dayOfWeek === '') {
        $dayOfWeek = date('l', $startTimestamp);
    }

    if (!in_array($dayOfWeek, $allowedDays, true)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'day_of_week must be one of Monday through Sunday.'
        ]);
        exit;
    }

    $normalizedStart = date('H:i:s', $startTimestamp);
    $normalizedEnd = date('H:i:s', $endTimestamp);

    $isAvailableFlag = (int)!in_array(strtolower((string)$isAvailable), ['0', 'false', 'no', 'off'], true);

    try {
        $sql = "
            INSERT INTO availability (staff_id, day_of_week, start_time, end_time, is_available)
            VALUES (:staff_id, :day_of_week, :start_time, :end_time, :is_available)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':staff_id' => (int)$staffId,
            ':day_of_week' => $dayOfWeek,
            ':start_time' => $normalizedStart,
            ':end_time' => $normalizedEnd,
            ':is_available' => $isAvailableFlag
        ]);

        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        $input = [];
    }

    $staffId = $input['staff_id'] ?? null;
    $dayOfWeek = trim((string)($input['day_of_week'] ?? ''));
    $startTime = $input['start_time'] ?? null;
    $endTime = $input['end_time'] ?? null;
    $isAvailable = $input['is_available'] ?? 1;

    $allowedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!$staffId || !in_array($dayOfWeek, $allowedDays, true)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'staff_id and a valid day_of_week are required.'
        ]);
        exit;
    }

    $isAvailableFlag = (int)!in_array(strtolower((string)$isAvailable), ['0', 'false', 'no', 'off'], true);

    if ($isAvailableFlag === 1) {
        if (!$startTime || !$endTime) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'start_time and end_time are required when is_available is true.'
            ]);
            exit;
        }

        $startTimestamp = strtotime((string)$startTime);
        $endTimestamp = strtotime((string)$endTime);
        if ($startTimestamp === false || $endTimestamp === false || $endTimestamp <= $startTimestamp) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'start_time and end_time must be valid times, and end_time must be after start_time.'
            ]);
            exit;
        }

        $normalizedStart = date('H:i:s', $startTimestamp);
        $normalizedEnd = date('H:i:s', $endTimestamp);
    } else {
        $normalizedStart = null;
        $normalizedEnd = null;
    }

    try {
        $conn->beginTransaction();

        $deleteSql = "DELETE FROM availability WHERE staff_id = :staff_id AND day_of_week = :day_of_week";
        $deleteStmt = $conn->prepare($deleteSql);
        $deleteStmt->execute([
            ':staff_id' => (int)$staffId,
            ':day_of_week' => $dayOfWeek
        ]);

        if ($isAvailableFlag === 1) {
            $insertSql = "
                INSERT INTO availability (staff_id, day_of_week, start_time, end_time, is_available)
                VALUES (:staff_id, :day_of_week, :start_time, :end_time, 1)
            ";
            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->execute([
                ':staff_id' => (int)$staffId,
                ':day_of_week' => $dayOfWeek,
                ':start_time' => $normalizedStart,
                ':end_time' => $normalizedEnd
            ]);
        }

        $conn->commit();

        echo json_encode([
            'success' => true,
            'day_of_week' => $dayOfWeek,
            'is_available' => $isAvailableFlag
        ]);
    } catch (PDOException $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode([
    'success' => false,
    'message' => 'Method not allowed.'
]);
?>
