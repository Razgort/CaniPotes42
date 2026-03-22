import { render } from '@testing-library/react';
import { Toaster, toast } from './Toast';

describe('Toast', () => {
  it('renders Toaster without crashing', () => {
    const { container } = render(<Toaster />);
    expect(container).toBeInTheDocument();
  });

  it('toast.success can be called without error', () => {
    render(<Toaster />);
    expect(() => toast.success('Test success')).not.toThrow();
  });

  it('toast.error can be called without error', () => {
    render(<Toaster />);
    expect(() => toast.error('Test error')).not.toThrow();
  });
});
