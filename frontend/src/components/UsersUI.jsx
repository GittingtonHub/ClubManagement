import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useState } from 'react';
import { useEffect } from 'react';


function UsersUI() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [users, setUsers] = useState([]);
  const safeUsers = Array.isArray(users) ? users : [];

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
    const dayDiff = Math.floor((Date.now() - createdDate.getTime()) / millisecondsPerDay);
    return Math.max(dayDiff, 0);
  };


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
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users.php', {
          credentials: 'include'
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) : [];
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    
    fetchUsers();
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

  return (
    <>
      <div className="table-div" id='users-table-div'>
        
        <div className="add-item-button">
            <button onClick={() => {
              setIsAddUserOpen(true);
            }}>Add User</button>
        </div>

        <table className='inventory-table' id='users-table'>
          <tr className="table-header">
            <th>User ID</th>
            <th>Email Address</th>
            <th>Registered (Days)</th>
            <th>Total Reservations</th>
            <th>Past Reservations</th>
            <th>Upcoming Reservations</th>
          </tr>

          {safeUsers.map((user, index) => (
            <tr className="table-row" key={user.id ?? index}>
              <td className="table-cell-itemno">{formatMetric(user.id)}</td>
              <td className="table-cell-name">{formatMetric(user.email)}</td>
              <td>{getRegisteredDays(user.created_at)}</td>
              <td>{formatMetric(user.total_reservations)}</td>
              <td>{formatMetric(user.past_reservations)}</td>
              <td>{formatMetric(user.upcoming_reservations)}</td>
            </tr>
          ))}
        </table>

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

      </div>
    </>
  );
}

export default UsersUI;
