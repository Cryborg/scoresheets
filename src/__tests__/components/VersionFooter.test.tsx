import { render, screen } from '@testing-library/react';

// Mock the version module before importing the component
jest.mock('@/lib/version', () => ({
  APP_VERSION: '1.2.3',
  APP_NAME: 'test-app'
}));

import VersionFooter from '@/components/VersionFooter';

describe('VersionFooter', () => {
  it('should display app name and version', () => {
    render(<VersionFooter />);
    
    expect(screen.getByText('test-app v1.2.3')).toBeInTheDocument();
  });

  it('should have correct CSS classes for positioning', () => {
    render(<VersionFooter />);
    
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('fixed', 'bottom-2', 'left-2', 'text-xs', 'text-gray-400', 'dark:text-gray-600', 'z-10');
  });
});