import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { useAuthStore } from '../store/authStore';

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockCheckAuth = vi.fn();

describe('App - Auth Check on Mount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (useAuthStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        checkAuth: mockCheckAuth,
        logout: vi.fn(),
        login: vi.fn(),
      };
      return selector ? selector(state) : state;
    });
  });

  it('calls checkAuth on mount', async () => {
    mockCheckAuth.mockResolvedValue(undefined);
    
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalled();
    });
  });

  it('shows loading state during auth check', async () => {
    let resolveCheckAuth: () => void;
    mockCheckAuth.mockImplementation(() => new Promise((resolve) => {
      resolveCheckAuth = resolve;
    }));
    
    const { container } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Loading screen should be visible
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
    
    // Resolve the auth check
    resolveCheckAuth!();
    await waitFor(() => {
      expect(screen.queryByText('Yükleniyor...')).not.toBeInTheDocument();
    });
  });

  it('redirects to /login if not authenticated after auth check', async () => {
    mockCheckAuth.mockResolvedValue(undefined);
    
    const { container } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should show login page when not authenticated
      const loginInputs = container.querySelectorAll('input');
      expect(loginInputs.length).toBeGreaterThan(0);
    });
  });

  it('shows protected routes when authenticated', async () => {
    (useAuthStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = {
        user: { id: 1, email: 'test@example.com', name: 'Test User', role: 'admin' },
        isAuthenticated: true,
        isLoading: false,
        checkAuth: mockCheckAuth,
        logout: vi.fn(),
        login: vi.fn(),
      };
      return selector ? selector(state) : state;
    });
    
    const { container } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should show dashboard layout (has Sidebar with nav)
      const sidebar = container.querySelector('[class*="flex"][class*="min-h-screen"]');
      expect(sidebar).toBeInTheDocument();
    });
  });
});
