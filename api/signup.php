<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

include_once 'api.php';

// Get JSON input instead of $_POST
$input = json_decode(file_get_contents('php://input'), true);
$email = $input["email"] ?? null;
$password = $input["password"] ?? null;

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email and password required']);
    exit;
}

// Fetch existing users to check for duplicates
$query = "SELECT id, email FROM users WHERE email = :email";
$stmt = $conn->prepare($query);
$stmt->bindParam(':email', $email);
$stmt->execute();
$existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$existingUser)
{
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $query = "INSERT INTO users (email, password_hash) VALUES (:email, :password_hash)";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':password_hash', $passwordHash);
    $stmt->execute();
    
    echo json_encode(['success' => true]);
}
else
{
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email already exists!']);
}

?>