<?php
  session_start();
  header('Content-Type: application/json');

  include_once 'api.php';

  // Get JSON input
  $input = json_decode(file_get_contents('php://input'), true);
  $email = $input["email"] ?? null;
  $password = $input["password"] ?? null;

  if (!$email || !$password) {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'Email and password required']);
      exit;
  }

  // Query for the specific user
  $query = "SELECT id, email, password_hash FROM users WHERE email = :email";
  $stmt = $conn->prepare($query);
  $stmt->bindParam(':email', $email);
  $stmt->execute();
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($user && password_verify($password, $user['password_hash'])) {
      $_SESSION['user_id'] = $user['id'];
      $_SESSION['user'] = ['email' => $user['email'], 'id' => $user['id']];
      
      echo json_encode([
          'success' => true, 
          'token' => session_id(),
          'user' => ['email' => $user['email'], 'id' => $user['id']]
      ]);
  } else {
      http_response_code(401);
      echo json_encode(['success' => false, 'message' => 'Incorrect email or password']);
  }
?>