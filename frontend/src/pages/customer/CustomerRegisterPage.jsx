import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';

const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

/**
 * CustomerRegisterPage Component
 *
 * Dedicated customer account creation portal for Happiness Restaurant.
 *
 * Features:
 * - Full client-side validation (name length, 10-digit mobile, optional email, matching passwords)
 * - Error feedback for duplicate accounts (409 Conflict)
 * - Automatic customer login upon successful registration
 * - Guest checkout reassurance banner
 */
export default function CustomerRegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isAuthenticated } = useCustomerAuth();

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated as customer, redirect
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/account';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const { name, mobile, email, password, confirmPassword } = formData;

    // 1. Name validation
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }

    // 2. Mobile validation
    const trimmedMobile = mobile.trim();
    if (!trimmedMobile) {
      setErrorMessage('Please enter your 10-digit mobile number.');
      return;
    }
    if (!MOBILE_REGEX.test(trimmedMobile)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    // 3. Optional Email validation
    const trimmedEmail = email.trim();
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address or leave it blank.');
      return;
    }

    // 4. Password validation
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    // 5. Confirm password
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: trimmedName,
        mobile: trimmedMobile,
        email: trimmedEmail || undefined,
        password,
      });

      const destination = location.state?.from?.pathname || '/account';
      navigate(destination, { replace: true });
    } catch (err) {
      if (err?.status === 409) {
        setErrorMessage(err?.message || 'An account with this mobile number or email already exists.');
      } else if (err?.message?.includes('network') || err?.message?.includes('reach') || err?.status === 0) {
        setErrorMessage(
          import.meta.env.DEV
            ? 'Unable to connect to backend server (port 5000). Please start backend with: npm run dev in backend directory.'
            : 'Unable to connect to the restaurant server. Please check your internet connection.'
        );
      } else {
        setErrorMessage(err?.message || 'Registration failed. Please check your details.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 text-white font-black text-2xl shadow-md mb-3">
            HR
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Enjoy faster takeaway and track orders with {RESTAURANT_CONFIG.name}
          </p>
        </div>

        {/* Registration Card */}
        <div className="mt-8 bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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

            {/* Name Field */}
            <div>
              <label
                htmlFor="reg-name"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Username"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Mobile Field */}
            <div>
              <label
                htmlFor="reg-mobile"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1"
              >
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-gray-500">
                  +91
                </span>
                <input
                  id="reg-mobile"
                  name="mobile"
                  type="tel"
                  autoComplete="tel"
                  required
                  maxLength={10}
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="WhatsApp Number"
                  className="block w-full pl-11 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Optional Email Field */}
            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1"
              >
                Email Address <span className="text-gray-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="User Email Address"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-lg shadow-xs">
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="block w-full px-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
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

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="reg-confirm-password"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1"
              >
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-confirm-password"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-3">
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
                    <span>Creating account...</span>
                  </span>
                ) : (
                  <span>Register &amp; Continue</span>
                )}
              </button>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-amber-600 hover:text-amber-700 underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </div>


          {/* Guest Checkout Guarantee */}
          <div className="mt-4 p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
            <p className="text-xs text-gray-700">
              Prefer to order without signing up?{' '}
              <Link to="/menu" className="font-semibold text-amber-700 hover:underline">
                Order as Guest &rarr;
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
