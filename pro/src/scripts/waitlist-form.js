// Waitlist form behavior: post to /api/waitlist, report the outcome inline.
//
// The form has no action attribute and the page is static, so a submit with JS
// broken does nothing rather than navigating somewhere wrong. Everything below
// is enhancement on top of a field and a button.

const MESSAGES = {
  'invalid-email': 'That address does not look right. Check it and try again.',
  'rate-limited': 'That is a lot of signups from one place. Try again in an hour.',
  unavailable: 'The list is briefly unreachable. Try again in a minute.',
  'server-error': 'Something broke on our end. Try again in a minute.',
  offline: 'No connection. Your address was not sent.',
};

const SUCCESS = 'You are on the list. Watch for one mail, no sooner than it is real.';

function setState(root, status, state, message) {
  root.dataset.state = state;
  status.textContent = message;
  status.dataset.state = state;
}

export function initWaitlistForm() {
  const form = document.querySelector('[data-waitlist-form]');
  if (!form) return;

  const input = form.querySelector('input[name="email"]');
  const button = form.querySelector('[data-waitlist-submit]');
  const label = form.querySelector('[data-waitlist-submit-label]');
  const status = form.querySelector('[data-waitlist-status]');
  if (!input || !button || !label || !status) return;

  const idleLabel = label.textContent;

  // A fresh keystroke after a rejection clears the error, so the message never
  // contradicts what is currently in the field.
  input.addEventListener('input', () => {
    if (form.dataset.state === 'error') {
      setState(form, status, 'idle', '');
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.dataset.state === 'loading' || form.dataset.state === 'done') return;

    const email = input.value.trim();
    if (!email) {
      setState(form, status, 'error', 'Enter an email address first.');
      input.focus();
      return;
    }

    setState(form, status, 'loading', 'Adding you.');
    button.disabled = true;
    label.textContent = 'Adding you';

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'pro-page' }),
      });
      const payload = await res.json().catch(() => ({}));

      if (res.ok && payload.ok) {
        setState(form, status, 'done', SUCCESS);
        label.textContent = 'You are on the list';
        input.disabled = true;
        return;
      }

      setState(form, status, 'error', MESSAGES[payload.error] || MESSAGES['server-error']);
      button.disabled = false;
      label.textContent = idleLabel;
      input.focus();
    } catch {
      setState(form, status, 'error', MESSAGES.offline);
      button.disabled = false;
      label.textContent = idleLabel;
    }
  });
}
