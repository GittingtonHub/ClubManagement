<?php

function env_value(array $keys, ?string $default = null): ?string {
    foreach ($keys as $key) {
        if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
            return $_ENV[$key];
        }

        $fromGetenv = getenv($key);
        if ($fromGetenv !== false && $fromGetenv !== '') {
            return $fromGetenv;
        }
    }

    return $default;
}

function emailjs_template_id_for_type(string $templateType): ?string {
    $normalized = strtoupper(trim($templateType));
    if ($normalized === '') {
        return env_value(['EMAILJS_TEMPLATE_ID']);
    }

    $candidates = [
        "EMAILJS_TEMPLATE_ID_{$normalized}",
        "EMAILJS_TEMPLATE_ID_" . str_replace('-', '_', $normalized),
        "EMAILJS_TEMPLATE_ID_" . str_replace('_', '-', $normalized)
    ];

    return env_value($candidates, env_value(['EMAILJS_TEMPLATE_ID']));
}

function emailjs_default_template_params(string $templateType): array {
    $normalized = strtoupper(trim($templateType));
    $suffix = $normalized !== '' ? "_{$normalized}" : '';

    $toEmail = env_value([
        "EMAILJS_TO_EMAIL{$suffix}",
        "EMAILJS_STAFF_TO_EMAIL{$suffix}",
        'EMAILJS_TO_EMAIL',
        'EMAILJS_STAFF_TO_EMAIL'
    ]);
    $fromEmail = env_value([
        "EMAILJS_FROM_EMAIL{$suffix}",
        'EMAILJS_FROM_EMAIL'
    ]);
    $fromName = env_value([
        "EMAILJS_FROM_NAME{$suffix}",
        'EMAILJS_FROM_NAME'
    ]);
    $replyTo = env_value([
        "EMAILJS_REPLY_TO{$suffix}",
        'EMAILJS_REPLY_TO'
    ]);

    $params = [];
    if ($toEmail) {
        $params['to_email'] = $toEmail;
    }
    if ($fromEmail) {
        $params['from_email'] = $fromEmail;
    }
    if ($fromName) {
        $params['from_name'] = $fromName;
    }
    if ($replyTo) {
        $params['reply_to'] = $replyTo;
    }

    return $params;
}

function send_emailjs_template_email(string $templateType, array $templateParams): bool {
    $serviceId = env_value(['EMAILJS_SERVICE_ID']);
    $templateId = emailjs_template_id_for_type($templateType);
    $publicKey = env_value(['EMAILJS_PUBLIC_KEY', 'EMAILJS_USER_ID']);
    $privateKey = env_value(['EMAILJS_PRIVATE_KEY', 'EMAILJS_ACCESS_TOKEN']);

    if (!$serviceId || !$templateId || (!$publicKey && !$privateKey)) {
        error_log("EmailJS config missing for template type {$templateType}.");
        return false;
    }

    $payload = [
        'service_id' => $serviceId,
        'template_id' => $templateId,
        'template_params' => array_merge(
            emailjs_default_template_params($templateType),
            $templateParams
        )
    ];

    if ($privateKey) {
        $payload['accessToken'] = $privateKey;
    } else {
        $payload['user_id'] = $publicKey;
    }

    $jsonPayload = json_encode($payload);
    if ($jsonPayload === false) {
        error_log("EmailJS payload encoding failed for template type {$templateType}.");
        return false;
    }

    $ch = curl_init('https://api.emailjs.com/api/v1.0/email/send');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $status < 200 || $status >= 300) {
        error_log("EmailJS send failed [{$templateType}] status={$status} error={$curlError} response={$response}");
        return false;
    }

    return true;
}

function send_staff_assignment_email(
    string $templateType,
    string $title,
    string $staffName,
    string $timeWindow,
    string $message
): bool {
    return send_emailjs_template_email($templateType, [
        'title' => $title,
        'name' => $staffName,
        'time' => $timeWindow,
        'message' => $message
    ]);
}

?>
