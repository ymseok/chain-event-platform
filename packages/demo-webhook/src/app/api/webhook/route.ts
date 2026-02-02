import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { validateApiKey } from '@/lib/storage/api-key-store';
import { eventStore } from '@/lib/storage/event-store';
import type { WebhookEvent, WebhookPayload } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'X-API-Key header is required' },
        { status: 401 }
      );
    }

    if (!validateApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    let payload: WebhookPayload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const event: WebhookEvent = {
      id: randomUUID(),
      receivedAt: new Date().toISOString(),
      apiKeyPrefix: apiKey.substring(0, 8),
      payload,
    };

    eventStore.addEvent(event);

    return NextResponse.json({
      success: true,
      eventId: event.id,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook endpoint is ready',
    method: 'POST',
    headers: {
      required: ['X-API-Key', 'Content-Type: application/json'],
    },
  });
}
