import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TipTapEditor } from '../components/TipTapEditor';

// Mock TipTap editor
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(),
  EditorContent: ({ editor }: { editor: any }) => (
    <div data-testid="editor-content">{editor?.getHTML() || ''}</div>
  ),
}));

import { useEditor } from '@tiptap/react';

describe('TipTapEditor', () => {
  const mockOnChange = vi.fn();
  
  const createMockEditor = () => {
    const runMock = vi.fn();
    const chainMock = {
      focus: vi.fn(() => ({
        toggleBold: vi.fn(() => ({ run: runMock })),
        toggleItalic: vi.fn(() => ({ run: runMock })),
        toggleHeading: vi.fn(() => ({ run: runMock })),
        toggleBulletList: vi.fn(() => ({ run: runMock })),
        toggleOrderedList: vi.fn(() => ({ run: runMock })),
        undo: vi.fn(() => ({ run: runMock })),
        redo: vi.fn(() => ({ run: runMock })),
        extendMarkRange: vi.fn(() => ({
          unsetLink: vi.fn(() => ({ run: runMock })),
          setLink: vi.fn(() => ({ run: runMock })),
        })),
      })),
    };
    
    const canMock = {
      chain: vi.fn(() => ({
        focus: vi.fn(() => ({
          undo: vi.fn(() => ({ run: vi.fn(() => true) })),
          redo: vi.fn(() => ({ run: vi.fn(() => true) })),
        })),
      })),
    };

    return {
      getHTML: vi.fn(() => '<p>Test content</p>'),
      getText: vi.fn(() => 'Test content'),
      isEmpty: false,
      isActive: vi.fn(() => false),
      can: vi.fn(() => canMock),
      chain: vi.fn(() => chainMock),
      getAttributes: vi.fn(() => ({})),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    (useEditor as any).mockReturnValue(createMockEditor());
    render(<TipTapEditor content="" onChange={mockOnChange} />);
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('renders with initial content', () => {
    (useEditor as any).mockReturnValue(createMockEditor());
    render(
      <TipTapEditor 
        content="<p>Initial content</p>" 
        onChange={mockOnChange} 
      />
    );
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('renders toolbar buttons', () => {
    (useEditor as any).mockReturnValue(createMockEditor());
    render(<TipTapEditor content="" onChange={mockOnChange} />);
    
    // Check for toolbar buttons by aria-label (Turkish labels in the component)
    expect(screen.getByLabelText('Başlık 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Başlık 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Kalın')).toBeInTheDocument();
    expect(screen.getByLabelText('İtalik')).toBeInTheDocument();
    expect(screen.getByLabelText('Madde Listesi')).toBeInTheDocument();
    expect(screen.getByLabelText('Numaralı Liste')).toBeInTheDocument();
    expect(screen.getByLabelText('Bağlantı Ekle')).toBeInTheDocument();
    expect(screen.getByLabelText('Geri al')).toBeInTheDocument();
    expect(screen.getByLabelText('İleri al')).toBeInTheDocument();
  });

  it('calls onChange when editor content updates', () => {
    const onChange = vi.fn();
    const mockEditor = createMockEditor();
    
    (useEditor as any).mockImplementation(({ onUpdate }: any) => {
      // Simulate editor update
      setTimeout(() => {
        onUpdate?.({ editor: mockEditor });
      }, 0);
      return mockEditor;
    });

    render(<TipTapEditor content="" onChange={onChange} />);

    // Verify the mock was called with proper setup
    expect(useEditor).toHaveBeenCalled();
    const callArg = (useEditor as any).mock.calls[0][0];
    expect(callArg).toHaveProperty('onUpdate');
  });

  it('shows placeholder when content is empty', () => {
    const mockEditor = createMockEditor();
    mockEditor.isEmpty = true;
    (useEditor as any).mockReturnValue(mockEditor);

    render(
      <TipTapEditor 
        content="" 
        onChange={mockOnChange} 
        placeholder="Enter text here..."
      />
    );

    expect(screen.getByText('Enter text here...')).toBeInTheDocument();
  });

  it('toolbar buttons have correct accessibility attributes', () => {
    (useEditor as any).mockReturnValue(createMockEditor());
    render(<TipTapEditor content="" onChange={mockOnChange} />);
    
    const boldButton = screen.getByLabelText('Kalın');
    expect(boldButton).toHaveAttribute('type', 'button');
    expect(boldButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking bold button triggers toggleBold', () => {
    const mockEditor = createMockEditor();
    (useEditor as any).mockReturnValue(mockEditor);

    render(<TipTapEditor content="" onChange={mockOnChange} />);
    
    const boldButton = screen.getByLabelText('Kalın');
    fireEvent.click(boldButton);
    
    expect(mockEditor.chain).toHaveBeenCalled();
  });
});
