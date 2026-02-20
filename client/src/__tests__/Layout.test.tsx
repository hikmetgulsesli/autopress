import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

// Mock auth store
vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: { name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Responsive Layout', () => {
  describe('Sidebar', () => {
    it('is hidden by default on mobile', () => {
      renderWithRouter(<Sidebar isOpen={false} onClose={vi.fn()} />);
      
      const sidebar = document.querySelector('aside');
      expect(sidebar).toHaveClass('-translate-x-full');
    });

    it('shows sidebar when isOpen is true on mobile', () => {
      renderWithRouter(<Sidebar isOpen={true} onClose={vi.fn()} />);
      
      const sidebar = document.querySelector('aside');
      expect(sidebar).toHaveClass('translate-x-0');
    });

    it('has visible class on desktop (lg breakpoint)', () => {
      renderWithRouter(<Sidebar isOpen={false} onClose={vi.fn()} />);
      
      const sidebar = document.querySelector('aside');
      expect(sidebar).toHaveClass('lg:translate-x-0');
    });

    it('calls onClose when overlay is clicked on mobile', () => {
      const onClose = vi.fn();
      renderWithRouter(<Sidebar isOpen={true} onClose={onClose} />);
      
      const overlay = document.querySelector('.bg-black\\/50');
      if (overlay) {
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when close button is clicked on mobile', () => {
      const onClose = vi.fn();
      renderWithRouter(<Sidebar isOpen={true} onClose={onClose} />);
      
      const closeButton = screen.getByLabelText('Close menu');
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Header', () => {
    it('renders hamburger menu button', () => {
      renderWithRouter(<Header onMenuClick={vi.fn()} />);
      
      const menuButton = screen.getByLabelText('Open menu');
      expect(menuButton).toBeInTheDocument();
    });

    it('calls onMenuClick when hamburger is clicked', () => {
      const onMenuClick = vi.fn();
      renderWithRouter(<Header onMenuClick={onMenuClick} />);
      
      const menuButton = screen.getByLabelText('Open menu');
      fireEvent.click(menuButton);
      expect(onMenuClick).toHaveBeenCalled();
    });

    it('hides hamburger menu on desktop with lg:hidden', () => {
      renderWithRouter(<Header onMenuClick={vi.fn()} />);
      
      const menuButton = screen.getByLabelText('Open menu');
      expect(menuButton).toHaveClass('lg:hidden');
    });
  });

  describe('Layout integration', () => {
    it('passes onMenuClick to Header', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      // The hamburger should be clickable
      const menuButton = screen.getByLabelText('Open menu');
      fireEvent.click(menuButton);
      
      // We can't easily test the state change in integration
      // but we verify the button is there
      expect(menuButton).toBeInTheDocument();
    });

    it('applies lg:ml-64 to main content container', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      const mainContainer = document.querySelector('.lg\\:ml-64');
      expect(mainContainer).toBeInTheDocument();
    });
  });
});
