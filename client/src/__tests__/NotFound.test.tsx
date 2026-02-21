import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NotFound from '../pages/NotFound';
import App from '../App';
import { useAuthStore } from '../store/authStore';

// Mock the auth store
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('NotFound Component', () => {
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders 404 page with correct content', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Sayfa Bulunamadi')).toBeInTheDocument();
    expect(screen.getByText(/Aradiginiz sayfa mevcut degil/)).toBeInTheDocument();
  });

  it('has back to home button', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    const homeButton = screen.getByRole('button', { name: /ana sayfaya don/i });
    expect(homeButton).toBeInTheDocument();
  });

  it('navigates to home when button is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/nonexistent']}>
        <Routes>
          <Route path="/nonexistent" element={<NotFound />} />
          <Route path="/" element={<div data-testid="home">Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const homeButton = screen.getByRole('button', { name: /ana sayfaya don/i });
    fireEvent.click(homeButton);

    await waitFor(() => {
      expect(screen.getByTestId('home')).toBeInTheDocument();
    });
  });

  it('has correct accessibility attributes', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    // Check heading hierarchy
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('404');
    
    // Check button is accessible
    const button = screen.getByRole('button', { name: /ana sayfaya don/i });
    expect(button).toBeVisible();
  });
});

describe('App 404 Routing', () => {
  const mockCheckAuth = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockImplementation((selector) => {
      const state = {
        isAuthenticated: true,
        user: { id: 1, email: 'test@example.com', username: 'testuser' },
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

  it('shows NotFound for invalid routes when authenticated', async () => {
    render(
      <MemoryRouter initialEntries={['/invalid-route']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Sayfa Bulunamadi')).toBeInTheDocument();
    });
  });

  it('shows NotFound for deeply nested invalid routes', async () => {
    render(
      <MemoryRouter initialEntries={['/sites/invalid/path']}>
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
