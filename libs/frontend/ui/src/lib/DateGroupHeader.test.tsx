import { render, screen } from '@testing-library/react';
import { DateGroupHeader } from './DateGroupHeader';

describe('DateGroupHeader', () => {
  it('renders the label text', () => {
    render(<DateGroupHeader label="Aujourd'hui" />);
    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
  });

  it('has role="heading" with aria-level 3', () => {
    render(<DateGroupHeader label="Demain" />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Demain');
  });

  it('renders absolute date labels', () => {
    render(<DateGroupHeader label="Dimanche 23 mars" />);
    expect(screen.getByText('Dimanche 23 mars')).toBeInTheDocument();
  });
});
