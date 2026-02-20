import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ContentStudio from '../pages/ContentStudio';

// Mock useSearchParams to return a topic
const mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

describe('ContentStudio - Topic Pre-fill', () => {
  beforeEach(() => {
    mockSearchParams.delete('topic');
    vi.clearAllMocks();
  });

  it('renders ContentStudio page', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    expect(screen.getByText('İçerik Stüdyosu')).toBeInTheDocument();
    expect(screen.getByText('AI ile SEO uyumlu içerik üretin')).toBeInTheDocument();
  });

  it('pre-fills topic from URL query parameter', () => {
    mockSearchParams.set('topic', 'Yapay Zeka');
    
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    const topicInput = screen.getByDisplayValue('Yapay Zeka') as HTMLInputElement;
    expect(topicInput.value).toBe('Yapay Zeka');
  });

  it('shows "From Trend" badge when topic is from URL', () => {
    mockSearchParams.set('topic', 'Climate Change');
    
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    expect(screen.getByText('From Trend')).toBeInTheDocument();
  });

  it('does not show "From Trend" badge when no topic in URL', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    expect(screen.queryByText('From Trend')).not.toBeInTheDocument();
  });

  it('has empty topic field when no URL parameter', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    const topicInput = document.getElementById('topic') as HTMLInputElement;
    expect(topicInput.value).toBe('');
  });

  it('renders all content type options', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    expect(screen.getByText('Blog Post')).toBeInTheDocument();
    expect(screen.getByText('Listicle')).toBeInTheDocument();
    expect(screen.getByText('How-To Guide')).toBeInTheDocument();
    expect(screen.getByText('FAQ')).toBeInTheDocument();
  });

  it('renders language options', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    const languageSelect = screen.getByLabelText('Language') as HTMLSelectElement;
    expect(languageSelect).toBeInTheDocument();
    
    // Check that English is the default
    expect(languageSelect.value).toBe('EN');
  });

  it('renders tone options', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    const toneSelect = screen.getByLabelText('Tone') as HTMLSelectElement;
    expect(toneSelect).toBeInTheDocument();
    
    // Check that Professional is the default
    expect(toneSelect.value).toBe('professional');
  });

  it('renders word count slider with default value', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    expect(screen.getByText('Word Count:')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
  });

  it('has disabled submit button when topic is empty', () => {
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    const submitButton = screen.getByText('Generate with AI').closest('button');
    expect(submitButton).toBeDisabled();
  });

  it('has enabled submit button when topic is filled', () => {
    mockSearchParams.set('topic', 'Test Topic');
    
    render(
      <BrowserRouter>
        <ContentStudio />
      </BrowserRouter>
    );

    const submitButton = screen.getByText('Generate with AI').closest('button');
    expect(submitButton).not.toBeDisabled();
  });
});
