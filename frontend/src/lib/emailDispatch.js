const EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send";
const DEFAULT_EMAILJS_CONFIG = {
  serviceId: "service_wjiyljj",
  publicKey: "o-hyGRNiExX3hzcQf",
  templateIdSrBa: "template_l33zz84",
  templateIdSrBu: "template_vipe25m",
  toEmail: "andresnserna@icloud.com",
  fromEmail: "",
  fromName: "",
  replyTo: ""
};

const normalizeTemplateType = (value) => String(value ?? "").trim().toUpperCase();

const getTemplateIdForType = (templateType) => {
  const normalized = normalizeTemplateType(templateType);
  if (normalized === "SR-BA") {
    return import.meta.env.VITE_EMAILJS_TEMPLATE_ID_SR_BA || DEFAULT_EMAILJS_CONFIG.templateIdSrBa;
  }
  if (normalized === "SR-BU") {
    return import.meta.env.VITE_EMAILJS_TEMPLATE_ID_SR_BU || DEFAULT_EMAILJS_CONFIG.templateIdSrBu;
  }
  return "";
};

const getEmailJsClientConfig = (templateType) => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || DEFAULT_EMAILJS_CONFIG.serviceId;
  const publicKey =
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY ||
    import.meta.env.VITE_EMAILJS_USER_ID ||
    DEFAULT_EMAILJS_CONFIG.publicKey;
  const templateId = getTemplateIdForType(templateType);
  const toEmail = import.meta.env.VITE_EMAILJS_TO_EMAIL || DEFAULT_EMAILJS_CONFIG.toEmail;
  const fromEmail = import.meta.env.VITE_EMAILJS_FROM_EMAIL || DEFAULT_EMAILJS_CONFIG.fromEmail;
  const fromName = import.meta.env.VITE_EMAILJS_FROM_NAME || DEFAULT_EMAILJS_CONFIG.fromName;
  const replyTo = import.meta.env.VITE_EMAILJS_REPLY_TO || DEFAULT_EMAILJS_CONFIG.replyTo;

  return {
    serviceId,
    publicKey,
    templateId,
    toEmail,
    fromEmail,
    fromName,
    replyTo
  };
};

const sendOneTemplateEmail = async ({ templateType, title, name, time, message }) => {
  const cfg = getEmailJsClientConfig(templateType);
  if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey) {
    return {
      ok: false,
      status: 0,
      error: "EmailJS frontend config is incomplete."
    };
  }

  const templateParams = {
    title,
    name,
    time,
    message
  };

  if (cfg.toEmail) {
    templateParams.to_email = cfg.toEmail;
  }
  if (cfg.fromEmail) {
    templateParams.from_email = cfg.fromEmail;
  }
  if (cfg.fromName) {
    templateParams.from_name = cfg.fromName;
  }
  if (cfg.replyTo) {
    templateParams.reply_to = cfg.replyTo;
  }

  const payload = {
    service_id: cfg.serviceId,
    template_id: cfg.templateId,
    user_id: cfg.publicKey,
    template_params: templateParams
  };

  try {
    const response = await fetch(EMAILJS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const rawText = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: rawText || `EmailJS request failed with status ${response.status}`
      };
    }

    return {
      ok: true,
      status: response.status,
      response: rawText
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error?.message || "Network error while sending EmailJS request."
    };
  }
};

export const dispatchStaffAssignmentEmails = async ({
  templateType,
  title,
  timeWindow,
  message,
  staffMembers
}) => {
  const normalizedTemplateType = normalizeTemplateType(templateType);
  const list = Array.isArray(staffMembers) ? staffMembers : [];
  const uniqueStaff = [];
  const seenIds = new Set();

  list.forEach((member, index) => {
    const rawId = member?.id ?? index;
    const key = String(rawId);
    if (seenIds.has(key)) {
      return;
    }
    seenIds.add(key);
    uniqueStaff.push({
      id: rawId,
      name: member?.name ? String(member.name) : `Staff #${rawId}`
    });
  });

  const results = await Promise.all(
    uniqueStaff.map(async (member) => {
      const result = await sendOneTemplateEmail({
        templateType: normalizedTemplateType,
        title,
        name: member.name,
        time: timeWindow,
        message
      });

      return {
        staff_id: member.id,
        staff_name: member.name,
        ...result
      };
    })
  );

  const summary = {
    trigger:
      normalizedTemplateType === "SR-BA"
        ? "event_assignment_frontend"
        : "reservation_assignment_frontend",
    attempted: uniqueStaff.length,
    sent: results.filter((row) => row.ok).length,
    failed: results.filter((row) => !row.ok).length,
    results
  };

  return summary;
};
