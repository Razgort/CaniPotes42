export { AuthProvider, useAuth } from './lib/AuthContext';
export type { User, Club, ClubWithRole, UserRole, AuthContextValue, LoginResponse, ClubSessionUpdate } from './lib/AuthContext';
export { QueryProvider, queryClient } from './lib/QueryProvider';
export { apiClient, ApiClientError, setTokenGetter, setTokenSetter, setOnUnauthorized } from './lib/api-client';
export { chatSocket } from './lib/socket-client';
export { useEvents, useEvent } from './lib/useEvents';
export type { EventListItem, EventDetail, EventsResponse } from './lib/useEvents';
export { useEventParticipants, useRsvpMutation } from './lib/useEventParticipation';
export type { RsvpStatus } from './lib/useEventParticipation';
