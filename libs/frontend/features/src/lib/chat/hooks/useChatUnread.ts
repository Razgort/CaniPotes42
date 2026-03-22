import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { chatSocket, useAuth } from '@org/data-access';

export function useChatUnread(): number {
  const [unreadCount, setUnreadCount] = useState(0);
  const { pathname } = useLocation();
  const isOnChatRoute = pathname.startsWith('/chat');
  const isOnChatRouteRef = useRef(isOnChatRoute);
  isOnChatRouteRef.current = isOnChatRoute;

  // Reset count when user navigates to chat
  useEffect(() => {
    if (isOnChatRoute) {
      setUnreadCount(0);
    }
  }, [isOnChatRoute]);

  const { accessToken, activeClub } = useAuth();

  // Subscribe to incoming messages to track unread
  useEffect(() => {
    if (!accessToken || !activeClub?.id) return;

    const unsubscribe = chatSocket.onMessage(() => {
      // Only increment if not currently on chat route
      if (!isOnChatRouteRef.current) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return unsubscribe;
  }, [accessToken, activeClub?.id]);

  return unreadCount;
}
