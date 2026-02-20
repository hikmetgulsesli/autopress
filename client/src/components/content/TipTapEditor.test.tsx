import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TipTapEditor from './TipTapEditor';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bold: () => <span data-testid="icon-bold" />,
  Italic: () => <span data-testid="icon-italic" />,
  List: () => <span data-testid="icon-list" />,
  ListOrdered: () => <span data-testid="icon-list-ordered" />,
  Heading1: () => <span data-testid="icon-h1" />,
  Heading2: () => <span data-testid="icon-h2" />,
  Link: () => <span data-testid="icon-link" />,
  Quote: () => <span data-testid="icon-quote" />,
  Undo: () => <span data-testid="icon-undo" />,
  Redo: () => <span data-testid="icon-redo" />,
}));

describe('TipTapEditor', () => {
  it('should render editor component', () => {
    render(<TipTapEditor />);
    
    const editor = document.querySelector('.ProseMirror');
    expect(editor).toBeInTheDocument();
  });

  it('should render with initial content', () => {
    const initialContent = '<p>Test content</p>';
    render(<TipTapEditor content={initialContent} />);
    
    const editor = document.querySelector('.ProseMirror');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveTextContent('Test content');
  });

  it('should render toolbar buttons', () => {
    render(<TipTapEditor />);
    
    // Check that toolbar buttons are rendered
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
    expect(screen.getByTitle('Ordered List')).toBeInTheDocument();
    expect(screen.getByTitle('Add Link')).toBeInTheDocument();
    expect(screen.getByTitle('Quote')).toBeInTheDocument();
    expect(screen.getByTitle('Undo')).toBeInTheDocument();
    expect(screen.getByTitle('Redo')).toBeInTheDocument();
  });

  it('should be editable by default', () => {
    render(<TipTapEditor />);
    
    const editor = document.querySelector('.ProseMirror');
    expect(editor).toHaveAttribute('contenteditable', 'true');
  });

  it('should not be editable when editable prop is false', () => {
    render(<TipTapEditor editable={false} />);
    
    const editor = document.querySelector('.ProseMirror');
    expect(editor).toHaveAttribute('contenteditable', 'false');
  });
});
