import { NextResponse } from 'next/server';
import { eventStore } from '@/lib/storage/event-store';
import { getApiKeyCount } from '@/lib/storage/api-key-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    eventCount: eventStore.getEventCount(),
    apiKeyCount: getApiKeyCount(),
  });
}
