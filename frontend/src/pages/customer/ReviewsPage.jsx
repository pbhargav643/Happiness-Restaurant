import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import reviewApi from '../../services/reviewApi';

/**
 * Interactive Star Rating Selector
 */
function StarSelector({ rating, setRating, disabled }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = (hoverRating || rating) >= star;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => setRating(star)}
            onMouseEnter={() => !disabled && setHoverRating(star)}
            onMouseLeave={() => !disabled && setHoverRating(0)}
            className={`p-1 -m-1 transition-transform focus:outline-none focus-visible:scale-125 cursor-pointer disabled:cursor-not-allowed ${
              !disabled ? 'hover:scale-115 active:scale-95' : ''
            }`}
            aria-label={`${star} Star${star > 1 ? 's' : ''}`}
            aria-checked={rating === star}
            role="radio"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors duration-150 ${
                isFilled
                  ? 'text-[#D4AF37] fill-[#D4AF37] drop-shadow-xs'
                  : 'text-slate-300 fill-slate-100 hover:text-slate-400'
              }`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        );
      })}
      <span className="ml-2 text-xs font-bold text-muted">
        {rating > 0 ? `${rating} of 5 Stars` : 'Select rating'}
      </span>
    </div>
  );
}

/**
 * Display Stars for a review card
 */
function StarDisplay({ rating }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          className={`w-4 h-4 ${
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
 * Format timestamp to readable display date
 */
function formatDate(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Customer Reviews & Ratings Page
 */
export default function ReviewsPage() {
  const { customer, isAuthenticated } = useCustomerAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Fetch all public reviews
  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reviewApi.getReviews();
      if (res.success) {
        setReviews(res.reviews);
      } else {
        setError(res.error || 'Failed to load reviews.');
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Check if current customer already has submitted a review
  const existingCustomerReview = useMemo(() => {
    if (!isAuthenticated || !customer?.id) return null;
    return reviews.find((r) => String(r.customerId) === String(customer.id));
  }, [isAuthenticated, customer, reviews]);

  // Rating Statistics
  const averageRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!isAuthenticated) {
      setFormError('Please sign in to submit a review.');
      return;
    }

    if (!rating || rating < 1 || rating > 5) {
      setFormError('Please select a star rating between 1 and 5.');
      return;
    }

    const trimmed = comment.trim();
    if (!trimmed) {
      setFormError('Please write your review before submitting.');
      return;
    }

    if (existingCustomerReview) {
      setFormError('You have already submitted a review.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await reviewApi.createReview({
        rating,
        comment: trimmed,
      });

      if (res.success) {
        setFormSuccess('Thank you! Your review has been submitted successfully.');
        setComment('');
        await loadReviews();
      } else {
        setFormError(res.error || 'Failed to submit review.');
      }
    } catch (err) {
      setFormError(err.message || 'Error submitting review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 sm:py-16">
      <Container>
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-3.5 py-1.5 rounded-full border border-[#D4AF37]/20 inline-block">
            HAPPINESS RESTAURANT
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight">
            Customer Reviews
          </h1>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            Real guest experiences and verified reviews from our valued takeaway & pickup customers.
          </p>

          {/* Average Rating Score Banner */}
          {reviews.length > 0 && (
            <div className="pt-2 flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-2xl border border-surface-border shadow-xs">
                <span className="text-xl sm:text-2xl font-black text-primary font-sans">
                  {averageRating}
                </span>
                <div className="flex text-[#D4AF37]">
                  <StarDisplay rating={Math.round(averageRating)} />
                </div>
                <span className="text-xs text-muted font-medium ml-1">
                  ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Review Submission Form (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-7 shadow-xs">
              <div className="pb-4 mb-5 border-b border-surface-border">
                <h2 className="text-lg font-bold text-primary">
                  Share Your Experience
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Let us and other food lovers know how your meal and parcel pickup was.
                </p>
              </div>

              {/* Duplicate Review Notice */}
              {existingCustomerReview ? (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#D4AF37]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>You have already submitted a review.</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    Thank you for sharing your feedback with Happiness Restaurant! Your review is currently active on our public reviews wall.
                  </p>
                  <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-900">
                    <span>Your rating: {existingCustomerReview.rating} ★</span>
                    <span>{formatDate(existingCustomerReview.createdAt)}</span>
                  </div>
                </div>
              ) : isAuthenticated ? (
                /* Authenticated Review Form */
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Customer Identity Display (Locked to logged-in user) */}
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1">
                      Reviewer Name
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-surface-border text-xs text-primary font-semibold">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{customer?.name || 'Valued Customer'}</span>
                    </div>
                  </div>

                  {/* Rating Selector */}
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1.5">
                      Rating <span className="text-rose-500">*</span>
                    </label>
                    <StarSelector rating={rating} setRating={setRating} disabled={submitting} />
                  </div>

                  {/* Review Textarea */}
                  <div>
                    <label htmlFor="review-comment" className="block text-xs font-bold text-primary mb-1">
                      Review <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="review-comment"
                      rows="4"
                      value={comment}
                      onChange={(e) => {
                        setComment(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="Write your experience..."
                      className="w-full text-xs font-medium p-3 rounded-xl border border-surface-border bg-white text-primary placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all resize-y min-h-[90px]"
                      maxLength={1000}
                      disabled={submitting}
                      required
                    />
                    <div className="flex justify-between items-center text-[10px] text-muted mt-1">
                      <span>Be respectful and honest.</span>
                      <span>{comment.length}/1000</span>
                    </div>
                  </div>

                  {/* Form Messages */}
                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                      {formSuccess}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting || !comment.trim()}
                    className="w-full py-3 px-5 rounded-xl bg-primary hover:bg-[#1E1E24] text-white text-xs sm:text-sm font-bold tracking-tight shadow-xs hover:shadow-md transition-all duration-200 ease-out hover:-translate-y-[1px] active:translate-y-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {submitting ? 'Submitting Review...' : 'Submit Review'}
                  </button>
                </form>
              ) : (
                /* Unauthenticated Visitor Prompt */
                <div className="text-center py-6 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-surface-border space-y-3">
                  <div className="w-10 h-10 rounded-full bg-accent/15 text-accent mx-auto flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary">Sign in to write a review</h3>
                    <p className="text-xs text-muted max-w-xs mx-auto mt-1">
                      To ensure genuine feedback, review submission is open to registered customers.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2.5 pt-2">
                    <Link
                      to="/login"
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-[#1E1E24] text-white text-xs font-bold transition-all shadow-xs"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      className="px-4 py-2 rounded-xl border border-surface-border text-primary hover:bg-slate-100 text-xs font-bold transition-all"
                    >
                      Register
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Public Reviews List (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-base sm:text-lg font-bold text-primary">
                Guest Reviews ({reviews.length})
              </h2>
              <span className="text-xs text-muted font-medium">
                Sorted by newest first
              </span>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="space-y-3" role="status" aria-label="Loading reviews">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-3xl border border-surface-border p-5 space-y-3 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-slate-200 rounded w-28" />
                      <div className="h-3 bg-slate-200 rounded w-20" />
                    </div>
                    <div className="h-3 bg-slate-200 rounded w-24" />
                    <div className="h-4 bg-slate-200 rounded w-5/6" />
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center space-y-3">
                <p className="text-xs font-bold text-rose-800">{error}</p>
                <button
                  type="button"
                  onClick={loadReviews}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && reviews.length === 0 && (
              <div className="bg-white rounded-3xl border border-surface-border p-10 sm:p-14 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-secondary text-muted mx-auto flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-primary">No reviews yet.</h3>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Be the first to share your experience.
                </p>
              </div>
            )}

            {/* Reviews Cards List */}
            {!loading && !error && reviews.length > 0 && (
              <div className="space-y-3.5">
                {reviews.map((rev) => (
                  <div
                    key={rev._id}
                    className="bg-white rounded-3xl border border-surface-border p-5 sm:p-6 space-y-3 shadow-xs hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-primary">
                            {rev.customerName || 'Customer'}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Verified Guest
                          </span>
                        </div>
                        <StarDisplay rating={rev.rating} />
                      </div>
                      <span className="text-[11px] text-muted font-medium whitespace-nowrap">
                        {formatDate(rev.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
