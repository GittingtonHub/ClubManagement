<?php
session_start();
include_once 'api.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([]);
    exit;
}

$uid = $_SESSION['user_id'];
$scope = $_GET['scope'] ?? 'due';

if ($scope === 'upcoming') {
    $windowMinutes = (int)($_GET['window_minutes'] ?? 60);
    if ($windowMinutes < 1) {
        $windowMinutes = 1;
    } elseif ($windowMinutes > 1440) {
        $windowMinutes = 1440;
    }

    // Pull unsent notifications in the next time window (default: next hour)
    $sql = "SELECT un.*, r.service_type, r.start_time
            FROM user_notifications un
            JOIN reservations r ON un.reservation_id = r.reservation_id
            WHERE un.user_id = :uid
            AND un.is_sent = 0
            AND r.status != 'cancelled'
            AND un.notify_at > NOW()
            AND un.notify_at <= DATE_ADD(NOW(), INTERVAL {$windowMinutes} MINUTE)
            ORDER BY un.notify_at ASC";
} else {
    // Find user notifications that are ready now and not yet sent
    $sql = "SELECT un.*, r.service_type, r.start_time
            FROM user_notifications un
            JOIN reservations r ON un.reservation_id = r.reservation_id
            WHERE un.user_id = :uid
            AND un.notify_at <= NOW()
            AND un.is_sent = 0
            AND r.status != 'cancelled'
            ORDER BY un.notify_at ASC";
}

$stmt = $conn->prepare($sql);
$stmt->execute([':uid' => $uid]);
$notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Only "due" calls should mark notifications as sent
if ($scope !== 'upcoming' && !empty($notifications)) {
    $notificationIds = array_map(
        static fn($row) => (int)($row['id'] ?? 0),
        $notifications
    );
    $notificationIds = array_values(array_filter($notificationIds, static fn($id) => $id > 0));

    if (!empty($notificationIds)) {
        $placeholders = implode(',', array_fill(0, count($notificationIds), '?'));
        $params = array_merge([$uid], $notificationIds);

        $update = $conn->prepare(
            "UPDATE user_notifications
             SET is_sent = 1
             WHERE user_id = ?
             AND id IN ($placeholders)"
        );
        $update->execute($params);
    }
}

echo json_encode($notifications);
