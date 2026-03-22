import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EventAdminActions } from './EventAdminActions';

vi.mock('@org/data-access', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useEventMutations', () => ({
  useUpdateEventStatus: vi.fn(),
  useDeleteEvent: vi.fn(),
}));

const { useAuth } = await import('@org/data-access');
const { useUpdateEventStatus, useDeleteEvent } = await import('../hooks/useEventMutations');

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseUpdateEventStatus = useUpdateEventStatus as ReturnType<typeof vi.fn>;
const mockUseDeleteEvent = useDeleteEvent as ReturnType<typeof vi.fn>;

const statusMutate = vi.fn();
const deleteMutate = vi.fn();

function renderActions(props: { eventId?: string; status?: string } = {}) {
  return render(
    <MemoryRouter>
      <EventAdminActions eventId={props.eventId ?? 'event-1'} status={props.status ?? 'DRAFT'} />
    </MemoryRouter>,
  );
}

describe('EventAdminActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdateEventStatus.mockReturnValue({ mutate: statusMutate, isPending: false });
    mockUseDeleteEvent.mockReturnValue({ mutate: deleteMutate, isPending: false });
  });

  describe('role gating', () => {
    it('renders nothing for MEMBER role', () => {
      mockUseAuth.mockReturnValue({ role: 'MEMBER' });
      const { container } = renderActions();
      expect(container.firstChild).toBeNull();
    });

    it('renders actions for ADMIN role', () => {
      mockUseAuth.mockReturnValue({ role: 'ADMIN' });
      renderActions({ status: 'DRAFT' });
      expect(screen.getByText('Publier')).toBeTruthy();
    });

    it('renders actions for OWNER role', () => {
      mockUseAuth.mockReturnValue({ role: 'OWNER' });
      renderActions({ status: 'DRAFT' });
      expect(screen.getByText('Publier')).toBeTruthy();
    });
  });

  describe('DRAFT event', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ role: 'ADMIN' });
    });

    it('shows "Publier" button for DRAFT status', () => {
      renderActions({ status: 'DRAFT' });
      expect(screen.getByText('Publier')).toBeTruthy();
      expect(screen.queryByText('Dépublier')).toBeNull();
    });

    it('calls updateStatus with PUBLISHED when Publier is clicked', () => {
      renderActions({ status: 'DRAFT' });
      fireEvent.click(screen.getByText('Publier'));
      expect(statusMutate).toHaveBeenCalledWith('PUBLISHED');
    });
  });

  describe('PUBLISHED event', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ role: 'ADMIN' });
    });

    it('shows "Dépublier" button for PUBLISHED status', () => {
      renderActions({ status: 'PUBLISHED' });
      expect(screen.getByText('Dépublier')).toBeTruthy();
      expect(screen.queryByText('Publier')).toBeNull();
    });

    it('calls updateStatus with DRAFT when Dépublier is clicked', () => {
      renderActions({ status: 'PUBLISHED' });
      fireEvent.click(screen.getByText('Dépublier'));
      expect(statusMutate).toHaveBeenCalledWith('DRAFT');
    });
  });

  describe('edit navigation', () => {
    it('renders Modifier button', () => {
      mockUseAuth.mockReturnValue({ role: 'ADMIN' });
      renderActions();
      expect(screen.getByText('Modifier')).toBeTruthy();
    });
  });

  describe('delete confirmation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ role: 'ADMIN' });
    });

    it('shows confirmation dialog when Supprimer is clicked', () => {
      renderActions();
      fireEvent.click(screen.getByRole('button', { name: /supprimer/i }));
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText(/irréversible/i)).toBeTruthy();
    });

    it('closes dialog when Annuler is clicked', () => {
      renderActions();
      fireEvent.click(screen.getByRole('button', { name: /supprimer/i }));
      fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('calls deleteMutation when Supprimer in dialog is confirmed', () => {
      renderActions({ eventId: 'event-42' });
      fireEvent.click(screen.getByRole('button', { name: /supprimer/i }));
      // There are now two "Supprimer" buttons — pick the one inside the dialog
      const confirmBtn = screen.getAllByRole('button', { name: /supprimer/i }).at(-1)!;
      fireEvent.click(confirmBtn);
      expect(deleteMutate).toHaveBeenCalledWith('event-42', expect.any(Object));
    });
  });
});
