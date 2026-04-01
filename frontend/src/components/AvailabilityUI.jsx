import { useEffect, useMemo, useState } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const createEmptyWeek = () => DAYS.map((day) => ({ day, start: "", end: "" }));

const normalizeTimeValue = (value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return "";
  }

  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return "";
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return "";
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const isAvailabilityFlagTruthy = (value) => {
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    return !(lowered === "" || lowered === "0" || lowered === "false" || lowered === "no" || lowered === "off");
  }
  return value !== 0 && value !== false && value !== null && value !== undefined;
};

const parseAvailabilityRows = (rows) => {
  const normalizedRows = createEmptyWeek();
  const rowByDay = new Map(normalizedRows.map((row) => [row.day, row]));
  const dayWindowCounts = new Map(DAYS.map((day) => [day, 0]));

  (Array.isArray(rows) ? rows : []).forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    const day = String(entry.day_of_week ?? "").trim();
    if (!rowByDay.has(day)) {
      return;
    }

    const availabilityFlag = entry.is_available ?? entry.available ?? entry.isAvailable ?? 1;
    if (!isAvailabilityFlagTruthy(availabilityFlag)) {
      return;
    }

    const start = normalizeTimeValue(String(entry.start_time ?? ""));
    const end = normalizeTimeValue(String(entry.end_time ?? ""));
    if (!start || !end) {
      return;
    }

    const existingCount = dayWindowCounts.get(day) ?? 0;
    dayWindowCounts.set(day, existingCount + 1);

    // Keep first row per day to fit the requested 8x3 grid.
    if (existingCount === 0) {
      rowByDay.set(day, { day, start, end });
    }
  });

  const multiWindowDays = DAYS.filter((day) => (dayWindowCounts.get(day) ?? 0) > 1);
  return {
    rows: DAYS.map((day) => rowByDay.get(day) ?? { day, start: "", end: "" }),
    multiWindowDays
  };
};

const buildTimeOptions = () => {
  const options = [{ value: "", label: "Unavailable" }];

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
      const suffix = hour < 12 ? "AM" : "PM";
      const label = `${twelveHour}:${String(minute).padStart(2, "0")} ${suffix}`;
      options.push({ value, label });
    }
  }

  return options;
};

function AvailabilityUI({ staffId = null }) {
  const parsedPropStaffId = Number.parseInt(String(staffId ?? ""), 10);
  const parsedFallbackStaffId = Number.parseInt(String(localStorage.getItem("userId") ?? ""), 10);
  const resolvedStaffId = Number.isInteger(parsedPropStaffId) && parsedPropStaffId > 0
    ? parsedPropStaffId
    : (Number.isInteger(parsedFallbackStaffId) && parsedFallbackStaffId > 0 ? parsedFallbackStaffId : null);

  const [rows, setRows] = useState(createEmptyWeek);
  const [initialRows, setInitialRows] = useState(createEmptyWeek);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [multiWindowNotice, setMultiWindowNotice] = useState("");

  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const hasChanges = JSON.stringify(rows) !== JSON.stringify(initialRows);

  useEffect(() => {
    const controller = new AbortController();

    if (!resolvedStaffId) {
      setRows(createEmptyWeek());
      setInitialRows(createEmptyWeek());
      setMessage("");
      setError("No staff profile was found for this account.");
      setMultiWindowNotice("");
      return () => controller.abort();
    }

    const fetchAvailability = async () => {
      setIsLoading(true);
      setError("");
      setMessage("");
      setMultiWindowNotice("");

      try {
        const response = await fetch(`/api/availability.php?staff_id=${resolvedStaffId}`, {
          credentials: "include",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Failed to load availability (${response.status}).`);
        }

        const payload = await response.json().catch(() => ({}));
        const sourceRows = Array.isArray(payload)
          ? payload
          : (Array.isArray(payload?.data) ? payload.data : []);

        const parsed = parseAvailabilityRows(sourceRows);
        setRows(parsed.rows);
        setInitialRows(parsed.rows);

        if (parsed.multiWindowDays.length > 0) {
          setMultiWindowNotice(
            `Multiple windows were found for ${parsed.multiWindowDays.join(", ")}. The first window for each day is shown in this grid.`
          );
        }
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setRows(createEmptyWeek());
          setInitialRows(createEmptyWeek());
          setError("Could not load availability right now.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchAvailability();

    return () => controller.abort();
  }, [resolvedStaffId]);

  const handleCellChange = (day, field, value) => {
    setRows((previousRows) =>
      previousRows.map((row) => (row.day === day ? { ...row, [field]: value } : row))
    );
    setMessage("");
    setError("");
  };

  const validateRows = () => {
    for (const row of rows) {
      const hasStart = row.start !== "";
      const hasEnd = row.end !== "";

      if (hasStart !== hasEnd) {
        return `${row.day}: please choose both start and end, or set both to Unavailable.`;
      }

      if (hasStart && hasEnd && row.end <= row.start) {
        return `${row.day}: end time must be after start time.`;
      }
    }

    return "";
  };

  const handleSave = async () => {
    if (!resolvedStaffId) {
      setError("No staff profile was found for this account.");
      return;
    }

    const validationError = validateRows();
    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      for (const row of rows) {
        const isAvailable = row.start !== "" && row.end !== "";
        const response = await fetch("/api/availability.php", {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            staff_id: resolvedStaffId,
            day_of_week: row.day,
            start_time: isAvailable ? row.start : null,
            end_time: isAvailable ? row.end : null,
            is_available: isAvailable ? 1 : 0
          })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message || `Save failed for ${row.day}.`);
        }
      }

      const nextInitialRows = rows.map((row) => ({ ...row }));
      setInitialRows(nextInitialRows);
      setMessage("Availability saved.");
    } catch (saveError) {
      setError(saveError?.message || "Could not save availability.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="availability-editor-container">
      <h3 className="availability-editor-title">Set Availability</h3>

      <div className="availability-grid-scroll">
        <table className="availability-grid-table">
          <thead>
            <tr className="table-header">
              <th>Day</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowDisabled = isLoading || isSaving || !resolvedStaffId;
              return (
                <tr className="table-row" key={row.day}>
                  <td className="availability-day-cell">{row.day}</td>
                  <td>
                    <select
                      className="availability-grid-select"
                      value={row.start}
                      onChange={(event) => handleCellChange(row.day, "start", event.target.value)}
                      disabled={rowDisabled}
                    >
                      {timeOptions.map((option) => (
                        <option key={option.value || "unavailable-start"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="availability-grid-select"
                      value={row.end}
                      onChange={(event) => handleCellChange(row.day, "end", event.target.value)}
                      disabled={rowDisabled}
                    >
                      {timeOptions.map((option) => (
                        <option key={option.value || "unavailable-end"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasChanges ? (
        <div className="availability-grid-actions">
          <button
            type="button"
            className="availability-grid-save-button"
            onClick={handleSave}
            disabled={isSaving || isLoading || !resolvedStaffId}
          >
            {isSaving ? "Saving..." : "Save Availability"}
          </button>
        </div>
      ) : null}

      {isLoading ? <p className="availability-grid-status">Loading availability...</p> : null}
      {multiWindowNotice ? <p className="availability-grid-notice">{multiWindowNotice}</p> : null}
      {message ? <p className="availability-grid-success">{message}</p> : null}
      {error ? <p className="availability-grid-error">{error}</p> : null}
    </div>
  );
}

export default AvailabilityUI;
