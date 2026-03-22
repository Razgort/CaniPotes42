import { render } from '@testing-library/react';
import { SkeletonCard, SkeletonList } from './Skeleton';

describe('SkeletonCard', () => {
  it('renders with default height', () => {
    const { container } = render(<SkeletonCard />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.height).toBe('120px');
  });

  it('renders with custom height', () => {
    const { container } = render(<SkeletonCard height={200} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.height).toBe('200px');
  });

  it('is hidden from screen readers', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SkeletonList', () => {
  it('renders default 3 items', () => {
    const { container } = render(<SkeletonList />);
    const items = container.querySelectorAll('[aria-hidden] > div');
    expect(items).toHaveLength(3);
  });

  it('renders custom count', () => {
    const { container } = render(<SkeletonList count={5} />);
    const items = container.querySelectorAll('[aria-hidden] > div');
    expect(items).toHaveLength(5);
  });
});
