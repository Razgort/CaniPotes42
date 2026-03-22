import { render, screen } from '@testing-library/react';
import { QueryProvider, queryClient } from './QueryProvider';

describe('QueryProvider', () => {
  it('renders children', () => {
    render(
      <QueryProvider>
        <span>query child</span>
      </QueryProvider>
    );
    expect(screen.getByText('query child')).toBeInTheDocument();
  });

  it('configures staleTime to 5 minutes', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(5 * 60 * 1000);
  });

  it('configures retry to 1', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(1);
  });

  it('disables refetchOnWindowFocus', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });
});
