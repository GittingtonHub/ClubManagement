<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, PUT, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    exit;
}

function extract_enum_values($columnType): array
{
    if (!is_string($columnType) || stripos($columnType, 'enum(') !== 0) {
        return [];
    }

    preg_match_all("/'([^']+)'/", $columnType, $matches);
    return $matches[1] ?? [];
}

function get_role_columns_info(PDO $conn): array
{
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

function get_available_roles_from_database(PDO $conn, array $roleColumns): array
{
    $roles = [];

    foreach ($roleColumns as $column) {
        $enumRoles = extract_enum_values($column['Type'] ?? '');
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
$sessionRole = $_SESSION['user']['role'] ?? ($_SESSION['user']['privilege'] ?? ($_SESSION['role'] ?? 'user'));
if (!isset($_SESSION['user_id']) || $sessionRole !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden: Admins only.']);
    exit;
}

if ($method === 'GET') {
    try {
        $roleColumns = get_role_columns_info($conn);
        $allowedRoles = get_available_roles_from_database($conn, $roleColumns);
        echo json_encode(['success' => true, 'roles' => $allowedRoles]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error.']);
    }
    exit;
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = [];
    }

    $targetUserId = isset($input['user_id']) ? (int)$input['user_id'] : 0;
    $newRole = isset($input['new_role']) ? trim((string)$input['new_role']) : '';

    try {
        $roleColumns = get_role_columns_info($conn);
        $allowedRoles = get_available_roles_from_database($conn, $roleColumns);

        if ($targetUserId <= 0 || $newRole === '' || !in_array($newRole, $allowedRoles, true)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid user or role.']);
            exit;
        }

        if (empty($roleColumns)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'User role columns are missing.']);
            exit;
        }

        $updateParts = [];
        if (array_key_exists('privilege', $roleColumns)) {
            $updateParts[] = 'privilege = :role';
        }
        if (array_key_exists('role', $roleColumns)) {
            $updateParts[] = 'role = :role';
        }

        $sql = 'UPDATE users SET ' . implode(', ', $updateParts) . ' WHERE id = :uid';
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':role' => $newRole,
            ':uid' => $targetUserId
        ]);

        if ($stmt->rowCount() === 0) {
            $checkStmt = $conn->prepare('SELECT id FROM users WHERE id = :uid LIMIT 1');
            $checkStmt->execute([':uid' => $targetUserId]);
            if (!$checkStmt->fetch(PDO::FETCH_ASSOC)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'User not found.']);
                exit;
            }
        }

        $isPromotingToStaff = (strtolower($newRole) === 'staff');
        echo json_encode([
            'success' => true,
            'message' => 'User privilege updated.',
            'trigger_staff_update' => $isPromotingToStaff,
            'new_role' => $newRole
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
