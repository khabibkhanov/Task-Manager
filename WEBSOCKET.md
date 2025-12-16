# WebSocket Real-time Notifications

Bu project Socket.io orqali real-time notifications qo'llab-quvvatlaydi.

## Server Configuration

WebSocket server `/notifications` namespace'da ishlaydi va JWT authentication talab qiladi.

## Client Connection

### JavaScript/TypeScript (Browser)

```javascript
import { io } from 'socket.io-client';

// JWT token bilan ulanish
const socket = io('http://localhost:8000/notifications', {
  auth: {
    token: 'your-jwt-token-here'
  },
  // yoki query parameter orqali
  query: {
    token: 'your-jwt-token-here'
  }
});

// Connection event
socket.on('connect', () => {
  console.log('Connected to notifications');
  
  // Join event yuborish
  socket.emit('join');
});

// Notification olish
socket.on('notification', (data) => {
  console.log('New notification:', data);
  // {
  //   id: 'notification-id',
  //   type: 'TASK_ASSIGNED',
  //   title: 'Task assigned to you',
  //   message: 'You have been assigned to task: Task Title',
  //   taskId: 'task-id',
  //   read: false,
  //   createdAt: '2024-01-01T00:00:00.000Z',
  //   task: { id: 'task-id', title: 'Task Title' }
  // }
});

// Disconnect event
socket.on('disconnect', () => {
  console.log('Disconnected from notifications');
});

// Error handling
socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId?: string;
  read: boolean;
  createdAt: string;
}

export function useNotifications(token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:8000/notifications', {
      auth: { token },
      query: { token },
    });

    newSocket.on('connect', () => {
      console.log('Connected to notifications');
      setConnected(true);
      newSocket.emit('join');
    });

    newSocket.on('notification', (data: Notification) => {
      setNotifications((prev) => [data, ...prev]);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  return { socket, notifications, connected };
}
```

### React Component Example

```tsx
import React from 'react';
import { useNotifications } from './useNotifications';

function NotificationBell({ token }: { token: string }) {
  const { notifications, connected } = useNotifications(token);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <div className="notification-bell">
        🔔 {unreadCount > 0 && <span>{unreadCount}</span>}
        {!connected && <span className="offline">Offline</span>}
      </div>
      
      <div className="notifications-list">
        {notifications.map((notification) => (
          <div key={notification.id} className={notification.read ? 'read' : 'unread'}>
            <h4>{notification.title}</h4>
            <p>{notification.message}</p>
            <small>{new Date(notification.createdAt).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Notification Types

- `TASK_ASSIGNED` - Task sizga assign qilinganda
- `COMMENT_ADDED` - Task'ga comment qo'shilganda
- `TASK_STATUS_CHANGED` - Task status o'zgarganda
- `TASK_UPDATED` - Task yangilanganda

## Authentication

WebSocket connection JWT token talab qiladi. Token quyidagilardan birida bo'lishi kerak:

1. **Authorization header**: `Authorization: Bearer <token>`
2. **Query parameter**: `?token=<token>`

## Server Events

### Client -> Server

- `join` - Notifications room'ga qo'shilish

### Server -> Client

- `notification` - Yangi notification kelganda
- `joined` - Muvaffaqiyatli join qilinganda

## Example: Full Integration

```typescript
// 1. Login qilish va token olish
const response = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password' })
});
const { access_token } = await response.json();

// 2. WebSocket ga ulanish
const socket = io('http://localhost:8000/notifications', {
  auth: { token: access_token }
});

// 3. Notificationlarni tinglash
socket.on('notification', (notification) => {
  // Real-time notification keldi!
  showNotification(notification);
});

// 4. Task yaratish (notification avtomatik keladi)
await fetch('http://localhost:8000/api/tasks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Task',
    assigneeIds: ['user-id']
  })
});
// Assign qilingan user'ga real-time notification keladi!
```

## Production Considerations

1. **CORS**: Production'da CORS sozlamalarini to'g'ri konfiguratsiya qiling
2. **SSL/TLS**: Production'da WSS (WebSocket Secure) ishlating
3. **Rate Limiting**: Connection rate limiting qo'shing
4. **Reconnection**: Client tomonida auto-reconnect logic qo'shing
5. **Error Handling**: Barcha error caselarni handle qiling

