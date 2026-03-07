<?php
session_start();
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
include_once 'api.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

// MUST BE LOGGED IN
if (!isset($_SESSION['user']) || !isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];

// --- Helper to read .env file ---
$envFile = __DIR__ . '/../.env'; 
$envVariables = file_exists($envFile) ? parse_ini_file($envFile) : [];

$uploadDir = $envVariables['UPLOAD_DIR'] ?? '../frontend/public/uploads/avatars/';
$maxSize = $envVariables['MAX_UPLOAD_SIZE'] ?? 5242880; // 5MB limit
$allowedExts = explode(',', $envVariables['ALLOWED_EXTENSIONS'] ?? 'jpg,jpeg,png,webp');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
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
            $dbPath = '/uploads/avatars/' . $newFileName; 
            
            $stmt = $conn->prepare("UPDATE users SET profile_image = :image_path WHERE id = :id");
            $stmt->execute([':image_path' => $dbPath, ':id' => $userId]);

            echo json_encode(['success' => true, 'message' => 'Avatar saved!', 'image_url' => $dbPath]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database update failed.']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save file. Check folder permissions.']);
    }
    exit;
}