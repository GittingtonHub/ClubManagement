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

$query = "INSERT INTO users (email, username, password_hash, privilege) 
          VALUES (:email, :username, :password_hash, 'user')";

$stmt = $conn->prepare($query);
$stmt->bindParam(':email', $email);
$stmt->bindParam(':username', $username);
$stmt->bindParam(':password_hash', $passwordHash);
$stmt->execute();

echo json_encode(['success' => true]);

?>
