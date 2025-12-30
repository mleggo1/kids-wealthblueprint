import React, { useState, useMemo } from 'react';

interface PasswordGateProps {
  children: React.ReactNode;
  appName?: string;
}

const PasswordGate: React.FC<PasswordGateProps> = ({ children, appName = 'Family Wealth Blueprint' }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [authed, setAuthed] = useState(false);

  // Calculate expected password based on current month
  const expectedPassword = useMemo(() => {
    const month = new Date().getMonth() + 1; // getMonth() returns 0-11, so add 1
    return `MJL${month}`;
  }, []);

  const handleLogin = () => {
    const normalized = input.trim().toUpperCase();
    if (normalized === expectedPassword) {
      setAuthed(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  if (authed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 sm:p-12 max-w-md w-full border-2 border-blue-200">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 text-center">
          Welcome to {appName}
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Please enter this month's access password to continue.
        </p>
        
        <div className="space-y-4">
          <input
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="Password"
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            autoFocus
          />
          
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-lg transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
          >
            Log in
          </button>
          
          {error && (
            <div className="text-red-600 text-sm text-center mt-2">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordGate;





