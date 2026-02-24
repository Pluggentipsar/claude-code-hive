/**
 * Login page component
 */

import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';
import { getErrorMessage } from '../api/client';

export function LoginPage() {
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Setup mode state
  const [setupMode, setSetupMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [setupDone, setSetupDone] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (msg === 'Not authenticated' || msg.includes('Incorrect')) {
        setError('Fel e-post eller lösenord');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.registerFirst({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
      setSetupDone(true);
      setSetupMode(false);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (msg.includes('already exist')) {
        setError('Det finns redan användare. Logga in istället.');
        setSetupMode(false);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Kålgårdens Schema
          </h1>
          <p className="mt-2 text-gray-600">
            Schemaläggningssystem
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {setupDone && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
              Admin-konto skapat! Logga in nedan.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}

          {setupMode ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Skapa första admin-kontot
              </h2>
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Förnamn
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Efternamn
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-post
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lösenord (minst 8 tecken)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Skapar...' : 'Skapa admin-konto'}
                </button>
                <button
                  type="button"
                  onClick={() => setSetupMode(false)}
                  className="w-full py-2 px-4 text-gray-600 font-medium rounded-md hover:bg-gray-100"
                >
                  Tillbaka till inloggning
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Logga in
              </h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-post
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lösenord
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Loggar in...' : 'Logga in'}
                </button>
              </form>
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <button
                  onClick={() => setSetupMode(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Första gången? Skapa admin-konto
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
