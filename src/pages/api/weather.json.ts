import type {APIRoute} from 'astro';
import {getForecast} from '../../lib/weather';
export const prerender=false;
export const GET:APIRoute=async()=>{const forecast=await getForecast();return new Response(JSON.stringify(forecast??{error:'fresh_forecast_unavailable'}),{status:forecast?200:503,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});};
