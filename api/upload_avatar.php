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

function resolve_upload_dir(string $defaultPath, ?string $requestedPath = null) {
    $candidatePath = trim((string)($requestedPath ?? ''));
    $rawPath = $candidatePath !== '' ? $candidatePath : trim((string)$defaultPath);
    $isAbsolutePath = preg_match('/^(\/|[A-Za-z]:[\\\\\/])/', $rawPath) === 1;

    if ($isAbsolutePath) {
        $uploadDir = rtrim($rawPath, '/\\');
    } else {
        $projectRoot = realpath(__DIR__ . '/..');
        if ($projectRoot === false) {
            return false;
        }
        $relativePath = trim(str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $rawPath), DIRECTORY_SEPARATOR);
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
    $uploadType = strtolower(trim((string)($_POST['upload_type'] ?? 'profile')));
    $isPosterUpload = $uploadType === 'event_poster';

    if ($isPosterUpload) {
        $userRole = $_SESSION['user']['role'] ?? $_SESSION['user']['privilege'] ?? '';
        if (!in_array($userRole, ['staff', 'admin'], true)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Only staff/admin users can upload event posters.']);
            exit;
        }
    }

    $defaultUploadPath = $isPosterUpload
        ? (DB_POSTER_PATH ?: 'api/private_uploads/posters')
        : (DB_PFP_PATH ?: 'api/private_uploads/avatars');
    $requestedUploadPath = $_POST['upload_path'] ?? null;
    $uploadDir = resolve_upload_dir((string)$defaultUploadPath, is_string($requestedUploadPath) ? $requestedUploadPath : null);
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

    $file = null;
    if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['avatar'];
    } elseif (isset($_FILES['poster']) && $_FILES['poster']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['poster'];
    }

    if ($file === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No file uploaded or an error occurred.']);
        exit;
    }

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
    $eventId = isset($_POST['event_id']) ? (int)$_POST['event_id'] : 0;
    if ($isPosterUpload) {
        $namePrefix = $eventId > 0 ? ('event_' . $eventId) : ('event_temp_user_' . $userId);
        $newFileName = $namePrefix . '_' . time() . '.' . $fileExt;
    } else {
        $newFileName = 'user_' . $userId . '_' . time() . '.' . $fileExt;
    }
    $destination = $uploadDir . $newFileName;

    if (move_uploaded_file($file['tmp_name'], $destination)) {
        try {
            $dbValue = $newFileName;
            if ($isPosterUpload) {
                $eventsColumnsStmt = $conn->query("SHOW COLUMNS FROM events");
                $eventsColumns = $eventsColumnsStmt->fetchAll(PDO::FETCH_COLUMN, 0);
                $posterColumn = in_array('poster_image', $eventsColumns, true)
                    ? 'poster_image'
                    : (in_array('event_poster', $eventsColumns, true) ? 'event_poster' : null);

                if ($posterColumn === null) {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Events table is missing poster column (poster_image/event_poster).'
                    ]);
                    exit;
                }

                if ($eventId > 0) {
                    $eventIdColumn = in_array('event_id', $eventsColumns, true) ? 'event_id' : (in_array('id', $eventsColumns, true) ? 'id' : null);
                    if ($eventIdColumn === null) {
                        http_response_code(500);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Events table is missing event id column (event_id/id).'
                        ]);
                        exit;
                    }

                    $stmt = $conn->prepare("UPDATE events SET {$posterColumn} = :poster_path WHERE {$eventIdColumn} = :event_id");
                    $stmt->execute([':poster_path' => $dbValue, ':event_id' => $eventId]);
                }

                echo json_encode([
                    'success' => true,
                    'message' => 'Event poster uploaded.',
                    'event_poster_path' => $dbValue
                ]);
            } else {
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
            }
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
