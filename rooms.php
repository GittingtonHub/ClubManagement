  GNU nano 7.2                                        /var/ClubManagementFolder/api/rooms.php
<?php
// where to fetch the results http://167.99.165.60/api/rooms.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once 'db.php';

$query = "SELECT id, name, capacity, location FROM rooms";

$stmt = $conn->prepare($query);
$stmt->execute();

$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($data);
?>

