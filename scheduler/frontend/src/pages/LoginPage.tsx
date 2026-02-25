/**
 * Login page component — split layout with gradient panel
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { Button } from '../components/Common/Button';

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
    <div className="min-h-screen bg-surface-50 flex">
      {/* Decorative gradient panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-32 right-16 w-96 h-96 rounded-full bg-accent-400/20 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h1 className="text-4xl font-bold text-white text-display leading-tight">
            Kålgårdens<br />Schemaläggning
          </h1>
          <p className="mt-4 text-primary-200 text-lg max-w-md">
            Smart schemaläggning för fritidsverksamhet. Enkelt, snabbt och pålitligt.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <h1 className="text-2xl font-bold text-surface-900 text-display">
              Kålgårdens Schema
            </h1>
            <p className="mt-1 text-surface-500">Schemaläggningssystem</p>
          </div>

          <div className="card p-8">
            {setupDone && (
              <div className="mb-4 p-3 bg-success-50 border border-success-100 rounded-xl text-success-700 text-sm">
                Admin-konto skapat! Logga in nedan.
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-xl text-danger-700 text-sm">
                {error}
              </div>
            )}

            {setupMode ? (
              <>
                <h2 className="text-xl font-semibold text-surface-900 mb-6">
                  Skapa första admin-kontot
                </h2>
                <form onSubmit={handleSetup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Förnamn</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="input-base"
                      />
                    </div>
                    <div>
                      <label className="label">Efternamn</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="input-base"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">E-post</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="input-base"
                    />
                  </div>
                  <div>
                    <label className="label">Lösenord (minst 8 tecken)</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="input-base"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="success"
                    disabled={loading}
                    isLoading={loading}
                    className="w-full"
                  >
                    Skapa admin-konto
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSetupMode(false)}
                    className="w-full py-2 text-sm text-surface-500 hover:text-surface-700 font-medium transition-colors"
                  >
                    Tillbaka till inloggning
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-surface-900 mb-6">
                  Logga in
                </h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="label">E-post</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="input-base"
                    />
                  </div>
                  <div>
                    <label className="label">Lösenord</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="input-base"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    isLoading={loading}
                    className="w-full"
                  >
                    Logga in
                  </Button>
                </form>
                <div className="mt-6 pt-4 border-t border-surface-100 text-center">
                  <button
                    onClick={() => setSetupMode(true)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                  >
                    Första gången? Skapa admin-konto
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
