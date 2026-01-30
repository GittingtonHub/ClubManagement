import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
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
    login({ email: email });
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
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleSubmit}>Login</button>

        <button onClick={() => setIsSignUpOpen(true)}>Sign Up</button>
      </div>

      <Dialog open={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm rounded bg-white p-6 shadow-lg">
            <DialogTitle className="text-lg font-bold mb-4">Sign Up</DialogTitle>
            
            <div className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="border rounded px-3 py-2"
              />
              <input
                type="password"
                placeholder="Password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="border rounded px-3 py-2"
              />
              
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    // TODO: Handle signup logic
                    setIsSignUpOpen(false);
                  }}
                  className="flex-1 bg-blue-500 text-white py-2 rounded"
                >
                  Create Account
                </button>
                <button 
                  onClick={() => setIsSignUpOpen(false)}
                  className="flex-1 bg-gray-300 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}

export default Login;