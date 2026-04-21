<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');

include_once 'api.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    exit;
}

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);
    exit;
}

function table_exists(PDO $conn, string $tableName): bool
{
    $stmt = $conn->prepare('SHOW TABLES LIKE :table_name');
    $stmt->execute([':table_name' => $tableName]);
    return (bool)$stmt->fetchColumn();
}

function pick_existing_table(PDO $conn, array $candidates): ?string
{
    foreach ($candidates as $candidate) {
        if (table_exists($conn, $candidate)) {
            return $candidate;
        }
    }

    return null;
}

function get_table_columns(PDO $conn, string $tableName): array
{
    $stmt = $conn->query("DESCRIBE `{$tableName}`");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return array_map(static fn($row) => $row['Field'], $rows);
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

function quote_identifier(string $identifier): string
{
    return '`' . str_replace('`', '``', $identifier) . '`';
}

try {
    $sectionsTable = pick_existing_table($conn, ['sections', 'table_section', 'Sections', 'TableSection']);

    if ($sectionsTable !== null) {
        $columns = get_table_columns($conn, $sectionsTable);
        $sectionColumn = pick_column($columns, ['section_number', 'section_no', 'section', 'number', 'name', 'section_id', 'id']);
        $idColumn = pick_column($columns, ['section_id', 'id']);
        $removedColumn = pick_column($columns, ['removed', 'is_removed', 'deleted']);

        if ($sectionColumn !== null) {
            $sectionCol = quote_identifier($sectionColumn);
            $idExpr = $idColumn !== null
                ? quote_identifier($idColumn)
                : $sectionCol;
            $sql = "SELECT DISTINCT {$idExpr} AS table_section_id, {$sectionCol} AS section_number FROM " . quote_identifier($sectionsTable);
            $whereParts = [];
            if ($removedColumn !== null) {
                $whereParts[] = 'COALESCE(' . quote_identifier($removedColumn) . ', 0) = 0';
            }
            $whereParts[] = "{$sectionCol} IS NOT NULL";
            if (!empty($whereParts)) {
                $sql .= ' WHERE ' . implode(' AND ', $whereParts);
            }
            $sql .= " ORDER BY {$sectionCol}";

            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(array_values($rows));
            exit;
        }
    }

    // Backward-compatible fallback: infer options from existing bottle service reservations.
    if (table_exists($conn, 'bottle_service')) {
        if (table_exists($conn, 'table_section')) {
            $stmt = $conn->prepare('
                SELECT DISTINCT ts.section_id AS table_section_id, ts.section_number
                FROM table_section ts
                INNER JOIN bottle_service bs ON bs.table_section_id = ts.section_id
                ORDER BY ts.section_number
            ');
        } else {
            $stmt = $conn->prepare('
                SELECT DISTINCT table_section_id, table_section_id AS section_number
                FROM bottle_service
                WHERE table_section_id IS NOT NULL
                ORDER BY table_section_id
            ');
        }
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(array_values($rows));
        exit;
    }

    echo json_encode([]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to fetch sections.'
    ]);
}
