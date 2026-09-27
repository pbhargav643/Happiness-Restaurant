import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/common/Container.jsx';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig.js';
import { settingsApi } from '../../services/settingsApi.js';

/**
 * Verified Location Configuration for HAPPINESS RESTAURANT
 */
const RESTAURANT_LOCATION = {
  name: 'HAPPINESS RESTAURANT',
  addressLine1: 'QX8M+J67, Navjivan Colony,',
  addressLine2: 'Bilimora, Gujarat 396325, India',
  fullAddress: 'QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India',
  landmark:
    'Rajhans Complex / Opposite L.M.P. School, College Road / Chikhli Road, Bilimora.',
  // Direct Google Maps Directions link targeting verified restaurant location
  directionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=QX8M%2BJ67%2C+Navjivan+Colony%2C+Bilimora%2C+Gujarat+396325%2C+India',
  // Direct Google Maps Search / Place link
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=QX8M%2BJ67%2C+Navjivan+Colony%2C+Bilimora%2C+Gujarat+396325%2C+India',
  // Embed URL for responsive iframe preview (no API key required)
  embedUrl:
    'https://maps.google.com/maps?q=QX8M%2BJ67,+Navjivan+Colony,+Bilimora,+Gujarat+396325&t=&z=16&ie=UTF8&iwloc=&output=embed',
};

/**
 * ContactPage Component
 * Official Contact Page for HAPPINESS RESTAURANT
 *
 * Requirements:
 * - Contact Hero: Title & Subtitle matching prompt verbatim
 * - Verified Restaurant Location: QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India
 * - Google Maps integration: Location preview, GET DIRECTIONS button, Open in Google Maps button
 * - Landmark: Rajhans Complex / Opposite L.M.P. School, College Road / Chikhli Road, Bilimora
 * - Pickup Information: Parcel Pickup Only & In-store Counter Collection (Self-Pickup Only)
 * - Contact Form: Frontend UI with non-fake submission response ("Contact form is currently unavailable")
 */
