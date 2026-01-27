<?php
// to call this in front-end: http://167.99.165.60/api/resources.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once 'api.php';

// query
$query = "SELECT id,name,price,description FROM resources";

$stmt = $conn->prepare($query);
$stmt->execute();

$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($data);
?>
