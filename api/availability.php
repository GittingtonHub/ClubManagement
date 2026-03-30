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

if ($method === 'GET') {
    $staffId = $_GET['staff_id'] ?? null;
    $startTime = $_GET['start_time'] ?? null;
    $endTime = $_GET['end_time'] ?? null;

    try {
        if ($startTime && $endTime) {
            $startTimestamp = strtotime($startTime);
            $endTimestamp = strtotime($endTime);

            if ($startTimestamp === false || $endTimestamp === false || $endTimestamp <= $startTimestamp) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'start_time and end_time must be valid, and end_time must be after start_time.'
                ]);
                exit;
            }

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
                AND a.day_of_week = DAYNAME(:start_date)
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
                ':start_date' => $startTime,
                ':start_time' => $startTime,
                ':end_time' => $endTime,
                ':start_time_check' => $startTime,
                ':end_time_check' => $endTime
            ];

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
    if (!$staffId || !in_array($dayOfWeek, $allowedDays, true) || !$startTime || !$endTime) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'staff_id, day_of_week, start_time, and end_time are required.'
        ]);
        exit;
    }

    $normalizedStart = date('H:i:s', strtotime($startTime));
    $normalizedEnd = date('H:i:s', strtotime($endTime));
    if (!$normalizedStart || !$normalizedEnd || $normalizedEnd <= $normalizedStart) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'start_time and end_time must be valid times, and end_time must be after start_time.'
        ]);
        exit;
    }

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

http_response_code(405);
echo json_encode([
    'success' => false,
    'message' => 'Method not allowed.'
]);
?>
