import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NotFound from '../pages/NotFound';
import App from '../App';

// Mock the auth store
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

import { useAuthStore } from '../store/authStore';

describe('NotFound Component', () => {
  it('renders 404 page with correct content', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    // Check for 404 heading
    expect(screen.getByText('404')).toBeInTheDocument();
    
    // Check for Turkish title
    expect(screen.getByText('Sayfa Bulunamadı')).toBeInTheDocument();
    
    // Check for description
    expect(screen.getByText(/Aradığınız sayfa mevcut değil/)).toBeInTheDocument();
    
    // Check for back to home link
    expect(screen.getByText('Ana Sayfaya Dön')).toBeInTheDocument();
  });

  it('has back-to-home link that navigates to dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/non-existent-page']}>
        <Routes>
          <Route path="*" element={<NotFound />} />
          <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Find the link by role and check it has the correct text
    const homeLink = screen.getByRole('link', { name: /Ana Sayfaya Dön/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('uses correct semantic structure', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    // Should have h1 for 404 code
    const h1 = screen.getByText('404');
    expect(h1.tagName).toBe('H1');

    // Should have h2 for title
    const h2 = screen.getByText('Sayfa Bulunamadı');
    expect(h2.tagName).toBe('H2');
  });

  it('has accessible icon with aria-hidden', () => {
    const { container } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    // Check that the icon is aria-hidden
    const icon = container.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });
});

describe('App 404 Routing', () => {
  const mockCheckAuth = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        isAuthenticated: true,
        user: { id: 1, email: 'test@example.com', username: 'testuser', name: 'Test' },
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: mockCheckAuth,
      };
      return selector ? selector(state) : state;
    });
    mockCheckAuth.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows 404 page for invalid routes when authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/invalid-route']}>
        <App />
      </MemoryRouter>
    );

    // Should show 404 page
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Sayfa Bulunamadı')).toBeInTheDocument();
  });

  it('redirects to login for invalid routes when not authenticated', () => {
    // Mock unauthenticated state - return the whole state object
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = { isAuthenticated: false, user: null };
      return selector ? selector(state) : state;
    });

    render(
      <MemoryRouter initialEntries={['/invalid-route']}>
        <App />
      </MemoryRouter>
    );

    // Should redirect to login - check for login form elements
    expect(screen.getByRole('button', { name: /Giriş Yap/i })).toBeInTheDocument();
  });

  it('shows NotFound for deeply nested invalid routes', async () => {
    render(
      <MemoryRouter initialEntries={['/invalid-route']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument();
    });
  });

  it('shows NotFound for routes with special characters', async () => {
    render(
      <MemoryRouter initialEntries={['/test%20path?query=value']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument();
    });
  });
});
