<?php
$servername = "localhost";
$username = "Javi";
$password = "SpideyArc#2408";
$dbname = "ClubManagementDB";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("❌ Connection failed: " . $conn->connect_error);
}
echo "✅ Database connected successfully!";
$conn->close();
?>
