/**
 * Security Headers Middleware
 *
 * Implements Helmet-equivalent HTTP response headers natively.
 * Protects against MIME-sniffing, clickjacking, XSS, and unauthorized cross-origin embedding.
 */
export function securityHeaders(req, res, next) {
  // Prevent browsers from MIME-sniffing a response away from declared content-type
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Protect against clickjacking by disallowing framing from untrusted origins
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Disable browser legacy XSS filter to prevent side-channel exploits
  res.setHeader('X-XSS-Protection', '0');

  // Enforce HTTPS transmission with 1-year duration and subdomains
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Control referrer information leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy for secure resource loading
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' http://localhost:* http://127.0.0.1:* https:; frame-ancestors 'self'"
  );

  // Cross-Origin Isolation & Resource Sharing policies
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  next();
}

export default securityHeaders;
