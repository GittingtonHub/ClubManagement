<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once __DIR__ . '/api.php';
session_start();

error_log('[get_ticket_details] request start');

if (!isset($_SESSION['user_id'])) {
    error_log('[get_ticket_details] unauthorized: missing session user_id');
    http_response_code(401);
    echo json_encode(["error" => "You must be logged in to view this receipt."]);
    exit;
}

$user_id = (int)$_SESSION['user_id'];
$reservation_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
error_log('[get_ticket_details] parsed params: user_id=' . $user_id . ', reservation_id=' . $reservation_id);

if ($reservation_id <= 0) {
    error_log('[get_ticket_details] invalid reservation id');
    http_response_code(400);
    echo json_encode(["error" => "No valid reservation ID provided."]);
    exit;
}

function get_table_columns(PDO $conn, string $tableName): array
{
    $stmt = $conn->query("DESCRIBE `{$tableName}`");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return array_map(static fn($row) => $row['Field'] ?? '', $rows);
}

function pick_column(array $columns, array $candidates): ?string
{
    foreach ($candidates as $candidate) {
        if (in_array($candidate, $columns, true)) {
            return $candidate;
        }
    }
    return null;
}

function qi(string $identifier): string
{
    return '`' . str_replace('`', '``', $identifier) . '`';
}

