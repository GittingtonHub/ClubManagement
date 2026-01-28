import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Replace with actual authentication logic
    // Should POST to PHP backend (e.g., /api/login.php)
    // Validate credentials, receive token/session
    // Example:
    // const response = await fetch('/api/login.php', {
    //   method: 'POST',
    //   body: JSON.stringify({ username, password })
    // });
    login({ username });
    navigate('/');
  };

  return (
    <div className="login-container">
      <header>
        <h1>Club Management</h1>
      </header>

      <div className='input-container'>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleSubmit}>Login</button>

      </div>
    </div>
  );
}

export default Login;