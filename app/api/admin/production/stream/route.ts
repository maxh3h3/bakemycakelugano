/**
 * SSE Stream API Route for Production View Real-Time Updates
 * 
 * This endpoint establishes a Server-Sent Events (SSE) connection to stream
 * real-time updates about production orders to connected cook devices.
 * 
 * Features:
 * - Authentication check before establishing connection
 * - Long-lived streaming connection
 * - Automatic heartbeat to keep connection alive
 * - Clean disconnection handling
 */

import { NextRequest } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { getProductionEventsManager } from '@/lib/events/production-events';
import type { ProductionEvent } from '@/lib/events/production-events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Validate authentication
  const isAuthenticated = await validateSession();
  
  if (!isAuthenticated) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Generate unique client ID
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Get the events manager
      const eventsManager = getProductionEventsManager();
      
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({ 
        type: 'connected', 
        clientId,
        timestamp: new Date().toISOString() 
      })}\n\n`);
      
      // Register this client with the events manager
      // The events manager will directly push events to this controller
      eventsManager.addClient({
        id: clientId,
        controller,
      });

      // Store client ID for cleanup
      (controller as any)._clientId = clientId;
      
      console.log(`[SSE] Client ${clientId} registered and ready to receive events`);
    },
    
    cancel(controller) {
      // Clean up when client disconnects
      const eventsManager = getProductionEventsManager();
      const clientId = (controller as any)._clientId;
      
      if (clientId) {
        eventsManager.removeClient(clientId);
      }
      
      console.log(`[SSE] Stream cancelled for ${clientId}`);
    },
  });

  // Return the stream with proper SSE headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for nginx
    },
  });
}
