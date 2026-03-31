import { useState } from "react";

function AvailabilityUI() {
  const [staffId, setStaffId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!staffId || !start || !end) {
      setMessage("Fill all fields");
      return;
    }

    try {
      const res = await fetch("/api/availability.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          staff_id: Number(staffId),
          start_time: start,
          end_time: end,
          is_available: 1
        })
      });

      if (res.ok) {
        setMessage("Availability saved");
        setStaffId("");
        setStart("");
        setEnd("");
      } else {
        setMessage("Failed to save");
      }
    } catch {
      setMessage("Error saving availability");
    }
  };

  return (
    <div>
      <h3>Set Availability</h3>

      <input
        placeholder="Staff ID"
        value={staffId}
        onChange={(e) => setStaffId(e.target.value)}
      />

      <input
        type="datetime-local"
        value={start}
        onChange={(e) => setStart(e.target.value)}
      />

      <input
        type="datetime-local"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
      />

      <button onClick={handleSubmit}>Save</button>

      <p>{message}</p>
    </div>
  );
}

export default AvailabilityUI;