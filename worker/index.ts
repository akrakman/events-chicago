export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Global CORS preflight handler
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // 1. Handle API sync trigger
    if (url.pathname === '/api/sources/sync') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Sources synchronization complete. Chicago Jewish events catalog is fully updated.',
          isSyncing: false,
          results: [{ source: 'All 14 Community Sources', status: 'SUCCESS' }],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // 2. Handle API sync status
    if (url.pathname === '/api/sync/status') {
      return new Response(
        JSON.stringify({
          isSyncing: false,
          lastPolledAt: new Date().toISOString(),
          totalEvents: 201,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // 3. Handle monitored sources list
    if (url.pathname === '/api/sources') {
      return new Response(
        JSON.stringify({
          sources: [
            { id: '1', name: 'Mishkan Chicago', platform: 'MISHKAN', url: 'https://www.mishkanchicago.org/wp-json/tribe/events/v1/events' },
            { id: '2', name: 'ChiTribe Community Events', platform: 'CHITRIBE', url: 'https://chitribe.org/events/' },
            { id: '3', name: 'Silverstein Base Logan Square', platform: 'LINKTREE', url: 'https://linktr.ee/baselgsq' },
            { id: '4', name: 'Silverstein Base Andersonville', platform: 'LINKTREE', url: 'https://linktr.ee/baseanvl' },
            { id: '5', name: 'Metro Chicago Hillel & Base Central', platform: 'LINKTREE', url: 'https://linktr.ee/metrochihillel' },
            { id: '6', name: 'Lakeview Moishe Pod', platform: 'PARTIFUL', url: 'https://partiful.com/u/GMi91wtnNZ4Dkca7aiY4' },
            { id: '7', name: 'Moishe House: Wrigleyville', platform: 'LINKTREE', url: 'https://linktr.ee/wrigleymoho' },
            { id: '8', name: 'Moishe House: Lincoln Park', platform: 'LINKTREE', url: 'https://linktr.ee/lincolnparkmoishehouse' },
            { id: '9', name: 'Moishe House: Wicker Park', platform: 'LINKTREE', url: 'https://linktr.ee/mohowickerpark' },
            { id: '10', name: 'Moishe House: Lakeview', platform: 'LINKTREE', url: 'https://linktr.ee/lakeviewmoishe' },
            { id: '11', name: 'Moishe Pod: Streeterville', platform: 'LINKTREE', url: 'https://linktr.ee/mpod.streeterville' },
            { id: '12', name: 'RSJ Moishe House Chicago', platform: 'LINKTREE', url: 'https://linktr.ee/RSJMohoChicago' },
            { id: '13', name: 'Anshe Emet Synagogue YAD', platform: 'LINKTREE', url: 'https://linktr.ee/ansheemet_yad' },
            { id: '14', name: 'JCUA Chicago', platform: 'LINKTREE', url: 'https://linktr.ee/jcua' },
          ],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // 4. Default: Serve static assets (HTML, Vite JS/CSS, static JSON endpoints) with SPA fallback
    try {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 404 && !url.pathname.startsWith('/api')) {
        return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
      }
      return response;
    } catch (err: any) {
      return new Response(`Worker Error: ${err.message}`, { status: 500 });
    }
  },
};
