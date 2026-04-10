<?php
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Allow-Methods: GET, PUT, OPTIONS");
    header("Content-Type: application/json; charset=UTF-8");

    include_once 'api.php';

    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'OPTIONS') exit;

    function extractEnumValues($columnType) {
        if (!is_string($columnType) || stripos($columnType, "enum(") !== 0) {
            return [];
        }

        preg_match_all("/'([^']+)'/", $columnType, $matches);
        return $matches[1] ?? [];
    }

    function getRoleColumnsInfo($conn) {
        $columnsStmt = $conn->query("SHOW COLUMNS FROM users");
        $columns = $columnsStmt->fetchAll(PDO::FETCH_ASSOC);
        $roleColumns = [];

        foreach ($columns as $column) {
            $fieldName = $column['Field'] ?? null;
            if ($fieldName === 'role' || $fieldName === 'privilege') {
                $roleColumns[$fieldName] = $column;
            }
        }

        return $roleColumns;
    }

    function getAvailableRolesFromDatabase($conn, $roleColumns) {
        $roles = [];

        foreach ($roleColumns as $column) {
            $enumRoles = extractEnumValues($column['Type'] ?? '');
            foreach ($enumRoles as $enumRole) {
                if ($enumRole !== '') {
                    $roles[] = $enumRole;
                }
            }
        }

        foreach (array_keys($roleColumns) as $columnName) {
            $distinctStmt = $conn->query("SELECT DISTINCT {$columnName} AS role_value FROM users WHERE {$columnName} IS NOT NULL AND TRIM({$columnName}) <> ''");
            $distinctRoles = $distinctStmt->fetchAll(PDO::FETCH_COLUMN, 0);
            foreach ($distinctRoles as $dbRole) {
                if (is_string($dbRole) && trim($dbRole) !== '') {
                    $roles[] = trim($dbRole);
                }
            }
        }

        $roles = array_values(array_unique($roles));
        natcasesort($roles);

        return array_values($roles);
    }

    session_start();
    // 🔒 SECURITY: Must be logged in AND be an admin
    $sessionRole = $_SESSION['user']['role'] ?? ($_SESSION['user']['privilege'] ?? 'user');
    if (!isset($_SESSION['user_id']) || $sessionRole !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Forbidden: Admins only.']);
        exit;
    }
    exit;

    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $target_user_id = $input['user_id'] ?? null;
        $new_role = $input['new_role'] ?? null;
        $isPromotingToStaff = (strtolower($new_role) === 'staff');

        try {
            $roleColumns = getRoleColumnsInfo($conn);
            $allowedRoles = getAvailableRolesFromDatabase($conn, $roleColumns);
            
            if (!$target_user_id || !in_array($new_role, $allowedRoles, true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid user or role.']);
                exit;
            }

            // Just update the user privilege
            $updateParts = [];
            if (array_key_exists('privilege', $roleColumns)) $updateParts[] = "privilege = :role";
            if (array_key_exists('role', $roleColumns)) $updateParts[] = "role = :role";

            $sql = "UPDATE users SET " . implode(', ', $updateParts) . " WHERE id = :uid";
            $stmt = $conn->prepare($sql);
            $stmt->execute([':role' => $new_role, ':uid' => $target_user_id]);

            echo json_encode(['success' => true, 'message' => "User privilege updated.",'trigger_staff_update' => $isPromotingToStaff, 'new_role' => $new_role]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error.']);
        }

        exit;


    }


    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
?>
