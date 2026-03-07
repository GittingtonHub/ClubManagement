<?php
session_start();
header('Content-Type: application/json');

include_once 'api.php';

if (!isset($_SESSION['user']) || !isset($_SESSION['user']['id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user']['id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $columnsStmt = $conn->query("SHOW COLUMNS FROM users");
        $columns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN, 0);
        $profileImageExpression = in_array('profile_image', $columns, true)
            ? 'profile_image'
            : (in_array('avatar_url', $columns, true) ? 'avatar_url' : "NULL");

        $stmt = $conn->prepare("SELECT bio, {$profileImageExpression} AS profile_image FROM users WHERE id = :id LIMIT 1");
        $stmt->bindParam(':id', $userId);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $profileImageValue = (string)($user['profile_image'] ?? '');
        $avatarVersion = $profileImageValue !== '' ? md5($profileImageValue) : 'default';
        $profileImage = '/api/profile-avatar.php?v=' . $avatarVersion;

        echo json_encode([
            'success' => true,
            'bio' => $user['bio'] ?? '',
            'profile_image' => $profileImage
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Could not load profile bio']);
    }
    exit;
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $bio = $input['bio'] ?? '';

    if (!is_string($bio)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Bio must be text']);
        exit;
    }

    if (strlen($bio) > 1000) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Bio must be 1000 characters or less']);
        exit;
    }

    try {
        $stmt = $conn->prepare("UPDATE users SET bio = :bio WHERE id = :id");
        $stmt->bindParam(':bio', $bio);
        $stmt->bindParam(':id', $userId);
        $stmt->execute();

        $_SESSION['user']['bio'] = $bio;

        echo json_encode([
            'success' => true,
            'bio' => $bio
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Could not save profile bio']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
