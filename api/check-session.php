<?php 
// check-session.php
session_start();

if ($email == $data[$x]['email'] && password_verify($password,$data[$x]['password'])) 
{
  $loginFound = 'true';
  $_SESSION['user_id'] = $data[$x]['id'];
  $_SESSION['user'] = ['email' => $email, 'id' => $data[$x]['id']];
  echo json_encode(['success' => true, 'token' => session_id()]);
}
?>