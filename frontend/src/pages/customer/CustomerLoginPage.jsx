import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';

/**
 * CustomerLoginPage Component
 *
 * Dedicated customer login portal for Happiness Restaurant.
 *
 * Features:
 * - Login using 10-digit Indian mobile number OR email address
 * - Client-side validation before sending request
 * - Session expired notification banner
 * - Redirects to previous route (e.g., checkout, account) on success
 * - Guest checkout reassurance banner
 */
export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, sessionExpired, clearExpiredNotice } = useCustomerAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated as customer, redirect to destination or account
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/account';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setErrorMessage('Please enter your mobile number or email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (clearExpiredNotice) {
        clearExpiredNotice();
      }

      await login({ identifier: trimmedId, password });

      const destination = location.state?.from?.pathname || '/account';
      navigate(destination, { replace: true });
    } catch (err) {
      if (err?.status === 401) {
        setErrorMessage('Invalid mobile number/email or password.');
      } else if (err?.status === 403) {
        setErrorMessage('Your customer account is inactive. Please contact restaurant support.');
      } else if (err?.status === 429) {
        setErrorMessage('Too many login attempts. Please wait a few minutes before trying again.');
      } else if (err?.message?.includes('network') || err?.message?.includes('reach') || err?.status === 0) {
        setErrorMessage('Unable to connect to the restaurant server. Please check your internet connection.');
      } else {
        setErrorMessage(err?.message || 'Login failed. Please verify your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 text-white font-black text-2xl shadow-md mb-3">
            HR
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Customer Sign In
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back to {RESTAURANT_CONFIG.name}
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {/* Session Expired Banner */}
            {(sessionExpired || location.state?.sessionExpired) && (
              <div
                className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5"
                role="alert"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">
                  Your session has expired. Please sign in again to continue.
                </span>
              </div>
            )}

            {/* Error Message Display */}
            {errorMessage && (
              <div
                className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs flex items-center gap-2.5"
                role="alert"
                aria-live="assertive"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Mobile or Email Field */}
            <div>
              <label
                htmlFor="customer-identifier"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Mobile Number or Email
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="customer-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="9876543210 or name@example.com"
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="customer-password"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="customer-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;"
                  className="block w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          {/* Registration Link */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-600">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-bold text-amber-600 hover:text-amber-700 underline underline-offset-2"
              >
                Create an account
              </Link>
            </p>
          </div>

          {/* Guest Checkout Guarantee */}
          <div className="mt-4 p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
            <p className="text-xs text-gray-700">
              Want quick self-pickup?{' '}
              <Link to="/menu" className="font-semibold text-amber-700 hover:underline">
                Order directly as Guest &rarr;
              </Link>
            </p>
          </div>

          {/* Home Return Link */}
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <span>&larr; Return to Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>

  );
}
