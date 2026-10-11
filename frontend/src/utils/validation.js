// Client-side checks give instant feedback; the APIs validate again (never trust the client).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address';
  return '';
}

export function validateRecord(values) {
  const errors = {};
  if (values.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  const age = Number(values.age);
  if (values.age === '' || !Number.isInteger(age) || age < 18 || age > 100) {
    errors.age = 'Age must be a whole number between 18 and 100';
  }
  if (values.department.trim().length < 2) errors.department = 'Department is required';
  if (values.description.length > 1000) errors.description = 'Description must be 1000 characters or less';
  return errors;
}

// Same rules as node-service authService.register; keep both in sync.
export function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  if (!/[^A-Za-z0-9\s]/.test(password)) return 'Password must contain a special character (e.g. @ # $ !)';
  return '';
}