export default function ContactPage() {
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactInfo: '',
    message: '',
  });
  const [formStatus, setFormStatus] = useState(null); // { type: 'notice', message: string }
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await settingsApi.getSettings();
        setSettings(data);
      } catch {
        setSettings(null);
      }
    }
    loadSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errors = {};
    if (!formData.name.trim()) errors.name = 'Please enter your name';
    if (!formData.contactInfo.trim())
      errors.contactInfo = 'Please enter your mobile number or email';
    if (!formData.message.trim()) errors.message = 'Please enter your message';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Do NOT pretend a message was sent.
    // Show a professional non-fake notice that the form is currently unavailable.
    setFormStatus({
      type: 'notice',
      message:
        'Contact form is currently unavailable. Please visit our restaurant counter for direct assistance.',
    });
  };

  return (
    <div className="w-full bg-secondary min-h-screen pb-16 sm:pb-24">
      {/* 1. BREADCRUMBS */}
      <div className="bg-white border-b border-surface-border py-3">
        <Container>
          <nav aria-label="Breadcrumb" className="text-xs text-muted">
            <ol className="flex items-center space-x-1.5">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted-light">
                &rarr;
              </li>
              <li className="font-semibold text-primary" aria-current="page">
                Contact
              </li>
            </ol>
          </nav>
        </Container>
      </div>

      {/* 2. CONTACT HERO */}
      <section
        className="relative overflow-hidden bg-secondary py-12 sm:py-16 border-b border-surface-border"
        aria-labelledby="contact-hero-title"
      >
        <div
          className="absolute top-0 right-1/4 -z-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-surface-border shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] sm:text-xs font-bold tracking-wider text-muted uppercase">
                GET IN TOUCH &bull; PARCEL PICKUP
              </span>
            </div>

            <h1
              id="contact-hero-title"
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight"
            >
              Contact HAPPINESS RESTAURANT
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
              Have a question about your order or pickup? Get in touch with us.
            </p>
          </div>
        </Container>
      </section>

      {/* 3. MAIN CONTENT: INFO, FORM & GOOGLE MAPS */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Restaurant Info & Pickup Details (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Restaurant Details Card */}
              <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 shadow-xs space-y-6">
                <div className="border-b border-surface-border pb-4">
                  <span className="text-xs font-bold text-accent uppercase tracking-wider block">
                    Official Details
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-primary mt-1">
                    {RESTAURANT_CONFIG.name}
                  </h2>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <span className="font-bold text-primary block">Address</span>
                      <p className="text-muted leading-relaxed font-medium">
                        {RESTAURANT_LOCATION.fullAddress}
                      </p>
                      <p className="text-[11px] text-muted-light mt-1">
                        <strong className="text-accent font-semibold">Landmark: </strong>
                        {RESTAURANT_LOCATION.landmark}
                      </p>
                    </div>
                  </div>

                  {/* Pickup Type */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                    </div>
                    <div>
                      <span className="font-bold text-primary block">Pickup Type</span>
                      <span className="text-muted">Self Pickup / Parcel Pickup Only</span>
                    </div>
                  </div>

                  {/* Operational Hours */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <span className="font-bold text-primary block">Opening Hours</span>
                      <p className="text-muted leading-relaxed">
                        {RESTAURANT_CONFIG.operatingHours.days}
                        <br />
                        {RESTAURANT_CONFIG.operatingHours.time}
                        <span className="text-[11px] block text-accent font-semibold mt-0.5">
                          Last Kitchen Order: {RESTAURANT_CONFIG.operatingHours.kitchenLastOrder}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Contact Phone */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <div>
                      <span className="font-bold text-primary block">Counter Assistance</span>
                      <span className="text-muted">
                        {settings?.phone && !settings.phone.includes('XXXXX')
                          ? settings.phone
                          : 'In-Store Pickup Counter'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pickup Information Card */}
              <div className="bg-primary rounded-3xl p-6 text-white border border-primary-light/60 shadow-md space-y-3">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-light text-accent text-[11px] font-bold">
                  <span>Self Pickup Notice</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Parcel Pickup Only
                </h3>
                <p className="text-xs text-muted-light leading-relaxed">
                  In-store Counter Collection is our exclusive service model. All dishes are freshly cooked upon order confirmation and packaged in sealed takeaway containers. Customers collect their orders directly at the restaurant counter.
                </p>
                <div className="pt-2 text-[11px] text-amber-300 font-medium">
                  &bull; Direct Counter Hand-off with your Order ID
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form & Google Maps Section (7 cols) */}
            <div className="lg:col-span-7 space-y-8">
              {/* Contact Form Card */}
              <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 shadow-xs">
                <div className="space-y-2 mb-6">
                  <span className="text-xs font-bold text-accent uppercase tracking-wider block">
                    Online Inquiries
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-primary">
                    Send Us a Message
                  </h2>
                  <p className="text-xs sm:text-sm text-muted">
                    Fill out the form below for inquiries regarding orders, timings, or parcel collection.
                  </p>
                </div>

                {formStatus && (
                  <div
                    className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3"
                    role="status"
                    aria-live="polite"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5 text-accent flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="leading-relaxed">
                      <strong className="font-semibold block">Notice:</strong>
                      {formStatus.message}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Name */}
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-bold text-primary uppercase tracking-wider mb-1.5"
                    >
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Your full name"
                      className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-accent ${
                        formErrors.name
                          ? 'border-red-400 bg-red-50/20'
                          : 'border-surface-border bg-white text-primary'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Mobile / Email */}
                  <div>
                    <label
                      htmlFor="contact-info"
                      className="block text-xs font-bold text-primary uppercase tracking-wider mb-1.5"
                    >
                      Mobile / Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-info"
                      type="text"
                      name="contactInfo"
                      value={formData.contactInfo}
                      onChange={handleInputChange}
                      placeholder="Your mobile number or email address"
                      className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-accent ${
                        formErrors.contactInfo
                          ? 'border-red-400 bg-red-50/20'
                          : 'border-surface-border bg-white text-primary'
                      }`}
                    />
                    {formErrors.contactInfo && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">
                        {formErrors.contactInfo}
                      </p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-xs font-bold text-primary uppercase tracking-wider mb-1.5"
                    >
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="How can we help you with your order or parcel collection?"
                      className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-accent ${
                        formErrors.message
                          ? 'border-red-400 bg-red-50/20'
                          : 'border-surface-border bg-white text-primary'
                      }`}
                    />
                    {formErrors.message && (
                      <p className="text-[11px] text-red-500 mt-1 font-medium">
                        {formErrors.message}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Send Message
                    </button>
                  </div>
                </form>
              </div>

              {/* Verified Google Maps Location Section */}
              <div
                className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 shadow-xs space-y-5"
                aria-labelledby="restaurant-location-heading"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-surface-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3
                        id="restaurant-location-heading"
                        className="text-base sm:text-lg font-bold text-primary"
                      >
                        Restaurant Location
                      </h3>
                      <p className="text-xs text-muted">
                        In-store parcel collection counter
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-secondary text-primary font-bold text-[11px] border border-surface-border">
                    Bilimora, Gujarat
                  </span>
                </div>

                {/* Map/Location Preview (Responsive iframe embed without API key) */}
                <div className="w-full aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden border border-surface-border bg-secondary relative shadow-inner">
                  <iframe
                    title="HAPPINESS RESTAURANT Location Map"
                    src={RESTAURANT_LOCATION.embedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>

                {/* Restaurant Location Details Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-secondary/60 border border-surface-border space-y-3">
                  <div>
                    <h4 className="font-extrabold text-base sm:text-lg text-primary">
                      {RESTAURANT_LOCATION.name}
                    </h4>
                    <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                      {RESTAURANT_LOCATION.addressLine1}
                      <br />
                      {RESTAURANT_LOCATION.addressLine2}
                    </p>
                    <p className="text-xs text-muted mt-2">
                      <strong className="text-accent font-semibold">
                        Known landmark / reference:
                      </strong>{' '}
                      {RESTAURANT_LOCATION.landmark}
                    </p>
                  </div>

                  {/* Pickup Note */}
                  <div className="pt-2 border-t border-surface-border flex items-center gap-2 text-[11px] text-muted">
                    <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    <span>
                      Parcel Pickup Only &bull; Collect your parcel at our restaurant counter
                    </span>
                  </div>
                </div>

                {/* Navigation Buttons: GET DIRECTIONS and Open in Google Maps */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <a
                    href={RESTAURANT_LOCATION.directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold tracking-wider uppercase transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-accent group"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-accent group-hover:translate-x-0.5 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                    <span>GET DIRECTIONS</span>
                  </a>

                  <a
                    href={RESTAURANT_LOCATION.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-secondary hover:bg-secondary-dark text-primary border border-surface-border text-xs sm:text-sm font-bold transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    <span>Open in Google Maps</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
