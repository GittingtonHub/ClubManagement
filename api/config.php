<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

function loadEnvFallbackFile(string $envFilePath): void {
    if (!is_file($envFilePath) || !is_readable($envFilePath)) {
        return;
    }

    $lines = file($envFilePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return;
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }

        $equalsPos = strpos($trimmed, '=');
        if ($equalsPos === false) {
            continue;
        }

        $key = trim(substr($trimmed, 0, $equalsPos));
        $value = trim(substr($trimmed, $equalsPos + 1));

        if ($key === '') {
            continue;
        }

        if (
            strlen($value) >= 2 &&
            (($value[0] === '"' && $value[strlen($value) - 1] === '"') ||
             ($value[0] === "'" && $value[strlen($value) - 1] === "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        $_ENV[$key] = $value;
        putenv("{$key}={$value}");
    }
}

try {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
} catch (Exception $e) {
    error_log("Dotenv failed: " . $e->getMessage());
    loadEnvFallbackFile(__DIR__ . '/../.env');
}

// Safely define DB constants
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_PORT', $_ENV['DB_PORT'] ?? '3306');
define('DB_NAME', $_ENV['DB_NAME'] ?? '');
define('DB_USER', $_ENV['DB_USER'] ?? '');
define('DB_PASSWORD', $_ENV['DB_PASSWORD'] ?? '');
define('DB_PFP_PATH', $_ENV['DB_PFP_PATH'] ?? 'api/private_uploads/avatars');
define('DB_POSTER_PATH', $_ENV['DB_POSTER_PATH'] ?? 'api/private_uploads/posters');
?>
