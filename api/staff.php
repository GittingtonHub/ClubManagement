<?php
// where to fetch the results http://167.99.165.60/api/staff.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

$query = "SELECT id, name, role, hourly_rate FROM staff";

$stmt = $conn->prepare($query);
$stmt->execute();

$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($data);
?>

