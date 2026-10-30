// Source wrapper compiled by the existing Cloudflare adapter before asset handling.
// @ts-nocheck -- adapter runtime supplies the fetch contract.
import astroHandler from '@astrojs/cloudflare/entrypoints/server';
const APEX_HOST='munnarrose.com';
export default {
 async fetch(request:Request,env:Record<string,unknown>,ctx:unknown):Promise<Response>{
  const url=new URL(request.url);
  const canonicalHost=url.hostname===APEX_HOST||url.hostname==='www.'+APEX_HOST;
  if(canonicalHost&&(url.protocol==='http:'||url.hostname==='www.'+APEX_HOST)){
   url.protocol='https:';url.hostname=APEX_HOST;return Response.redirect(url.toString(),301);
  }
  const response=await astroHandler.fetch(request,env,ctx);
  const headers=new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Permissions-Policy','geolocation=(), camera=(), microphone=()');
  headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://www.google-analytics.com; font-src 'self'; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  if(canonicalHost&&url.protocol==='https:')headers.set('Strict-Transport-Security','max-age=63072000; includeSubDomains; preload');
  if(response.status===404)headers.set('X-Robots-Tag','noindex, follow');
  if(headers.get('Content-Type')?.includes('text/html'))headers.set('Cache-Control','no-store');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 }
};
