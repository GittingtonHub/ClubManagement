<?php
// where to fetch the results http://167.99.165.60/api/users.php
// DO NOT ALLOW USERS OR FRONTEND TO SEE THIS AS IT WOULD BE COMPROMISING TO OUR USERS, WE SHOULD ONLY SEE IF THE USER PASOWRD
// AND USERNAME ARE IN THE DB OR THEY ARE THE SAME
// will prob change to see if name in username  else error
// check if password matches password FOR SPECIFIC USERNAME
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

$query = "SELECT id, email, password_hash,created_at FROM users";

$stmt = $conn->prepare($query);
$stmt->execute();

$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($data);
?>


