import React from 'react';
import Container from '../../components/common/Container';

/**
 * FaqPage Placeholder
 * Temporary placeholder to verify route architecture.
 * Final UI will be built in Phase 10.
 */
export default function FaqPage() {
  return (
    <Container className="py-8 text-center">
      <div className="p-8 border-2 border-dashed border-surface-border rounded-xl bg-white max-w-xl mx-auto">
        <span className="inline-block px-3 py-1 text-xs font-semibold text-accent bg-accent/10 rounded-full mb-3">
          Temporary Route Placeholder
        </span>
        <h1 className="text-2xl font-bold text-primary mb-2">Frequently Asked Questions</h1>
        <p className="text-sm text-muted">
          Route: <code className="bg-muted-bg px-2 py-1 rounded text-xs">/faq</code>
        </p>
        <p className="text-xs text-muted mt-4">
          Frequently asked questions regarding parcel pickup ordering, pickup slots, and counter payments will be implemented in Phase 10.
        </p>
      </div>
    </Container>
  );
}
