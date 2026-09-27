import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';

/**
 * PrivacyPage Placeholder
 * Architectural placeholder for Privacy Policy.
 */
export default function PrivacyPage() {
  return (
    <Container className="py-8 text-center">
      <div className="p-6 sm:p-8 border-2 border-dashed border-surface-border rounded-xl bg-white max-w-xl mx-auto">
        <span className="inline-block px-3 py-1 text-xs font-semibold text-accent bg-accent/10 rounded-full mb-3">
          Temporary Route Placeholder
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-primary mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted">
          Route: <code className="bg-muted-bg px-2 py-1 rounded text-xs">/privacy</code>
        </p>
        <p className="text-xs text-muted mt-4">
          Customer contact privacy, mobile number usage for pickup notification SMS/WhatsApp, and data protection guidelines for {RESTAURANT_CONFIG.name} will be detailed here.
        </p>
        <div className="mt-4">
          <Link to="/" className="text-xs text-accent hover:underline font-medium">
            &larr; Return to Home
          </Link>
        </div>
      </div>
    </Container>
  );
}
