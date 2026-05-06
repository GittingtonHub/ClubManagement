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
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    include_once 'api.php'; 

    function tableExists(PDO $conn, string $tableName): bool {
        $stmt = $conn->prepare('SHOW TABLES LIKE :table_name');
        $stmt->execute([':table_name' => $tableName]);
        return (bool)$stmt->fetchColumn();
    }

    function getExistingTableName(PDO $conn, array $candidates): ?string {
        foreach ($candidates as $candidate) {
            if (tableExists($conn, $candidate)) {
                return $candidate;
            }
        }
        return null;
    }

    // Handle preflight OPTIONS request for CORS
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit;
    }

    // =========================================================
    // 🔒 SECURITY CHECK: MUST BE LOGGED IN AS STAFF OR ADMIN
    // =========================================================
    if (!isset($_SESSION['user']) || !isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
        exit;
    }

    $sessionRole = $_SESSION['user']['role'] ?? ($_SESSION['user']['privilege'] ?? 'user');
    if ($sessionRole !== 'admin' && $sessionRole !== 'staff') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Forbidden. Analytics are restricted to staff and admins.']);
        exit;
    }

    $action = $_GET['action'] ?? '';

    try {
        switch ($action) {
            
            // ---------------------------------------------------------
            // ACTION 1: USERS BLOCK
            // ---------------------------------------------------------
            case 'users':
                // All-time registered users
                $totalUsersStmt = $conn->query("SELECT COUNT(*) as total FROM users");
                $totalUsers = $totalUsersStmt->fetch(PDO::FETCH_ASSOC)['total'];

                // Unique reserving users this month
                $uniqueUsersStmt = $conn->query("
                    SELECT COUNT(DISTINCT user_id) as active_this_month 
                    FROM reservations 
                    WHERE start_time >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
                    AND start_time < DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01')
                    AND status != 'cancelled'
                ");
                $activeUsers = $uniqueUsersStmt->fetch(PDO::FETCH_ASSOC)['active_this_month'];

                echo json_encode([
                    'success' => true, 
                    'data' => [
                        'total_users' => (int)$totalUsers,
                        'unique_active_this_month' => (int)$activeUsers
                    ]
                ]);
                break;

            // ---------------------------------------------------------
            // 2: CLUB EVENTS & RESERVATIONS BLOCK
            // ---------------------------------------------------------
            case 'events':
                // Note: Because the architecture saves Event Tickets directly into the reservations table, counting reservations automatically includes both
                
                // All-time reservations (+ event tickets)
                $allTimeStmt = $conn->query("SELECT COUNT(*) as total FROM reservations WHERE status != 'cancelled'");
                $allTimeTotal = $allTimeStmt->fetch(PDO::FETCH_ASSOC)['total'];

                // Current month reservations (+ event tickets)
                $monthlyStmt = $conn->query("
                    SELECT COUNT(*) as monthly_total 
                    FROM reservations 
                    WHERE start_time >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
                    AND start_time < DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01')
                    AND status != 'cancelled'
                ");
                $monthlyTotal = $monthlyStmt->fetch(PDO::FETCH_ASSOC)['monthly_total'];

                echo json_encode([
                    'success' => true, 
                    'data' => [
                        'all_time_reservations' => (int)$allTimeTotal,
                        'monthly_reservations' => (int)$monthlyTotal
                    ]
                ]);
                break;

            // ---------------------------------------------------------
            // 3: TOP 3 LEADERBOARDS BLOCK
            // ---------------------------------------------------------
            case 'top3':
                // Top 3 Resources/Events this month
                $topResources = $conn->query("
                    SELECT service_type as name, COUNT(*) as count 
                    FROM reservations 
                    WHERE start_time >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
                    AND start_time < DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01')
                    AND status != 'cancelled' 
                    GROUP BY service_type 
                    ORDER BY count DESC 
                    LIMIT 3
                ")->fetchAll(PDO::FETCH_ASSOC);

                // Top 3 Staff this month (by assigned shifts)
                $reservationStaffTable = getExistingTableName($conn, ['ReservationStaff', 'reservation_staff']);
                if ($reservationStaffTable) {
                    $topStaff = $conn->query("
                        SELECT s.name, COUNT(rs.reservation_id) as count 
                        FROM staff s
                        JOIN {$reservationStaffTable} rs ON s.id = rs.staff_id
                        JOIN reservations r ON rs.reservation_id = r.reservation_id
                        WHERE r.start_time >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
                        AND r.start_time < DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01')
                        AND r.status != 'cancelled'
                        AND s.removed = 0
                        GROUP BY s.id, s.name 
                        ORDER BY count DESC 
                        LIMIT 3
                    ")->fetchAll(PDO::FETCH_ASSOC);
                } else {
                    $topStaff = [];
                }

                // Top 3 Users this month (by most reservations made)
                $userColumnsStmt = $conn->query("SHOW COLUMNS FROM users");
                $userColumns = $userColumnsStmt->fetchAll(PDO::FETCH_COLUMN, 0);
                $userDisplayExpression = "CAST(u.id AS CHAR)";
                if (in_array('name', $userColumns, true)) {
                    $userDisplayExpression = "u.name";
                } elseif (in_array('username', $userColumns, true)) {
                    $userDisplayExpression = "u.username";
                } elseif (in_array('first_name', $userColumns, true) && in_array('last_name', $userColumns, true)) {
                    $userDisplayExpression = "TRIM(CONCAT_WS(' ', u.first_name, u.last_name))";
                } elseif (in_array('email', $userColumns, true)) {
                    $userDisplayExpression = "u.email";
                }

                $topUsers = $conn->query("
                    SELECT {$userDisplayExpression} as name, COUNT(r.reservation_id) as count 
                    FROM users u
                    JOIN reservations r ON u.id = r.user_id
                    WHERE r.start_time >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
                    AND r.start_time < DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01')
                    AND r.status != 'cancelled'
                    GROUP BY u.id, {$userDisplayExpression}
                    ORDER BY count DESC 
                    LIMIT 3
                ")->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true, 
                    'data' => [
                        'top_resources' => $topResources,
                        'top_staff' => $topStaff,
                        'top_users' => $topUsers
                    ]
                ]);
                break;

            // ---------------------------------------------------------
            // ACTION 4: CANCELLATIONS BLOCK
            // ---------------------------------------------------------
            case 'cancellations':
                // Total All-Time Cancellations
                $totalCancellationsStmt = $conn->query("SELECT COUNT(*) as total FROM reservations WHERE status = 'cancelled'");
                $totalCancellations = $totalCancellationsStmt->fetch(PDO::FETCH_ASSOC)['total'];

                // Cancellations this month
                $monthlyCancellationsStmt = $conn->query("
                    SELECT COUNT(*) as monthly_total 
                    FROM reservations 
                    WHERE status = 'cancelled' 
                    AND start_time >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
                    AND start_time < DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01')
                ");
                $monthlyCancellations = $monthlyCancellationsStmt->fetch(PDO::FETCH_ASSOC)['monthly_total'];

                // Cancellations this month by Category (Service Type)
                $cancellationsByCategory = $conn->query("
                    SELECT service_type as category, COUNT(*) as count 
                    FROM reservations 
                    WHERE status = 'cancelled' 
                    AND start_time >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
                    AND start_time < DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01')
                    GROUP BY service_type 
                    ORDER BY count DESC
                ")->fetchAll(PDO::FETCH_ASSOC);

                // Bonus: Cancellations this month by Reason (Great for Admin Audit!)
                $cancellationsByReason = $conn->query("
                    SELECT COALESCE(cancellation_reason, 'No Reason Given') as reason, COUNT(*) as count 
                    FROM reservations 
                    WHERE status = 'cancelled' 
                    AND start_time >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
                    AND start_time < DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01')
                    GROUP BY cancellation_reason 
                    ORDER BY count DESC
                ")->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true, 
                    'data' => [
                        'total_cancellations' => (int)$totalCancellations,
                        'monthly_cancellations' => (int)$monthlyCancellations,
                        'by_category' => $cancellationsByCategory,
                        'by_reason' => $cancellationsByReason
                    ]
                ]);
                break;
            
            // ---------------------------------------------------------
            // ACTION 5: RATINGS & REVIEWS 
            // ---------------------------------------------------------
            case 'ratings':
                // Overall Average Rating & Total Ratings Count
                $overallStmt = $conn->query("
                    SELECT 
                        ROUND(AVG(rating), 1) as average_rating, 
                        COUNT(rating) as total_ratings 
                    FROM reservations 
                    WHERE rating IS NOT NULL
                ");
                $overallStats = $overallStmt->fetch(PDO::FETCH_ASSOC);

                // Average Rating by Service Type (e.g., Bottle Service vs Event Ticket)
                $byServiceStmt = $conn->query("
                    SELECT 
                        service_type, 
                        ROUND(AVG(rating), 1) as average_rating, 
                        COUNT(rating) as total_ratings 
                    FROM reservations 
                    WHERE rating IS NOT NULL 
                    GROUP BY service_type 
                    ORDER BY average_rating DESC
                ");
                $byServiceStats = $byServiceStmt->fetchAll(PDO::FETCH_ASSOC);

                // The 5 Most Recent Ratings
                $recentStmt = $conn->query("
                    SELECT 
                        r.reservation_id, 
                        r.service_type, 
                        r.rating, 
                        u.username, 
                        r.start_time 
                    FROM reservations r
                    JOIN users u ON r.user_id = u.id
                    WHERE r.rating IS NOT NULL
                    ORDER BY r.start_time DESC
                    LIMIT 5
                ");
                $recentRatings = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true, 
                    'data' => [
                        'overall' => [
                            'average' => (float)$overallStats['average_rating'],
                            'total_count' => (int)$overallStats['total_ratings']
                        ],
                        'by_service' => $byServiceStats,
                        'recent_ratings' => $recentRatings
                    ]
                ]);
                break;
            // ---------------------------------------------------------
            // DEFAULT FALLBACK
            // ---------------------------------------------------------
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid or missing analytics action.']);
                break;
        }

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error generating analytics: ' . $e->getMessage()]);
    }
    exit;
?>
