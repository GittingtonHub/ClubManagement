<?php

// CALL THIS FILE TO CONNECT TO THE DATABASE. WHEN POST REMEBER TO SANITIZE FIRST
// SHOULD NOT BE SHOWN IN FRONTEND, IT WOULD BE A PROBLEM TO THE EVERYTHINGGGG
require_once __DIR__ . '/config.php';

$host = DB_HOST;
$db_name = DB_NAME;
$username = DB_USER;
$password = DB_PASSWORD;


try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name;port=" . DB_PORT, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    error_log("Connection failed: " . $e->getMessage());
    die(json_encode(['success' => false, 'message' => 'Database connection failed']));
}
?>
