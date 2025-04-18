import { NextResponse } from 'next/server';
import descriptor from '../../../atlassian-connect.json' assert { type: 'json' };

export async function GET(request: Request) {
  // construye la URL pública del despliegue
  const host =
    `${request.headers.get('x-forwarded-proto') ?? 'https'}://` +
    request.headers.get('host');

  // sustituye {{HOST}} por el dominio real
  const json = JSON.parse(
    JSON.stringify(descriptor).replace('{{HOST}}', host),
  );

  return NextResponse.json(json);
}
