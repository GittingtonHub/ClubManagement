const ANALYTICS_ENDPOINT = "/api/analytics.php";

function parseJsonSafely(text) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function fetchAnalytics(action) {
  const authToken = localStorage.getItem("authToken") || "";
  const response = await fetch(
    `${ANALYTICS_ENDPOINT}?action=${encodeURIComponent(action)}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  const responseText = await response.text();
  const payload = parseJsonSafely(responseText);

  if (!response.ok || payload?.success === false) {
    const message =
      payload?.message ||
      `Failed to load analytics (${action}) [${response.status}]`;
    throw new Error(message);
  }

  return payload?.data ?? {};
}
