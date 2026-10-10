// Turns an Axios error into a message a user can act on.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.response) {
    return error?.code === 'ECONNABORTED'
      ? 'The server took too long to respond.'
      : 'Cannot reach the server. Is the service running?';
  }

  const { status, data } = error.response;
  if (status === 429) {
    return data?.message || 'Too many attempts. Please wait a minute and try again.';
  }
  return data?.message || fallback;
}
