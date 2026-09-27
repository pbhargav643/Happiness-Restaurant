import React from 'react';
import { Link } from 'react-router-dom';

/**
 * NotFoundPage
 * Global 404 handler for invalid customer or admin URLs.
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="text-center max-w-md p-6 bg-white border border-surface-border rounded-xl shadow-xs">
        <h1 className="text-5xl font-extrabold text-primary mb-2">404</h1>
        <h2 className="text-base font-bold text-primary mb-2">Page Not Found</h2>
        <p className="text-xs text-muted mb-6">
          The page URL you requested is invalid or does not exist.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link
            to="/"
            className="w-full sm:w-auto px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-light transition-colors"
          >
            Go to Customer Home
          </Link>
          <Link
            to="/admin"
            className="w-full sm:w-auto px-4 py-2 border border-surface-border text-primary text-xs font-medium rounded-lg hover:bg-muted-bg transition-colors"
          >
            Go to Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
