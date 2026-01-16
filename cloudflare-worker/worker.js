// Cloudflare Worker Proxy for BizGift Dashboard
// Bypasses CORS restrictions for Google Apps Script API

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxRZfGkPBWqBZmMUJ6ry_6klD5Ao33eaTy2A3jyIwt0Ih3AYBHDPuVm1Fpq8rIM7hMV/exec';
const ALLOWED_ORIGINS = [
  'https://bizgift-dashboard.web.app',
  'https://bizgift-dashboard.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const url = new URL(request.url);
      const targetUrl = APPS_SCRIPT_URL + url.search;

      // Fetch from Apps Script (follows redirects automatically)
      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'Accept': 'application/json'
        }
      });

      // Get response body
      const data = await response.text();

      // Get origin for CORS header
      const origin = request.headers.get('Origin') || '*';
      const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

      // Return response with CORS headers
      return new Response(data, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Max-Age': '86400',
          'Cache-Control': 'no-cache'
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Proxy error: ' + error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

function handleOptions(request) {
  const origin = request.headers.get('Origin') || '*';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400'
    }
  });
}
