/**
 * Wraps an async Express route handler to catch rejected promises
 * and forward them to Express error handling. Prevents unhandled
 * promise rejections from crashing the server process.
 *
 * Also prevents double-response crashes if the handler throws
 * after headers have already been sent.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    const result = fn(req, res, next);
    if (result && typeof result.catch === 'function') {
      result.catch(next);
    }
  };
}