try {
    $eventColumns = get_table_columns($conn, 'events');
    $ticketColumns = get_table_columns($conn, 'tickets');
    error_log('[get_ticket_details] discovered event columns: ' . json_encode($eventColumns));
    error_log('[get_ticket_details] discovered ticket columns: ' . json_encode($ticketColumns));

    $eventTitleCol = pick_column($eventColumns, ['event_title', 'title', 'event_name', 'name']);
    $eventStartCol = pick_column($eventColumns, ['start_time', 'start', 'event_date']);
    $eventEndCol = pick_column($eventColumns, ['end_time', 'end']);
    $eventPerformerCol = pick_column($eventColumns, ['performer', 'performers', 'artist']);
    $eventPosterCol = pick_column($eventColumns, ['event_poster', 'poster_image', 'path', 'image_path', 'poster']);
    $eventGaPriceCol = pick_column($eventColumns, ['ga_ticket_price', 'ga_price']);
    $eventVipPriceCol = pick_column($eventColumns, ['vip_ticket_price', 'vip_price']);

    $ticketTierCol = pick_column($ticketColumns, ['tier', 'ticket_tier', 'ticket_type', 'type', 'name']);
    $ticketPriceCol = pick_column($ticketColumns, ['price', 'ticket_price', 'cost', 'amount']);
    error_log('[get_ticket_details] selected columns: ' . json_encode([
        'eventTitleCol' => $eventTitleCol,
        'eventStartCol' => $eventStartCol,
        'eventEndCol' => $eventEndCol,
        'eventPerformerCol' => $eventPerformerCol,
        'eventPosterCol' => $eventPosterCol,
        'eventGaPriceCol' => $eventGaPriceCol,
        'eventVipPriceCol' => $eventVipPriceCol,
        'ticketTierCol' => $ticketTierCol,
        'ticketPriceCol' => $ticketPriceCol
    ]));

    $eventTitleExpr = $eventTitleCol ? 'e.' . qi($eventTitleCol) : "NULL";
    $eventStartExpr = $eventStartCol ? 'e.' . qi($eventStartCol) : "NULL";
    $eventEndExpr = $eventEndCol ? 'e.' . qi($eventEndCol) : "NULL";
    $eventPerformerExpr = $eventPerformerCol ? 'e.' . qi($eventPerformerCol) : "NULL";
    $eventPosterExpr = $eventPosterCol ? 'e.' . qi($eventPosterCol) : "NULL";
    $eventGaPriceExpr = $eventGaPriceCol ? 'e.' . qi($eventGaPriceCol) : "NULL";
    $eventVipPriceExpr = $eventVipPriceCol ? 'e.' . qi($eventVipPriceCol) : "NULL";
    $ticketTierExpr = $ticketTierCol ? 't.' . qi($ticketTierCol) : "NULL";
    $ticketPriceExpr = $ticketPriceCol ? 't.' . qi($ticketPriceCol) : "NULL";

    $ticketJoinOn = "t.event_id = tr.event_id";
    if ($ticketTierCol) {
        $ticketJoinOn .= " AND UPPER(TRIM({$ticketTierExpr})) = UPPER(TRIM(tr.ticket_tier))";
    }
    error_log('[get_ticket_details] ticket join condition: ' . $ticketJoinOn);

    $query = "
        SELECT
            r.reservation_id,
            r.user_id,
            tr.ticket_tier,
            tr.quantity,
            tr.event_id AS event_id,
            {$eventTitleExpr} AS event_title,
            {$eventStartExpr} AS event_start,
            {$eventEndExpr} AS event_end,
            {$eventPerformerExpr} AS performer,
            {$eventPosterExpr} AS image_path,
            {$eventGaPriceExpr} AS ga_event_price,
            {$eventVipPriceExpr} AS vip_event_price,
            {$ticketPriceExpr} AS ticket_row_price
        FROM reservations r
        JOIN ticket_reservations tr ON tr.reservation_id = r.reservation_id
        JOIN events e ON e.event_id = tr.event_id
        LEFT JOIN tickets t ON {$ticketJoinOn}
        WHERE r.reservation_id = :reservation_id
          AND r.user_id = :user_id
        LIMIT 1
    ";

    $stmt = $conn->prepare($query);
    error_log('[get_ticket_details] executing query for reservation/user');
    $stmt->execute([
        ':reservation_id' => $reservation_id,
        ':user_id' => $user_id
    ]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    error_log('[get_ticket_details] query row: ' . json_encode($row));

    if (!$row) {
        error_log('[get_ticket_details] no matching row found');
        http_response_code(404);
        echo json_encode(["error" => "Ticket receipt not found"]);
        exit;
    }

    $eventId = (string)($row['event_id'] ?? '');
    $ticketType = strtoupper(trim((string)($row['ticket_tier'] ?? '')));
    if ($ticketType !== 'GA' && $ticketType !== 'VIP') {
        $ticketType = 'GA';
    }
    error_log('[get_ticket_details] normalized ticket type: ' . $ticketType);

    $ticketPrice = $row['ticket_row_price'] ?? null;
    error_log('[get_ticket_details] ticket row price before fallback: ' . json_encode($ticketPrice));
    if ($ticketPrice === null || $ticketPrice === '') {
        $ticketPrice = $ticketType === 'VIP'
            ? ($row['vip_event_price'] ?? null)
            : ($row['ga_event_price'] ?? null);
        error_log('[get_ticket_details] ticket price fallback used: ' . json_encode($ticketPrice));
    }

    $responsePayload = [
        "event_id" => $eventId,
        "user_id" => (string)($row['user_id'] ?? ''),
        "event_title" => (string)($row['event_title'] ?? ''),
        "event_start" => (string)($row['event_start'] ?? ''),
        "event_end" => (string)($row['event_end'] ?? ''),
        "ticket_type" => (string)$ticketType,
        "ticket_price" => $ticketPrice,
        "performer" => (string)($row['performer'] ?? ''),
        "image_path" => (string)($row['image_path'] ?? ''),
        "quantity" => (int)($row['quantity'] ?? 1),
        "reservation_id" => (int)($row['reservation_id'] ?? $reservation_id)
    ];
    error_log('[get_ticket_details] response payload: ' . json_encode($responsePayload));
    echo json_encode($responsePayload);
} catch (PDOException $e) {
    error_log('[get_ticket_details] PDOException: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Database error while loading ticket details."]);
}
?>
