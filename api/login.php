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

  try {
      // Support both schemas: some environments use `role`, others use `privilege`.
      $columnsStmt = $conn->query("SHOW COLUMNS FROM users");
      $columns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN, 0);
      $roleExpression = in_array('role', $columns, true)
          ? 'role'
          : (in_array('privilege', $columns, true) ? 'privilege' : "'user'");

      // Query for the specific user
      $query = "SELECT id, email, {$roleExpression} AS role, password_hash FROM users WHERE email = :email";
      $stmt = $conn->prepare($query);
      $stmt->bindParam(':email', $email);
      $stmt->execute();
      $user = $stmt->fetch(PDO::FETCH_ASSOC);
  } catch (PDOException $e) {
      http_response_code(500);
      echo json_encode(['success' => false, 'message' => 'Unable to log in right now.']);
      exit;
  }

  if ($user && password_verify($password, $user['password_hash'])) {
      $_SESSION['user_id'] = $user['id'];
      $_SESSION['user'] = ['email' => $user['email'], 'id' => $user['id']];

      $_SESSION['user'] = [
          'email' => $user['email'], 
          'id' => $user['id'], 
          'role' => $user['role'] ?? 'user'
      ];
      
      echo json_encode([
          'success' => true, 
          'token' => session_id(),
          'user' => $_SESSION['user']
      ]);
  } else {
      http_response_code(401);
      echo json_encode(['success' => false, 'message' => 'Incorrect email or password']);
  }
?>
