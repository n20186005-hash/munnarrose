import {parseForecast} from './weather-model';
type Envelope={payload:unknown;retrievedAt:number};
let cache:Envelope|null=null,lastFailure=0;
export async function getForecast():Promise<Envelope|null>{
 const now=Date.now();
 if(cache&&now-cache.retrievedAt<15*60000&&parseForecast(cache.payload,now))return cache;
 if(now-lastFailure<30000)return null;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:'10.08583',longitude:'77.07583',timezone:'Asia/Kolkata',forecast_days:'7',current:'temperature_2m,weather_code,wind_speed_10m',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max'}).toString();
  const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('status');const payload:unknown=await response.json();if(!parseForecast(payload))throw Error('invalid');cache={payload,retrievedAt:Date.now()};lastFailure=0;return cache;
 }catch{cache=null;lastFailure=Date.now();return null;}finally{clearTimeout(timer);}
}
