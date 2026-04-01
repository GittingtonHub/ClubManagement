<?php

function log_email_trigger(string $stage, array $context = []): void {
    $payload = json_encode($context, JSON_UNESCAPED_SLASHES);
    if ($payload === false) {
        $payload = '{"json_encode_error":true}';
    }
    error_log("[EMAIL_TRIGGER] {$stage} {$payload}");
}

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
    $suffixHyphen = $normalized !== '' ? "_{$normalized}" : '';
    $suffixUnderscore = $normalized !== '' ? "_" . str_replace('-', '_', $normalized) : '';
    $suffixes = array_values(array_unique(array_filter([$suffixHyphen, $suffixUnderscore])));

    // Use one shared recipient for all staff-assignment templates.
    // This intentionally checks both SR-BA and SR-BU variants so either key can drive both templates.
    $toCandidates = [
        'EMAILJS_TO_EMAIL',
        'EMAILJS_STAFF_TO_EMAIL',
        'EMAILJS_TO_EMAIL_SR_BA',
        'EMAILJS_STAFF_TO_EMAIL_SR_BA',
        'EMAILJS_TO_EMAIL_SR-BA',
        'EMAILJS_STAFF_TO_EMAIL_SR-BA',
        'EMAILJS_TO_EMAIL_SR_BU',
        'EMAILJS_STAFF_TO_EMAIL_SR_BU',
        'EMAILJS_TO_EMAIL_SR-BU',
        'EMAILJS_STAFF_TO_EMAIL_SR-BU'
    ];
    $fromEmailCandidates = ['EMAILJS_FROM_EMAIL'];
    $fromNameCandidates = ['EMAILJS_FROM_NAME'];
    $replyToCandidates = ['EMAILJS_REPLY_TO'];

    foreach ($suffixes as $suffix) {
        $toCandidates[] = "EMAILJS_TO_EMAIL{$suffix}";
        $toCandidates[] = "EMAILJS_STAFF_TO_EMAIL{$suffix}";
        $fromEmailCandidates[] = "EMAILJS_FROM_EMAIL{$suffix}";
        $fromNameCandidates[] = "EMAILJS_FROM_NAME{$suffix}";
        $replyToCandidates[] = "EMAILJS_REPLY_TO{$suffix}";
    }

    $toEmail = env_value($toCandidates);
    $fromEmail = env_value($fromEmailCandidates);
    $fromName = env_value($fromNameCandidates);
    $replyTo = env_value($replyToCandidates);

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
    try {
        $serviceId = env_value(['EMAILJS_SERVICE_ID']);
        $templateId = emailjs_template_id_for_type($templateType);
        $publicKey = env_value(['EMAILJS_PUBLIC_KEY', 'EMAILJS_USER_ID']);
        $privateKey = env_value(['EMAILJS_PRIVATE_KEY', 'EMAILJS_ACCESS_TOKEN']);
        $resolvedTemplateParams = array_merge(
            emailjs_default_template_params($templateType),
            $templateParams
        );

        log_email_trigger('attempt', [
            'template_type' => $templateType,
            'has_service_id' => (bool)$serviceId,
            'has_template_id' => (bool)$templateId,
            'auth_mode' => $privateKey ? 'private_key' : ($publicKey ? 'public_key' : 'missing'),
            'has_to_email' => !empty($resolvedTemplateParams['to_email']),
            'to_email' => $resolvedTemplateParams['to_email'] ?? null,
            'title' => $resolvedTemplateParams['title'] ?? null,
            'name' => $resolvedTemplateParams['name'] ?? null,
            'time' => $resolvedTemplateParams['time'] ?? null
        ]);

        if (!$serviceId || !$templateId || (!$publicKey && !$privateKey)) {
            error_log("EmailJS config missing for template type {$templateType}.");
            log_email_trigger('config_missing', [
                'template_type' => $templateType
            ]);
            return false;
        }

        if (!function_exists('curl_init')) {
            error_log("EmailJS send failed [{$templateType}] curl extension unavailable.");
            log_email_trigger('curl_unavailable', [
                'template_type' => $templateType
            ]);
            return false;
        }

        $payload = [
            'service_id' => $serviceId,
            'template_id' => $templateId,
            'template_params' => $resolvedTemplateParams
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
        if ($ch === false) {
            error_log("EmailJS send failed [{$templateType}] curl_init returned false.");
            log_email_trigger('curl_init_failed', [
                'template_type' => $templateType
            ]);
            return false;
        }

        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        // Intentionally omit curl_close(): in this runtime it is deprecated/no-op and can pollute JSON output with warnings.

        if ($response === false || $status < 200 || $status >= 300) {
            error_log("EmailJS send failed [{$templateType}] status={$status} error={$curlError} response={$response}");
            log_email_trigger('failed', [
                'template_type' => $templateType,
                'status' => $status,
                'curl_error' => $curlError,
                'response' => $response
            ]);
            return false;
        }

        log_email_trigger('sent', [
            'template_type' => $templateType,
            'status' => $status,
            'response' => $response
        ]);

        return true;
    } catch (Throwable $e) {
        error_log("EmailJS unexpected exception [{$templateType}]: " . $e->getMessage());
        log_email_trigger('exception', [
            'template_type' => $templateType,
            'message' => $e->getMessage()
        ]);
        return false;
    }
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
