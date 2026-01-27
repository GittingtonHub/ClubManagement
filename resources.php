<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once 'db.php';

// query
$query = "SELECT id,name,price,description FROM resources";

$stmt = $conn->prepare($query);
$stmt->execute();

$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($data);
?>
