import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks
const mockUseAuth = jest.fn();
const mockUseMembers = jest.fn();

jest.mock('@org/data-access', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('./hooks/useMembers', () => ({
  useMembers: (...args: unknown[]) => mockUseMembers(...args),
}));

// Must import after mocks
import { MemberDirectory } from './MemberDirectory';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MemberDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders member list', () => {
    mockUseAuth.mockReturnValue({
      activeClub: { id: 'club-1', name: 'Test Club' },
      role: 'MEMBER',
    });
    mockUseMembers.mockReturnValue({
      data: {
        data: [
          {
            id: 'm1',
            userId: 'u1',
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean@test.com',
            avatarUrl: null,
            role: 'MEMBER',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        meta: { total: 1, page: 1, pageSize: 20 },
      },
      isLoading: false,
    });

    renderWithProviders(<MemberDirectory />);

    expect(screen.getByText('Jean Dupont')).toBeTruthy();
  });

  it('shows search and filters for admin', () => {
    mockUseAuth.mockReturnValue({
      activeClub: { id: 'club-1', name: 'Test Club' },
      role: 'ADMIN',
    });
    mockUseMembers.mockReturnValue({
      data: {
        data: [
          {
            id: 'm1',
            userId: 'u1',
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean@test.com',
            avatarUrl: null,
            role: 'MEMBER',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        meta: { total: 1, page: 1, pageSize: 20 },
      },
      isLoading: false,
    });

    renderWithProviders(<MemberDirectory />);

    expect(
      screen.getByPlaceholderText('Rechercher par nom ou email...'),
    ).toBeTruthy();
    expect(screen.getByText('Tous')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
  });

  it('hides search and filters for regular member', () => {
    mockUseAuth.mockReturnValue({
      activeClub: { id: 'club-1', name: 'Test Club' },
      role: 'MEMBER',
    });
    mockUseMembers.mockReturnValue({
      data: {
        data: [
          {
            id: 'm1',
            userId: 'u1',
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean@test.com',
            avatarUrl: null,
            role: 'MEMBER',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        meta: { total: 1, page: 1, pageSize: 20 },
      },
      isLoading: false,
    });

    renderWithProviders(<MemberDirectory />);

    expect(
      screen.queryByPlaceholderText('Rechercher par nom ou email...'),
    ).toBeNull();
  });

  it('shows empty state with invite CTA for admin', () => {
    mockUseAuth.mockReturnValue({
      activeClub: { id: 'club-1', name: 'Test Club' },
      role: 'OWNER',
    });
    mockUseMembers.mockReturnValue({
      data: {
        data: [],
        meta: { total: 0, page: 1, pageSize: 20 },
      },
      isLoading: false,
    });

    renderWithProviders(<MemberDirectory />);

    expect(
      screen.getByText('Invitez votre equipe pour commencer'),
    ).toBeTruthy();
    expect(screen.getByText('Inviter')).toBeTruthy();
  });
});
