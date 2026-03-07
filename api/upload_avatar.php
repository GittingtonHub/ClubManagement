<?php
session_start();
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
include_once 'api.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

// MUST BE LOGGED IN
if (!isset($_SESSION['user_id']) && isset($_SESSION['user']['id'])) {
    $_SESSION['user_id'] = $_SESSION['user']['id'];
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];

function resolveAvatarUploadDir() {
    $rawProfilePath = trim((string) (DB_PFP_PATH ?: 'api/private_uploads/avatars'));
    $isAbsolutePath = preg_match('/^(\/|[A-Za-z]:[\\\\\/])/', $rawProfilePath) === 1;

    if ($isAbsolutePath) {
        $uploadDir = rtrim($rawProfilePath, '/\\');
    } else {
        $projectRoot = realpath(__DIR__ . '/..');
        if ($projectRoot === false) {
            return false;
        }
        $relativePath = trim(str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $rawProfilePath), DIRECTORY_SEPARATOR);
        $uploadDir = rtrim($projectRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $relativePath;
    }

    if (substr($uploadDir, -1) !== DIRECTORY_SEPARATOR) {
        $uploadDir .= DIRECTORY_SEPARATOR;
    }

    return $uploadDir;
}

$maxSize = 5 * 1024 * 1024; // 5MB
$allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $uploadDir = resolveAvatarUploadDir();
    if ($uploadDir === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to resolve upload folder path.']);
        exit;
    }
    if (!is_dir($uploadDir)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Upload folder does not exist: ' . $uploadDir]);
        exit;
    }
    if (!is_writable($uploadDir)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Upload folder is not writable: ' . $uploadDir]);
        exit;
    }

    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No file uploaded or an error occurred.']);
        exit;
    }

    $file = $_FILES['avatar'];

    // Validate Size & Type
    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'File exceeds 5MB.']);
        exit;
    }

    $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($fileExt, $allowedExts)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid file type.']);
        exit;
    }

    // Generate unique name and move file
    $newFileName = 'user_' . $userId . '_' . time() . '.' . $fileExt;
    $destination = $uploadDir . $newFileName;

    if (move_uploaded_file($file['tmp_name'], $destination)) {
        try {
            $dbValue = $newFileName;

            $columnsStmt = $conn->query("SHOW COLUMNS FROM users");
            $columns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN, 0);
            $avatarColumn = in_array('profile_image', $columns, true)
                ? 'profile_image'
                : (in_array('avatar_url', $columns, true) ? 'avatar_url' : null);

            if ($avatarColumn === null) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Users table is missing profile image column (profile_image/avatar_url).'
                ]);
                exit;
            }

            $stmt = $conn->prepare("UPDATE users SET {$avatarColumn} = :image_path WHERE id = :id");
            $stmt->execute([':image_path' => $dbValue, ':id' => $userId]);

            echo json_encode([
                'success' => true,
                'message' => 'Avatar saved!',
                'image_url' => '/api/profile-avatar.php?v=' . time()
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database update failed: ' . $e->getMessage()]);
        }
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save file. Check folder permissions.']);
    }
    exit;
}
