import { FastifyPluginAsync } from 'fastify';
import { metricsService } from '../services/metrics.service.js';
import { supabase } from '../config/supabase.js';
import { redis } from '../config/redis.js';
import type { WebSocket } from 'ws';

interface WebSocketClient {
  socket: WebSocket;
  organizationId: string;
  userId: string;
}

const clients: Set<WebSocketClient> = new Set();

const analyticsWebSocketRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * WebSocket endpoint for real-time analytics streaming
   * GET /api/analytics/stream?token=<jwt>
   */
  fastify.get('/stream', { websocket: true }, async (socket: WebSocket, req) => {
    // Use 'socket' directly as the WebSocket connection (Fastify WebSocket v10+)
    console.log('Client attempting to connect to analytics stream');

    // Authenticate connection
    const token = (req.query as any).token as string;
    if (!token) {
      console.log('No token provided, closing connection');
      socket.close(1008, 'Authentication required');
      return;
    }

    // Verify JWT token
    let user: any;
    try {
      const decoded = await fastify.jwt.verify(token);
      user = decoded;
      console.log('User authenticated:', user.id);
    } catch (error) {
      console.error('JWT verification failed:', error);
      socket.close(1008, 'Invalid token');
      return;
    }

    // Get user's organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      console.error('Organization not found for user:', user.id);
      socket.close(1008, 'Organization not found');
      return;
    }

    const organizationId = membership.organization_id;
    console.log('Client connected to analytics stream:', { userId: user.id, organizationId });

    // Add client to set
    const client: WebSocketClient = {
      socket: socket,
      organizationId,
      userId: user.id
    };
    clients.add(client);

    // Send initial metrics
    try {
      const metrics = await metricsService.getRealtimeMetrics(organizationId);
      socket.send(JSON.stringify({
        type: 'metrics_update',
        data: {
          activeConversations: metrics.activeConversations,
          avgResponseTime: metrics.avgResponseTime,
          successRate: parseFloat(metrics.success_rate),
          messagesPerHour: metrics.messagesPerHour
        },
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to send initial metrics:', error);
    }

    // Set up interval for periodic updates (every 5 seconds)
    const updateInterval = setInterval(async () => {
      try {
        const metrics = await metricsService.getRealtimeMetrics(organizationId);

        if (socket.readyState === 1) { // OPEN
          socket.send(JSON.stringify({
            type: 'metrics_update',
            data: {
              activeConversations: metrics.activeConversations,
              avgResponseTime: metrics.avgResponseTime,
              successRate: parseFloat(metrics.success_rate),
              messagesPerHour: metrics.messagesPerHour
            },
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Failed to send metrics update:', error);
      }
    }, 5000);

    // Listen for Redis pub/sub events for real-time conversation updates
    let subscriber: typeof redis | null = null;
    if (redis) {
      subscriber = redis.duplicate();

      // Subscribe to organization channel
      await subscriber.subscribe(`org:${organizationId}:conversations`);

      // Listen for messages
      subscriber.on('message', (channel: string, message: string) => {
        try {
          const data = JSON.parse(message);
          if (socket.readyState === 1) {
            socket.send(JSON.stringify({
              type: 'new_message',
              data,
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('Failed to broadcast conversation update:', error);
        }
      });
    }

    // Handle incoming messages from client
    socket.on('message', (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message from client:', data);

        // Handle ping/pong for connection health
        if (data.type === 'ping') {
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Failed to process client message:', error);
      }
    });

    // Handle connection close
    socket.on('close', async () => {
      console.log('Client disconnected from analytics stream:', {
        userId: user.id,
        organizationId
      });

      clearInterval(updateInterval);
      clients.delete(client);

      if (subscriber) {
        try {
          await subscriber.unsubscribe(`org:${organizationId}:conversations`);
          await subscriber.quit();
        } catch (error) {
          console.error('Failed to cleanup subscriber:', error);
        }
      }
    });

    // Handle connection errors
    socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });
  });
};

/**
 * Broadcast a message to all connected clients for a specific organization
 */
export async function broadcastToOrganization(organizationId: string, message: any): Promise<void> {
  // Use Redis pub/sub for distributed broadcasting
  try {
    await redis.publish(
      `org:${organizationId}:conversations`,
      JSON.stringify(message)
    );
  } catch (error) {
    console.error('Failed to publish to Redis:', error);
  }
}

/**
 * Broadcast metrics update to all connected clients
 */
export async function broadcastMetricsUpdate(organizationId: string): Promise<void> {
  try {
    const metrics = await metricsService.getRealtimeMetrics(organizationId);

    await redis.publish(
      `org:${organizationId}:metrics`,
      JSON.stringify({
        type: 'metrics_update',
        data: {
          activeConversations: metrics.activeConversations,
          avgResponseTime: metrics.avgResponseTime,
          successRate: parseFloat(metrics.success_rate),
          messagesPerHour: metrics.messagesPerHour
        },
        timestamp: new Date().toISOString()
      })
    );
  } catch (error) {
    console.error('Failed to broadcast metrics update:', error);
  }
}

export default analyticsWebSocketRoutes;
