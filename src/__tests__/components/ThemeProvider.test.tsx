import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';

// Test component to use the theme context
function TestComponent() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <button onClick={toggleTheme} data-testid="toggle">Toggle</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.getItem = jest.fn().mockReturnValue(null); // Force no saved theme
    jest.clearAllMocks();
  });

  it('should render children with default light theme before mounting', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Test Content</div>
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should initialize with light theme by default', async () => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false, // Light theme preference
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });
  });

  it('should initialize with dark theme from system preference', async () => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: true, // Dark theme preference
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });
  });

  it('should load saved theme from localStorage', async () => {
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });
  });

  it('should toggle theme correctly', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Wait for initial mount
    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });

    // Toggle theme
    act(() => {
      screen.getByTestId('toggle').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });

    // Toggle back
    act(() => {
      screen.getByTestId('toggle').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });
  });

  it('should save theme to localStorage when changed', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Wait for initial mount
    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });

    // Toggle theme
    act(() => {
      screen.getByTestId('toggle').click();
    });

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });
  });

  it('should throw error when useTheme is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    console.error = originalError;
  });
});