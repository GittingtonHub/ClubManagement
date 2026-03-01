import { useEffect, useState } from "react";

function Profile() {
  const [user, setUser] = useState(null);
  const [bio, setBio] = useState("");
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");

    if (!userId) return;

    fetch("/api/reservations.php")
      .then(res => res.json())
      .then(data => {
        const userReservations = data.filter(r => 
          String(r.user_id) === String(userId)
        );
        setReservations(userReservations);
      });

    setUser({
      id: userId,
      email: localStorage.getItem("userEmail")
    });
  }, []);

  const now = new Date();

  const past = reservations.filter(r => new Date(r.end_time) < now);
  const today = reservations.filter(r => {
    const start = new Date(r.start_time);
    return start.toDateString() === now.toDateString();
  });
  const future = reservations.filter(r => new Date(r.start_time) > now);

  return (
    <div style={{ padding: "40px" }}>
      <h2>User Profile</h2>

      {user && (
        <>
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.email}</p>

          <img 
            src="/default.png" 
            alt="Profile" 
            width="120"
          />

          <div>
            <h3>Biography</h3>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write something about yourself..."
              rows={4}
              cols={50}
            />
          </div>
        </>
      )}

      <hr />

      <h3>Past Reservations</h3>
      {past.map(r => <p key={r.reservation_id}>{r.service_type}</p>)}

      <h3>Today's Reservations</h3>
      {today.map(r => <p key={r.reservation_id}>{r.service_type}</p>)}

      <h3>Future Reservations</h3>
      {future.map(r => <p key={r.reservation_id}>{r.service_type}</p>)}
    </div>
  );
}

export default Profile;