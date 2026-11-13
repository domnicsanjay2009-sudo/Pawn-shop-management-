import type { IncomingMessage, ServerResponse } from 'http';

export interface ApiRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string | string[]>;
}

export interface ApiResponse extends ServerResponse {
  status?: (code: number) => ApiResponse;
  json?: (data: any) => void;
  send?: (data: any) => void;
}

export default function handler(
  req: ApiRequest,
  res: ApiResponse
): Promise<void>;
