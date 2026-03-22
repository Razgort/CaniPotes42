import { render, screen } from '@testing-library/react';
import { MemberCard } from './MemberCard';

describe('MemberCard', () => {
  it('renders name and role badge', () => {
    render(
      <MemberCard
        firstName="Jean"
        lastName="Dupont"
        avatarUrl={null}
        role="MEMBER"
      />,
    );

    expect(screen.getByText('Jean Dupont')).toBeTruthy();
    expect(screen.getByText('Membre')).toBeTruthy();
  });

  it('shows initials when no avatar URL', () => {
    render(
      <MemberCard
        firstName="Jean"
        lastName="Dupont"
        avatarUrl={null}
        role="ADMIN"
      />,
    );

    expect(screen.getByText('JD')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
  });

  it('shows owner badge', () => {
    render(
      <MemberCard
        firstName="Marie"
        lastName="Martin"
        avatarUrl={null}
        role="OWNER"
      />,
    );

    expect(screen.getByText('Propriétaire')).toBeTruthy();
  });
});
