<?php
session_start();
ini_set('display_errors', '0');
error_reporting(E_ALL);

if (!isset($_SESSION['user']) || !isset($_SESSION['user']['id'])) {
    http_response_code(401);
    exit;
}

require_once __DIR__ . '/config.php';

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

function streamImageFile($path) {
    if (!is_file($path) || !is_readable($path)) {
        return false;
    }

    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = $finfo ? finfo_file($finfo, $path) : false;
    if ($finfo) {
        finfo_close($finfo);
    }
    if (!$mimeType) {
        $mimeType = 'application/octet-stream';
    }

    header_remove('Content-Length');
    header('Content-Type: ' . $mimeType);
    header('Cache-Control: private, max-age=300');
    $stream = fopen($path, 'rb');
    if ($stream === false) {
        return false;
    }
    fpassthru($stream);
    fclose($stream);
    return true;
}

$userId = $_SESSION['user']['id'];
$conn = null;

try {
    $conn = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";port=" . DB_PORT,
        DB_USER,
        DB_PASSWORD
    );
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    $conn = null;
}

if ($conn !== null) {
    try {
        $columnsStmt = $conn->query("SHOW COLUMNS FROM users");
        $columns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN, 0);
        $avatarColumn = in_array('profile_image', $columns, true)
            ? 'profile_image'
            : (in_array('avatar_url', $columns, true) ? 'avatar_url' : null);

        if ($avatarColumn !== null) {
            $stmt = $conn->prepare("SELECT {$avatarColumn} AS profile_image FROM users WHERE id = :id LIMIT 1");
            $stmt->bindParam(':id', $userId);
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            $profileImageValue = (string)($user['profile_image'] ?? '');

            if ($profileImageValue !== '') {
                $uploadDir = resolveAvatarUploadDir();
                if ($uploadDir !== false) {
                    $fileName = basename($profileImageValue);
                    $avatarPath = $uploadDir . $fileName;
                    if (streamImageFile($avatarPath)) {
                        exit;
                    }
                }
            }
        }
    } catch (PDOException $e) {
    }
}

$defaultAvatarPath = __DIR__ . '/../frontend/public/url_icon.png';
if (streamImageFile($defaultAvatarPath)) {
    exit;
}

http_response_code(404);
