import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState } from 'react'

function SignUp() {
  let [isOpen, setIsOpen] = useState(false)

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
    login({ email });
    navigate('/');
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Sign Up</button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-lg space-y-4 border bg-white p-12">

            <DialogTitle className="font-bold">Create an Account</DialogTitle>
            <Description>Enter your email and password to create an account.</Description>
            
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

                <button onClick={handleSubmit}>Sign Up</button>

            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

export default SignUp;