<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

// Admin Security Check
$sessionRole = $_SESSION['user']['role'] ?? ($_SESSION['user']['privilege'] ?? 'user');
if (!isset($_SESSION['user_id']) || $sessionRole !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $user_id = filter_var($input['user_id'] ?? 0, FILTER_VALIDATE_INT);
    $original_user_id = $user_id;
    $name = substr(trim($input['name'] ?? ''), 0, 100);
    $role = trim($input['role'] ?? '');
    $rate = filter_var($input['hourly_rate'] ?? -1, FILTER_VALIDATE_FLOAT);

    if ($user_id <= 0 || empty($name) || empty($role) || $rate < 0 || $rate > 999.99) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid input data']);
        exit;
    }

    try {
        $conn->beginTransaction();

        // Ensure target user exists.
        $userExistsStmt = $conn->prepare("SELECT id FROM users WHERE id = :uid LIMIT 1");
        $userExistsStmt->execute([':uid' => $user_id]);
        if (!$userExistsStmt->fetch(PDO::FETCH_ASSOC)) {
            $conn->rollBack();
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Target user not found.']);
            exit;
        }

        // If this user already has a staff row, update it.
        $check = $conn->prepare("SELECT id FROM staff WHERE user_id = :uid ORDER BY id ASC LIMIT 1");
        $check->execute([':uid' => $user_id]);
        $existingStaff = $check->fetch(PDO::FETCH_ASSOC);

        if ($existingStaff) {
            $staff_id = (int)$existingStaff['id'];
            $sql = "UPDATE staff
                    SET name = :name, role = :role, hourly_rate = :rate, removed = 0
                    WHERE id = :sid
                    LIMIT 1";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':name' => $name,
                ':role' => $role,
                ':rate' => $rate,
                ':sid' => $staff_id
            ]);
        } else {
            // Requested behavior:
            // Keep staff.id and users.id synced for newly promoted staff.
            // 1) If staff.id = users.id is free, insert using that exact id.
            // 2) If occupied, create next free staff.id and write it back to users.id.
            $idCollisionStmt = $conn->prepare("SELECT id FROM staff WHERE id = :sid LIMIT 1");
            $idCollisionStmt->execute([':sid' => $user_id]);
            $hasIdCollision = (bool)$idCollisionStmt->fetch(PDO::FETCH_ASSOC);

            if (!$hasIdCollision) {
                $insertSql = "INSERT INTO staff (id, user_id, name, role, hourly_rate, employment_type, removed)
                              VALUES (:sid, :uid, :name, :role, :rate, 'part_time', 0)";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->execute([
                    ':sid' => $user_id,
                    ':uid' => $user_id,
                    ':name' => $name,
                    ':role' => $role,
                    ':rate' => $rate
                ]);
                $staff_id = $user_id;
            } else {
                // Insert with NULL user_id first to avoid FK issues while remapping users.id.
                $insertSql = "INSERT INTO staff (user_id, name, role, hourly_rate, employment_type, removed)
                              VALUES (NULL, :name, :role, :rate, 'part_time', 0)";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->execute([
                    ':name' => $name,
                    ':role' => $role,
                    ':rate' => $rate
                ]);
                $staff_id = (int)$conn->lastInsertId();

                $updateUserIdStmt = $conn->prepare("UPDATE users SET id = :new_uid WHERE id = :old_uid LIMIT 1");
                $updateUserIdStmt->execute([
                    ':new_uid' => $staff_id,
                    ':old_uid' => $original_user_id
                ]);

                if ($updateUserIdStmt->rowCount() === 0) {
                    $conn->rollBack();
                    http_response_code(409);
                    echo json_encode(['success' => false, 'message' => 'Unable to remap user id to new staff id.']);
                    exit;
                }

                $linkStaffStmt = $conn->prepare("UPDATE staff SET user_id = :new_uid WHERE id = :sid LIMIT 1");
                $linkStaffStmt->execute([
                    ':new_uid' => $staff_id,
                    ':sid' => $staff_id
                ]);

                $user_id = $staff_id;
            }
        }

        $conn->commit();
        echo json_encode([
            'success' => true,
            'staff_id' => $staff_id,
            'user_id' => $user_id,
            'previous_user_id' => $original_user_id
        ]);
    } catch (PDOException $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]);
    }
    exit;
}
