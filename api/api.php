<?php

// CALL THIS FILE TO CONNECT TO THE DATABASE. WHEN POST REMEBER TO SANITIZE FIRST
// SHOULD NOT BE SHOWN IN FRONTEND, IT WOULD BE A PROBLEM TO THE EVERYTHINGGGG
$host = "localhost";
$db_name = "ClubManagementDB";
$username = "Javi";
$password = "SpideyArc#2408";

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    error_log("Connection failed: " . $e->getMessage());
    die(json_encode(['success' => false, 'message' => 'Database connection failed']));
}
?>
