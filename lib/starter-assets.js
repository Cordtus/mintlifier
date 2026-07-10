export const STARTER_FAVICON_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
  '  <rect width="64" height="64" rx="12" fill="#0D9373"/>',
  '  <path d="M18 19h28v8H36v20h-8V27H18z" fill="white"/>',
  '</svg>',
  ''
].join('\n');

export const STARTER_LOGO_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 40">',
  '  <rect width="40" height="40" rx="8" fill="#0D9373"/>',
  '  <path d="M11 11h18v6h-6v14h-6V17h-6z" fill="white"/>',
  '  <text x="52" y="27" font-family="Arial, sans-serif" font-size="20" fill="currentColor">Documentation</text>',
  '</svg>',
  ''
].join('\n');

export function createStarterOpenApi(title = 'Your API') {
  return {
    openapi: '3.0.0',
    info: { title, version: '1.0.0' },
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          operationId: 'getHealth',
          responses: {
            200: { description: 'Service is available' }
          }
        }
      }
    }
  };
}
