/**
 * Production Events Manager - Singleton Event Emitter for SSE
 * 
 * This module manages real-time events for the production view using Server-Sent Events (SSE).
 * It provides a singleton EventEmitter that can broadcast events to all connected SSE clients.
 * 
 * Event Types:
 * - new_order: Triggered when a new order is created
 * - status_update: Triggered when an order item's production status changes
 * - notes_update: Triggered when staff notes are updated
 */

import { EventEmitter } from 'events';

// Event payload types
export interface NewOrderEvent {
  type: 'new_order';
  orderId: string;
  orderNumber: string;
  deliveryDate: string;
  itemCount: number;
  timestamp: string;
}

export interface StatusUpdateEvent {
  type: 'status_update';
  itemId: string;
  orderId: string;
  orderNumber: string;
  oldStatus: string;
  newStatus: string;
  deliveryDate?: string;
  timestamp: string;
}

export interface NotesUpdateEvent {
  type: 'notes_update';
  itemId: string;
  orderId: string;
  orderNumber: string;
  timestamp: string;
}

export interface ItemDeletedEvent {
  type: 'item_deleted';
  itemId: string;
  orderId: string;
  orderNumber: string;
  timestamp: string;
}

export interface ItemAddedEvent {
  type: 'item_added';
  itemId: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  deliveryDate?: string;
  timestamp: string;
}

export type ProductionEvent = NewOrderEvent | StatusUpdateEvent | NotesUpdateEvent | ItemDeletedEvent | ItemAddedEvent;

// SSE Client connection interface
export interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
  userId?: string;
}

class ProductionEventsManager extends EventEmitter {
  private clients: Map<string, SSEClient>;
  private heartbeatInterval: NodeJS.Timeout | null;

  constructor() {
    super();
    this.clients = new Map();
    this.heartbeatInterval = null;
    
    // Start heartbeat mechanism
    this.startHeartbeat();
  }

  /**
   * Register a new SSE client connection
   */
  addClient(client: SSEClient): void {
    this.clients.set(client.id, client);
    console.log(`[SSE] Client connected: ${client.id} (Total: ${this.clients.size})`);
  }

  /**
   * Remove a disconnected SSE client
   */
  removeClient(clientId: string): void {
    const removed = this.clients.delete(clientId);
    if (removed) {
      console.log(`[SSE] Client disconnected: ${clientId} (Total: ${this.clients.size})`);
    }
  }

  /**
   * Get count of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Broadcast an event to all connected SSE clients
   */
  broadcastEvent(event: ProductionEvent): void {
    const eventData = JSON.stringify(event);
    console.log(`[SSE] Broadcasting event: ${event.type} to ${this.clients.size} clients`);

    // Send to all connected clients
    const disconnectedClients: string[] = [];
    
    this.clients.forEach((client, clientId) => {
      try {
        client.controller.enqueue(`data: ${eventData}\n\n`);
      } catch (error: any) {
        // Client disconnected - silently remove them
        if (error?.code === 'ERR_INVALID_STATE') {
          disconnectedClients.push(clientId);
        } else {
          console.error(`[SSE] Error sending to client ${clientId}:`, error);
          disconnectedClients.push(clientId);
        }
      }
    });

    // Remove disconnected clients
    disconnectedClients.forEach(clientId => this.removeClient(clientId));
  }

  /**
   * Send a message to a specific client
   */
  sendToClient(clientId: string, event: ProductionEvent): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        const eventData = JSON.stringify(event);
        client.controller.enqueue(`data: ${eventData}\n\n`);
      } catch (error: any) {
        // Client disconnected - silently remove them
        if (error?.code === 'ERR_INVALID_STATE') {
          this.removeClient(clientId);
        } else {
          console.error(`[SSE] Error sending to client ${clientId}:`, error);
          this.removeClient(clientId);
        }
      }
    }
  }

  /**
   * Send heartbeat ping to all clients to keep connections alive
   */
  private sendHeartbeat(): void {
    const comment = `:heartbeat ${Date.now()}\n\n`;
    const disconnectedClients: string[] = [];
    
    this.clients.forEach((client, clientId) => {
      try {
        client.controller.enqueue(comment);
      } catch (error: any) {
        // Client disconnected - silently remove them
        // This is expected when users close their browser tabs
        if (error?.code === 'ERR_INVALID_STATE') {
          disconnectedClients.push(clientId);
        } else {
          // Log unexpected errors
          console.error(`[SSE] Heartbeat failed for client ${clientId}:`, error);
          disconnectedClients.push(clientId);
        }
      }
    });

    // Remove disconnected clients after iteration
    disconnectedClients.forEach(clientId => this.removeClient(clientId));
  }

  /**
   * Start sending periodic heartbeats to keep connections alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.clients.size > 0) {
        this.sendHeartbeat();
      }
    }, 30000);
  }

  /**
   * Stop the heartbeat mechanism (cleanup)
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Clean up all connections
   */
  cleanup(): void {
    this.stopHeartbeat();
    this.clients.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
let productionEventsManager: ProductionEventsManager | null = null;

/**
 * Get the singleton instance of ProductionEventsManager
 */
export function getProductionEventsManager(): ProductionEventsManager {
  if (!productionEventsManager) {
    productionEventsManager = new ProductionEventsManager();
  }
  return productionEventsManager;
}

/**
 * Helper function to emit a new order event
 */
export function emitNewOrderEvent(data: Omit<NewOrderEvent, 'type' | 'timestamp'>): void {
  const event: NewOrderEvent = {
    type: 'new_order',
    ...data,
    timestamp: new Date().toISOString(),
  };
  getProductionEventsManager().broadcastEvent(event);
}

/**
 * Helper function to emit a status update event
 */
export function emitStatusUpdateEvent(data: Omit<StatusUpdateEvent, 'type' | 'timestamp'>): void {
  const event: StatusUpdateEvent = {
    type: 'status_update',
    ...data,
    timestamp: new Date().toISOString(),
  };
  getProductionEventsManager().broadcastEvent(event);
}

/**
 * Helper function to emit a notes update event
 */
export function emitNotesUpdateEvent(data: Omit<NotesUpdateEvent, 'type' | 'timestamp'>): void {
  const event: NotesUpdateEvent = {
    type: 'notes_update',
    ...data,
    timestamp: new Date().toISOString(),
  };
  getProductionEventsManager().broadcastEvent(event);
}

/**
 * Helper function to emit an item deleted event
 */
export function emitItemDeletedEvent(data: Omit<ItemDeletedEvent, 'type' | 'timestamp'>): void {
  const event: ItemDeletedEvent = {
    type: 'item_deleted',
    ...data,
    timestamp: new Date().toISOString(),
  };
  getProductionEventsManager().broadcastEvent(event);
}

/**
 * Helper function to emit an item added event
 */
export function emitItemAddedEvent(data: Omit<ItemAddedEvent, 'type' | 'timestamp'>): void {
  const event: ItemAddedEvent = {
    type: 'item_added',
    ...data,
    timestamp: new Date().toISOString(),
  };
  getProductionEventsManager().broadcastEvent(event);
}
