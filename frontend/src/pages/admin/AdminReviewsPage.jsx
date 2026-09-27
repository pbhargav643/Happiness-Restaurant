import React, { useState, useEffect, useCallback } from 'react';
import reviewApi from '../../services/reviewApi';

/**
 * StarDisplay component for Admin review view
 */
function StarDisplay({ rating }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          className={`w-3.5 h-3.5 ${
            star <= rating
              ? 'text-[#D4AF37] fill-[#D4AF37]'
              : 'text-slate-200 fill-slate-100'
          }`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ))}
    </div>
  );
}

/**
 * Format timestamp into display date
 */
function formatDate(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

/**
 * AdminReviewsPage Component
 * Admin portal for inspecting customer reviews and permanently deleting individual reviews.
 */
export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Delete Confirmation State
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch reviews from Admin endpoint
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reviewApi.getAdminReviews();
      if (res.success) {
        setReviews(res.reviews);
      } else {
        setError(res.error || 'Failed to load reviews.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Execute review deletion
  const handleConfirmDelete = async () => {
    if (!reviewToDelete?._id) return;
    setIsDeleting(true);
    setActionMessage(null);

    try {
      const res = await reviewApi.deleteReview(reviewToDelete._id);
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `Review from "${reviewToDelete.customerName}" deleted successfully.`,
        });
        setReviewToDelete(null);
        await fetchReviews();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || 'Failed to delete review.',
        });
      }
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Error executing review deletion.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
            Customer Reviews Management
          </h1>
          <p className="text-xs text-muted mt-1">
            Monitor guest feedback, review ratings, and moderate customer testimonials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white border border-surface-border text-xs font-bold text-primary shadow-xs">
            Total Reviews: {reviews.length}
          </span>
          <button
            type="button"
            onClick={fetchReviews}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white border border-surface-border text-xs font-semibold text-primary hover:bg-slate-50 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh reviews"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Action Notice Banner */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
          role="status"
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchReviews}
            className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs hover:bg-rose-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Reviews Table Card */}
      <div className="bg-white rounded-3xl border border-surface-border shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-accent animate-spin mx-auto" />
            <p>Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary text-muted mx-auto flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-primary">No reviews found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Customers have not submitted any reviews yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="Customer Reviews Table">
              <thead>
                <tr className="border-b border-surface-border bg-slate-50/70 text-[11px] font-bold text-muted uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4 sm:px-6">Customer</th>
                  <th scope="col" className="py-3 px-4">Rating</th>
                  <th scope="col" className="py-3 px-4 min-w-[240px]">Review</th>
                  <th scope="col" className="py-3 px-4">Date</th>
                  <th scope="col" className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-xs">
                {reviews.map((rev) => (
                  <tr key={rev._id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Customer Name */}
                    <td className="py-3.5 px-4 sm:px-6 font-bold text-primary whitespace-nowrap">
                      {rev.customerName || 'Anonymous Guest'}
                    </td>

                    {/* Rating */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <StarDisplay rating={rev.rating} />
                        <span className="text-[11px] font-bold text-slate-700">
                          {rev.rating}.0
                        </span>
                      </div>
                    </td>

                    {/* Review text */}
                    <td className="py-3.5 px-4 text-slate-700 leading-relaxed max-w-md">
                      <p className="line-clamp-3 whitespace-pre-wrap">
                        {rev.comment}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-muted whitespace-nowrap">
                      {formatDate(rev.createdAt)}
                    </td>

                    {/* Action: Delete */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setReviewToDelete(rev)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer hover:-translate-y-[1px] active:translate-y-0"
                        aria-label={`Delete review from ${rev.customerName}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {reviewToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-review-title"
        >
          <div className="bg-white rounded-3xl border border-surface-border shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 id="delete-review-title" className="text-base font-bold text-primary">
                  Delete Review?
                </h3>
                <p className="text-xs text-muted">
                  Permanent review removal
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100 text-xs text-rose-900 leading-relaxed space-y-1.5">
              <p>
                This review will be permanently removed.
              </p>
              <div className="bg-white/80 p-2.5 rounded-xl border border-rose-200/50 text-[11px] text-slate-700">
                <p className="font-bold text-primary">{reviewToDelete.customerName} ({reviewToDelete.rating} ★)</p>
                <p className="truncate mt-0.5">&ldquo;{reviewToDelete.comment}&rdquo;</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-surface-border text-primary hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white border border-rose-500/40 text-xs font-bold tracking-tight transition-all duration-200 ease-out shadow-xs hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-rose-100 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Review</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
