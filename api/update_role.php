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

if ($method === 'GET') {
    try {
        $roleColumns = getRoleColumnsInfo($conn);
        $availableRoles = getAvailableRolesFromDatabase($conn, $roleColumns);

        echo json_encode([
            'success' => true,
            'roles' => $availableRoles
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error fetching roles.']);
    }
    exit;
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $target_user_id = $input['user_id'] ?? null;
    $new_role = $input['new_role'] ?? null;

    $hourlyRate = $input['hourly_rate'] ?? 15; // default hourly rate for staff
    $employmentType = $input['employment_type'] ?? 'part-time'; // default employment


    try {
        $roleColumns = getRoleColumnsInfo($conn);
        $allowedRoles = getAvailableRolesFromDatabase($conn, $roleColumns);
        
        if (!$target_user_id || !is_string($new_role) || !in_array($new_role, $allowedRoles, true)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Valid user_id and new_role are required.']);
            exit;
        }

        $conn->beginTransaction();

        // 1. Update the USERS table
        $updateParts = [];
        if (array_key_exists('privilege', $roleColumns)) $updateParts[] = "privilege = :role";
        if (array_key_exists('role', $roleColumns)) $updateParts[] = "role = :role";

        $sql = "UPDATE users SET " . implode(', ', $updateParts) . " WHERE id = :uid";
        $stmt = $conn->prepare($sql);
        $stmt->execute([':role' => $new_role, ':uid' => $target_user_id]);

        // 2. ROLE ELEVATION: If promoted to staff, create a staff record
        if (strtolower($new_role) === 'staff') {
            // Check if they already have a staff record (even if it was soft-deleted)
            $checkStaff = $conn->prepare("SELECT id FROM staff WHERE user_id = :uid");
            $checkStaff->execute([':uid' => $target_user_id]);
            $existingStaff = $checkStaff->fetch();

            if (!$existingStaff) {
                // Get the username from users to use as the staff 'name'
                $userStmt = $conn->prepare("SELECT username FROM users WHERE id = :uid");
                $userStmt->execute([':uid' => $target_user_id]);
                $userData = $userStmt->fetch();
                $staffName = $userData['username'] ?? 'New Staff';


                // INSERT into staff table with default values
                $insertStaff = $conn->prepare("
                    INSERT INTO staff (user_id, name, role, hourly_rate, employment_type, removed) 
                    VALUES (:uid, :name, :role, :hourly_rate, :employment_type, 0)
                ");
                $insertStaff->execute([
                    ':uid' => $target_user_id,
                    ':name' => $staffName,
                    ':role'=> $new_role,
                    ':hourly_rate' => $hourlyRate,
                    ':employment_type' => $employmentType
                ]);
            } else { // If they existed but were soft-deleted, just un-delete them!
                $unDeleteStaff = $conn->prepare("UPDATE staff SET removed = 0 WHERE user_id = :uid");
                $unDeleteStaff->execute([':uid' => $target_user_id]);
            }
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => "User promoted and staff record linked."]);
    } catch (PDOException $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
?>
