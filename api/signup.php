<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

include_once 'api.php';

function isValidPassword($password) {
    // The (?=.*\d) adds the requirement for at least 1 number!
    return preg_match('/^(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/', $password);
}



// Get JSON input instead of $_POST
$input = json_decode(file_get_contents('php://input'), true);
$email = $input["email"] ?? null;
$username = $input["username"] ?? null;
$password = $input["password"] ?? null;
$roleInput = $input["role"] ?? null; // <-- Added to grab the role from the frontend

// 1. FIRST check if they are missing (Order of operations!)
if (!$email || !$username || !$password) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username, email, and password are required']);
    exit;
}

$username = trim($username);
if (strlen($username) < 3 || strlen($username) > 30 || !preg_match('/^[A-Za-z0-9_]+$/', $username)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Username must be 3-30 characters and contain only letters, numbers, and underscores.'
    ]);
    exit;
}

// 2. THEN check if the password meets the rules
if (!isValidPassword($password)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Password must be at least 8 characters and include a number and a special character.'
    ]);
    exit;
}

// Check if email is already taken
$query = "SELECT id FROM users WHERE email = :email";
$stmt = $conn->prepare($query);
$stmt->bindParam(':email', $email);
$stmt->execute();
$existingEmail = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existingEmail) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email already exists!']);
    exit;
}

// Check if username is already taken
$query = "SELECT id FROM users WHERE username = :username";
$stmt = $conn->prepare($query);
$stmt->bindParam(':username', $username);
$stmt->execute();
$existingUsername = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existingUsername) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username already exists!']);
    exit;
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);


$allowedRoles = ['user', 'admin', 'staff']; 
$newRole = 'user'; // Defult role


if ($roleInput && in_array($roleInput, $allowedRoles)) {
    $newRole = $roleInput;
} 

elseif (stripos($email, '@adminuser') !== false) {
    $newRole = 'admin';
}


try {
    $columnsStmt = $conn->query("SHOW COLUMNS FROM users");
    $columns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN, 0);

    $insertColumns = ['email', 'username', 'password_hash'];
    $insertValues = [':email', ':username', ':password_hash'];
    $params = [
        ':email' => $email,
        ':username' => $username,
        ':password_hash' => $passwordHash
    ];

    if (in_array('privilege', $columns, true)) {
        $insertColumns[] = 'privilege';
        $insertValues[] = ':new_role_privilege';
        $params[':new_role_privilege'] = $newRole;
    }
    if (in_array('role', $columns, true)) {
        $insertColumns[] = 'role';
        $insertValues[] = ':new_role';
        $params[':new_role'] = $newRole;
    }

    $query = "INSERT INTO users (" . implode(', ', $insertColumns) . ")
              VALUES (" . implode(', ', $insertValues) . ")";

    $stmt = $conn->prepare($query);
    $stmt->execute($params);

    $new_user_id = $conn->lastInsertId();

    echo json_encode(['success' => true, 'message' => 'User created successfully.', 'id' => $new_user_id, 'username' => $username, 'email' => $email, 'role' => $newRole]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not create account right now.']);
}

?>
