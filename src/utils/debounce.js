export function debounce(func, wait, immediate = false) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

export function throttle(func, limit) {
  let inThrottle;

  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Debounce with request cancellation
export class DebouncedRequest {
  constructor(func, delay = 150) {
    this.func = func;
    this.delay = delay;
    this.timeout = null;
  }

  execute(...args) {
    this.cancel();

    return new Promise((resolve, reject) => {
      this.timeout = setTimeout(async () => {
        try {
          const result = await this.func(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, this.delay);
    });
  }

  cancel() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
