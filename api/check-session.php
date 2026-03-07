<?php
session_start();
header('Content-Type: application/json');

if (isset($_SESSION['user'])) {
  if (
    (!isset($_SESSION['user']['username']) || $_SESSION['user']['username'] === null || $_SESSION['user']['username'] === '') &&
    isset($_SESSION['user']['id'])
  ) {
    try {
      include_once 'api.php';
      $columnsStmt = $conn->query("SHOW COLUMNS FROM users");
      $columns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN, 0);
      $usernameExpression = in_array('username', $columns, true)
        ? 'username'
        : "SUBSTRING_INDEX(email, '@', 1)";

      $stmt = $conn->prepare("SELECT {$usernameExpression} AS username FROM users WHERE id = :id LIMIT 1");
      $stmt->bindParam(':id', $_SESSION['user']['id']);
      $stmt->execute();
      $userRow = $stmt->fetch(PDO::FETCH_ASSOC);

      if ($userRow && isset($userRow['username'])) {
        $_SESSION['user']['username'] = $userRow['username'];
      }
    } catch (Throwable $e) {
      // Fall back to session data if DB lookup fails.
    }
  }

  echo json_encode([
    'authenticated' => true,
    'user' => $_SESSION['user']
  ]);
  exit;
}

echo json_encode([
  'authenticated' => false,
  'user' => null
]);
?>
