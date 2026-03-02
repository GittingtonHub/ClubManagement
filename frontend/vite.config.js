import react from '@vitejs/plugin-react';

export default {
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // We point this to the parent folder now
        target: 'http://localhost/ClubManagement', 
        changeOrigin: true,
        secure: false,
        // Notice we COMPLETELY removed the 'rewrite' line!
        // Now, fetch('/api/login.php') automatically translates to:
        // http://localhost/ClubManagement/api/login.php
      },
    },
  },
};