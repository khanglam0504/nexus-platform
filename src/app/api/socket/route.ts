import { NextResponse } from 'next/server';

// Placeholder for Socket.io integration
// In production, Socket.io typically runs on a separate server or uses a custom server setup
// This endpoint exists as a health check / placeholder

export async function GET() {
  return NextResponse.json({
    status: 'Socket.io endpoint',
    message: 'For real-time functionality, configure Socket.io server separately',
  });
}
