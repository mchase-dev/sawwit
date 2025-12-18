// Mock DOMPurify for testing
// DOMPurify is a factory function that takes a window object
const DOMPurify = (window: any) => {
  return {
    sanitize: (dirty: string, config?: any) => {
      // Simple mock that just returns the input
      // In real tests, we can verify this was called correctly
      return dirty;
    },
  };
};

export default DOMPurify;
