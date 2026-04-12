import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { DayPilot } from "@daypilot/daypilot-lite-react";
import { useEffect, useMemo, useState } from 'react';



const normalizeRole = (roleValue) => String(roleValue ?? '').trim();

const deriveRoleOptionsFromUsers = (userList) => {
  const derivedRoles = (Array.isArray(userList) ? userList : [])
    .map((user) => normalizeRole(user?.role))
    .filter(Boolean);

  return Array.from(new Set(derivedRoles)).sort((a, b) => a.localeCompare(b));
};

function UsersUI() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [roleUpdateByUserId, setRoleUpdateByUserId] = useState({});
  const [referenceNowMs] = useState(() => Date.now());
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [removeUserId, setRemoveUserId] = useState(null);
  const [removeReason, setRemoveReason] = useState('');

  const safeUsers = Array.isArray(users) ? users : [];
  const safeReservations = Array.isArray(reservations) ? reservations : [];

  const handleRoleSubmit = (event) => {
    event.preventDefault();
  };

  

  const formatMetric = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'Pending';
    }
    return value;
  };

  const getRegisteredDays = (createdAt) => {
    if (!createdAt) {
      return 'Pending';
    }

    const createdDate = new Date(createdAt);
    if (Number.isNaN(createdDate.getTime())) {
      return 'Pending';
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const dayDiff = Math.floor((referenceNowMs - createdDate.getTime()) / millisecondsPerDay);
    return Math.max(dayDiff, 0);
  };

  const reservationMetricsByUser = useMemo(() => {
    const metricsMap = new Map();

    safeReservations.forEach((reservation) => {
      const userId = reservation?.user_id;
      if (userId === null || userId === undefined || userId === '') {
        return;
      }

      const status = String(reservation?.status ?? '').trim().toLowerCase();
      if (status === 'cancelled') {
        return;
      }

      const key = String(userId);
      const existing = metricsMap.get(key) ?? {
        total: 0,
        past: 0,
        upcoming: 0
      };

      existing.total += 1;

      const startMs = new Date(reservation?.start_time ?? '').getTime();
      if (!Number.isNaN(startMs) && startMs < referenceNowMs) {
        existing.past += 1;
      } else {
        existing.upcoming += 1;
      }

      metricsMap.set(key, existing);
    });

    return metricsMap;
  }, [safeReservations, referenceNowMs]);

  const effectiveRoleOptions = useMemo(() => {
    const mergedRoles = [
      ...roleOptions,
      ...deriveRoleOptionsFromUsers(safeUsers)
    ]
      .map((role) => normalizeRole(role))
      .filter(Boolean);

    return Array.from(new Set(mergedRoles)).sort((a, b) => a.localeCompare(b));
  }, [roleOptions, safeUsers]);

  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    if (email.length > 255) {
      setEmailError('Email must be 255 characters or less');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password) => {
    if (!password || password.trim() === '') {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersResponse, reservationsResponse, rolesResponse] = await Promise.allSettled([
          fetch('/api/users.php', { credentials: 'include' }),
          fetch('/api/reservations.php', { credentials: 'include' }),
          fetch('/api/update_role.php', { credentials: 'include' })
        ]);

        let nextUsers = [];

        if (usersResponse.status === 'fulfilled') {
          const usersText = await usersResponse.value.text();
          const usersPayload = usersText ? JSON.parse(usersText) : [];
          if (Array.isArray(usersPayload)) {
            nextUsers = usersPayload;
          } else if (Array.isArray(usersPayload?.users)) {
            nextUsers = usersPayload.users;
          } else {
            nextUsers = [];
          }
          setUsers(nextUsers);
        } else {
          setUsers([]);
        }

        if (reservationsResponse.status === 'fulfilled') {
          const reservationsText = await reservationsResponse.value.text();
          const reservationsPayload = reservationsText ? JSON.parse(reservationsText) : [];
          setReservations(Array.isArray(reservationsPayload) ? reservationsPayload : []);
        } else {
          setReservations([]);
        }

        if (rolesResponse.status === 'fulfilled') {
          const rolesText = await rolesResponse.value.text();
          const rolesPayload = rolesText ? JSON.parse(rolesText) : {};
          if (Array.isArray(rolesPayload?.roles)) {
            const cleanedRoles = rolesPayload.roles
              .map((role) => normalizeRole(role))
              .filter(Boolean);
            setRoleOptions(Array.from(new Set(cleanedRoles)));
          } else {
            setRoleOptions(deriveRoleOptionsFromUsers(nextUsers));
          }
        } else {
          setRoleOptions(deriveRoleOptionsFromUsers(nextUsers));
        }
      } catch (error) {
        console.error('Failed to fetch users or reservations:', error);
        setUsers([]);
        setReservations([]);
        setRoleOptions([]);
      }
    };
    
    fetchData();
  }, []);



  const handleAddUser = async () => {
    // Validate all fields first
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }
    
    try {
      const response = await fetch('/api/users.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email,
          password: password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUsers((previousUsers) =>
          Array.isArray(previousUsers) ? [...previousUsers, data.user] : [data.user]
        ); // Add new user to list
        setEmail('');
        setPassword('');
        setIsAddUserOpen(false);
      }
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  const handleRoleChange = async (user, selectedRole) => {
    const currentRole = normalizeRole(user?.role);
    const nextRole = normalizeRole(selectedRole);
    const userId = user?.id;

    if (!userId || !nextRole || nextRole === currentRole || roleUpdateByUserId[userId]) {
      return;
    }

    const confirmation = await DayPilot.Modal.confirm(
      "Do you want to update this person's role?",
      { okText: 'Yes', cancelText: 'Cancel' }
    );

    if (confirmation?.canceled) {
      return;
    }

    setRoleUpdateByUserId((previous) => ({ ...previous, [userId]: true }));

    try {
      const response = await fetch('/api/update_role.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          new_role: nextRole
        })
      });

      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) : {};

      if (!response.ok || payload?.success === false) {
        await DayPilot.Modal.alert(payload?.message || 'Unable to update user role.');
        return;
      }

      setUsers((previousUsers) =>
        (Array.isArray(previousUsers) ? previousUsers : []).map((existingUser) =>
          existingUser?.id === userId
            ? { ...existingUser, role: nextRole }
            : existingUser
        )
      );
    } catch (error) {
      console.error('Failed to update user role:', error);
      await DayPilot.Modal.alert('Unable to update user role.');
    } finally {
      setRoleUpdateByUserId((previous) => ({ ...previous, [userId]: false }));
    }
  };

  return (
    <>
      <div className="table-div" id='users-table-div'>
        
        <div className="add-item-button">
            <button onClick={() => {
              setIsAddUserOpen(true);
            }}>Add User</button>
        </div>

        <form method="post" onSubmit={handleRoleSubmit}>
        <table className='inventory-table' id='users-table'>
          <tr className="table-header">
            <th>User ID</th>
            <th>Email Address</th>
            <th>Role</th>
            <th>Registered (Days)</th>
            <th>Total Reservations</th>
            <th>Past Reservations</th>
            <th>Upcoming Reservations</th>
            <th>Actions</th>
          </tr>

          {safeUsers.filter(u => !u.removed).map((user, index) => {
            const userMetrics = reservationMetricsByUser.get(String(user.id)) ?? {
              total: 0,
              past: 0,
              upcoming: 0
            };

            return (
              <tr className="table-row" key={user.id ?? index}>
                <td className="table-cell-itemno">{formatMetric(user.id)}</td>
                <td className="table-cell-name">{formatMetric(user.email)}</td>
                <td>
                  <select
                    value={normalizeRole(user.role)}
                    onChange={(event) => handleRoleChange(user, event.target.value)}
                    disabled={Boolean(roleUpdateByUserId[user.id])}
                  >
                    {!normalizeRole(user.role) && <option value="">Select role</option>}
                    {effectiveRoleOptions.map((roleOption) => (
                      <option key={`${user.id}-${roleOption}`} value={roleOption}>
                        {roleOption}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{getRegisteredDays(user.created_at)}</td>
                <td>{userMetrics.total}</td>
                <td>{userMetrics.past}</td>
                <td>{userMetrics.upcoming}</td>

                <td>
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveUserId(user.id);
                      setRemoveReason('');
                      setIsRemoveOpen(true);
                    }}
                  >
                    Remove
                  </button>
                </td>

                </tr>
            );
          })}
        </table>
        {/* <button type="reset">Reset</button>
      <button type="submit">Submit</button> */}
          </form>

          <Dialog open={isAddUserOpen} onClose={() => {}} className="add-item-dialog">
            <div className="add-item-dialog-backdrop" aria-hidden="true" />
            <div className="add-item-dialog-container">
              <DialogPanel className="add-item-dialog-panel">
                <DialogTitle className="add-item-header">Add New User</DialogTitle>
                <div className="inner-add-item-container">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    onBlur={() => validateEmail(email)}
                    className="add-item-name-input"
                    maxLength={255}
                    style={{
                      border: emailError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                    }}
                  />
                  {emailError && <span style={{ color: 'red', fontSize: '14px' }}>{emailError}</span>}

                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) validatePassword(e.target.value);
                    }}
                    onBlur={() => validatePassword(password)}
                    className="add-item-type-input"
                    style={{
                      border: passwordError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                    }}
                  />
                  {passwordError && <span style={{ color: 'red', fontSize: '14px' }}>{passwordError}</span>}

                  <div className="button-group">
                    <button 
                      onClick={() => {
                        handleAddUser()
                      }}
                      className="inline"
                    >
                      Add User
                    </button>
                    <button 
                      onClick={() => {
                        setIsAddUserOpen(false);
                      }}
                      className="inline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </div>
          </Dialog>

          {/* NEW REMOVE USER MODAL */}
          <Dialog open={isRemoveOpen} onClose={() => setIsRemoveOpen(false)} className="add-item-dialog">
            <div className="add-item-dialog-backdrop" aria-hidden="true" />
            <div className="add-item-dialog-container">
              <DialogPanel className="add-item-dialog-panel">
                <DialogTitle className="add-item-header">Remove User</DialogTitle>

                <div className="inner-add-item-container">
                  <textarea
                    placeholder="Enter reason..."
                    value={removeReason}
                    onChange={(e) => setRemoveReason(e.target.value)}
                    className="add-item-name-input"
                  />

                  <div className="button-group">
                    <button
                      onClick={async () => {
                        if (!removeReason.trim()) {
                          alert("Reason required");
                          return;
                        }

                        try {
                          const res = await fetch('/api/delete_user.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                              id: removeUserId,
                              reason: removeReason
                            })
                          });

                          const data = await res.json();

                          if (!res.ok || !data.success) {
                            alert(data.message || "Failed to remove user.");
                            return;
                          }

                          setUsers(prev =>
                            prev.map(u =>
                              u.id === removeUserId ? { ...u, removed: 1 } : u
                            )
                          );
                          setIsRemoveOpen(false);

                        } catch (err) {
                          console.error(err);
                          alert("Error removing user.");
                        }
                      }}
                      className="inline"
                    >
                      Remove
                    </button>

                    <button 
                      onClick={() => setIsRemoveOpen(false)}
                      className="inline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </div>
          </Dialog>

          </div>
        </>
      );
    }
        
    export default UsersUI;          