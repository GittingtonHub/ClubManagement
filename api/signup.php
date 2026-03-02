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
$password = $input["password"] ?? null;

// 1. FIRST check if they are missing (Order of operations!)
if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email and password required']);
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

// Fetch existing users to check for duplicates
$query = "SELECT id, email FROM users WHERE email = :email";
$stmt = $conn->prepare($query);
$stmt->bindParam(':email', $email);
$stmt->execute();
$existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$existingUser) {
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    // I added "privilege" explicitly here so it always defaults to 'user'. 
    // Now you don't have to worry about anyone sneaking in as an admin!
    $query = "INSERT INTO users (email, password_hash, privilege) VALUES (:email, :password_hash, 'user')";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':password_hash', $passwordHash);
    $stmt->execute();
    
    echo json_encode(['success' => true]);
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email already exists!']);
}

?>
