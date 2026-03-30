<?php
session_start();
include_once 'api.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([]);
    exit;
}

$uid = $_SESSION['user_id'];

// Find User notifications that are ready (notify_at <= NOW) and not yet sent/dismissed
$sql = "SELECT un.*, r.service_type, r.start_time 
        FROM user_notifications un
        JOIN reservations r ON un.reservation_id = r.reservation_id
        WHERE un.user_id = :uid 
        AND un.notify_at <= NOW() 
        AND un.is_sent = 0";

$stmt = $conn->prepare($sql);
$stmt->execute([':uid' => $uid]);
$notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

// If we found some, we mark them as sent so they don't pop up again
if (!empty($notifications)) {
    $update = $conn->prepare("UPDATE user_notifications SET is_sent = 1 WHERE user_id = :uid AND notify_at <= NOW()");
    $update->execute([':uid' => $uid]);
}

echo json_encode($notifications);