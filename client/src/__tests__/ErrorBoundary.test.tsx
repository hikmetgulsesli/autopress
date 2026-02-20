import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { notify } from '../utils/toast';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, reload: vi.fn(), href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error fallback when child throws', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Bir Şeyler Yanlış Gitti')).toBeInTheDocument();
    // Use a function matcher for text that spans multiple elements
    expect(screen.getByText(/Uygulamada beklenmeyen bir hata oluştu/)).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /yenile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ana sayfa/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('reloads page when refresh button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const refreshButton = screen.getByRole('button', { name: /yenile/i });
    fireEvent.click(refreshButton);

    expect(window.location.reload).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('navigates to home when home button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const homeButton = screen.getByRole('button', { name: /ana sayfa/i });
    fireEvent.click(homeButton);

    expect(window.location.href).toBe('/');

    consoleSpy.mockRestore();
  });

  it('logs error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });
});

describe('Toast notifications', () => {
  beforeEach(() => {
    // Clear all toasts before each test
    notify.dismiss('');
  });

  it('renders Toaster component', () => {
    const { container } = render(<Toaster position="top-right" />);
    // react-hot-toast renders a container div
    expect(container.firstChild).toBeTruthy();
  });
});
