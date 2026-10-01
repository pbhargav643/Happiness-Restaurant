import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { customerAuthApi } from '../../services/customerAuthApi.js';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';

/**
 * ForgotPasswordPage Component
 *
 * Dedicated customer password recovery portal for Happiness Restaurant.
 *
 * Requirements:
 * - Title: "Forgot Password?"
 * - Description: "Enter your registered mobile number or email address."
 * - Input: Mobile Number or Email
 * - Button: Send Reset Instructions
 * - Link: "Back to Login"
 * - Security: Never reveals whether an account exists, never exposes secrets
 * - Provider transparency: Accurately reflects provider configuration status
 */
export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessInfo(null);

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setErrorMessage('Please enter your registered mobile number or email address.');
      return;
    }

    // Basic format validation: 10-digit Indian phone or email
    const isMobile = /^[6-9]\d{9}$/.test(trimmedId);
    const isEmail = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(trimmedId.toLowerCase());

    if (!isMobile && !isEmail) {
      setErrorMessage('Please enter a valid 10-digit mobile number or email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await customerAuthApi.forgotPassword({ identifier: trimmedId });
      setSuccessInfo({
        message: res?.message || 'If an account exists, password reset instructions have been sent.',
        providerConfigured: res?.providerConfigured !== false,
      });
    } catch (err) {
      if (err?.message?.includes('network') || err?.message?.includes('reach') || err?.status === 0) {
        setErrorMessage(
          import.meta.env.DEV
            ? 'Unable to connect to backend server (port 5000). Please start backend with: npm run dev in backend directory.'
            : 'Unable to connect to the restaurant server. Please check your internet connection.'
        );
      } else {
        setErrorMessage(err?.message || 'Unable to process your request. Please try again.');
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
            Forgot Password?
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Enter your registered mobile number or email address.
          </p>
        </div>

        {/* Form Card */}
        <div className="mt-8 bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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

            {/* Success / Status Message Display */}
            {successInfo && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  successInfo.providerConfigured
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
                role="status"
                aria-live="polite"
              >
                {successInfo.providerConfigured ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
                <div>
                  <p className="font-semibold">{successInfo.message}</p>
                </div>
              </div>
            )}

            {/* Mobile Number or Email Field */}
            <div>
              <label
                htmlFor="reset-identifier"
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
                  id="reset-identifier"
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
                    <span>Sending instructions...</span>
                  </span>
                ) : (
                  <span>Send Reset Instructions</span>
                )}
              </button>
            </div>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <span>&larr; Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
