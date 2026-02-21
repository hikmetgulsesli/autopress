import '@testing-library/jest-dom';

// Mock ResizeObserver for recharts
declare global {
  interface Window {
    ResizeObserver: any;
  }
}
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
