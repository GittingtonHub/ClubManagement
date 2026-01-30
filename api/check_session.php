<?php 
// check-session.php
session_start();
if (isset($_SESSION['user_id'])) {
  echo json_encode(['user' => $_SESSION['user']]);
} else {
  http_response_code(401);
}
?>