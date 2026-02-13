console.log('LatchFit site loaded');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SUBMIT_INTERVAL_MS = 1200;

const trackFeedbackEvent = (eventName, details = {}) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, details);
  }
  if (typeof window.plausible === 'function') {
    window.plausible(eventName, { props: details });
  }
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: eventName, ...details });
  }
};

const extractServerMessage = (body) => {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (typeof body.message === 'string') return body.message;
  if (typeof body.error === 'string') return body.error;
  if (body.errors && Array.isArray(body.errors) && typeof body.errors[0] === 'string') {
    return body.errors[0];
  }
  return '';
};

const setStatus = (statusEl, message, tone = '') => {
  if (!statusEl) return;
  statusEl.className = 'form-status';
  if (tone) statusEl.classList.add(`is-${tone}`);
  statusEl.textContent = message;
};

const setupFeedbackForm = (form) => {
  let lastSubmitAt = 0;
  const statusEl = form.querySelector('[data-feedback-status]');
  const submitButton = form.querySelector('button[type="submit"]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const endpoint = form.dataset.feedbackEndpoint || form.getAttribute('action');
  const source = form.dataset.feedbackSource || window.location.pathname;

  if (!endpoint) {
    setStatus(statusEl, 'Feedback endpoint is not configured.', 'error');
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const now = Date.now();
    if (now - lastSubmitAt < MIN_SUBMIT_INTERVAL_MS) {
      setStatus(statusEl, 'Please wait a moment before sending again.', 'error');
      trackFeedbackEvent('feedback_submit_debounced', { source });
      return;
    }
    lastSubmitAt = now;

    const formData = new FormData(form);
    const email = (formData.get('email') || '').toString().trim();
    const message = (formData.get('message') || '').toString().trim();
    const category = (formData.get('category') || '').toString().trim();
    const ratingRaw = (formData.get('rating') || '').toString().trim();
    const rating = ratingRaw ? Number(ratingRaw) : null;

    if (!message) {
      setStatus(statusEl, 'Please enter a message.', 'error');
      const messageInput = form.querySelector('[name="message"]');
      if (messageInput) messageInput.focus();
      trackFeedbackEvent('feedback_validation_error', { source, reason: 'missing_message' });
      return;
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      setStatus(statusEl, 'Please enter a valid email address or leave it blank.', 'error');
      const emailInput = form.querySelector('[name="email"]');
      if (emailInput) emailInput.focus();
      trackFeedbackEvent('feedback_validation_error', { source, reason: 'invalid_email' });
      return;
    }

    const payload = {
      email: email || null,
      message,
      category: category || null,
      rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
      source,
      page: window.location.pathname,
      submittedAt: new Date().toISOString()
    };

    setStatus(statusEl, 'Sending feedback...', 'loading');
    if (submitButton) submitButton.disabled = true;
    if (submitLabel) submitLabel.textContent = 'Sending...';
    trackFeedbackEvent('feedback_submit_started', { source, hasEmail: Boolean(email), hasRating: Boolean(payload.rating) });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let responseBody = null;
      try {
        responseBody = await response.json();
      } catch (_) {
        responseBody = null;
      }

      if (!response.ok) {
        const serverMessage = extractServerMessage(responseBody);
        if (response.status === 429) {
          setStatus(statusEl, serverMessage || 'You are sending too quickly. Please wait and try again.', 'error');
          trackFeedbackEvent('feedback_rate_limited', { source });
          return;
        }
        setStatus(statusEl, serverMessage || 'Could not send feedback. Please try again.', 'error');
        trackFeedbackEvent('feedback_submit_failed', { source, status: response.status });
        return;
      }

      form.reset();
      setStatus(statusEl, 'Thanks for your feedback. We received it successfully.', 'success');
      trackFeedbackEvent('feedback_submit_success', { source });
    } catch (_) {
      setStatus(statusEl, 'Network error while sending feedback. Please try again.', 'error');
      trackFeedbackEvent('feedback_submit_failed', { source, reason: 'network_error' });
    } finally {
      if (submitButton) submitButton.disabled = false;
      if (submitLabel) submitLabel.textContent = 'Send Feedback';
    }
  });
};

document.querySelectorAll('.js-feedback-form').forEach(setupFeedbackForm);
