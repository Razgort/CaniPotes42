import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUseAuth = jest.fn();
const mockUseMemberDetail = jest.fn();

jest.mock('@org/data-access', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('./hooks/useMembers', () => ({
  useMemberDetail: (...args: unknown[]) => mockUseMemberDetail(...args),
  useUpdateProfile: () => ({ mutateAsync: jest.fn() }),
  useUploadAvatar: () => ({ mutateAsync: jest.fn() }),
}));

import { MemberProfile } from './MemberProfile';

function renderWithRoute(memberId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/members/${memberId}`]}>
        <Routes>
          <Route path="/members/:memberId" element={<MemberProfile />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MemberProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const member = {
    id: 'm1',
    userId: 'u1',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean@test.com',
    avatarUrl: null,
    role: 'MEMBER' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('renders profile and shows edit for own profile', () => {
    mockUseAuth.mockReturnValue({
      activeClub: { id: 'club-1', name: 'Test Club' },
      role: 'MEMBER',
      user: { id: 'u1', email: 'jean@test.com', firstName: 'Jean', lastName: 'Dupont' },
    });
    mockUseMemberDetail.mockReturnValue({
      data: { data: member },
      isLoading: false,
    });

    renderWithRoute('m1');

    expect(screen.getByText('Jean Dupont')).toBeTruthy();
    expect(screen.getByText('jean@test.com')).toBeTruthy();
    expect(screen.getByText('Modifier')).toBeTruthy();
  });

  it('hides edit button for other member profile', () => {
    mockUseAuth.mockReturnValue({
      activeClub: { id: 'club-1', name: 'Test Club' },
      role: 'MEMBER',
      user: { id: 'u2', email: 'other@test.com', firstName: 'Other', lastName: 'User' },
    });
    mockUseMemberDetail.mockReturnValue({
      data: { data: member },
      isLoading: false,
    });

    renderWithRoute('m1');

    expect(screen.getByText('Jean Dupont')).toBeTruthy();
    expect(screen.queryByText('Modifier')).toBeNull();
  });
});
