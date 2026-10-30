export interface Forecast {
 modelTime:string; retrievedAt:number; current:{temperature:number;code:number;wind:number};
 days:{date:string;code:number;min:number;max:number;probability:number;uv:number|null}[];
}
const codes=new Set([0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99]);
const number=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function parseForecast(data:any,at=Date.now()):Forecast|null {
 const c=data?.current,d=data?.daily,offset=data?.utc_offset_seconds;
 if(!c||!d||!['Asia/Kolkata','Asia/Calcutta'].includes(data.timezone)||!number(offset,19800,19800)||typeof c.time!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(c.time))return null;
 const epoch=Date.parse(c.time+'Z')-offset*1000;
 if(!Number.isFinite(epoch)||at-epoch>3*3600000||epoch-at>3600000||!number(c.temperature_2m,-50,60)||!number(c.wind_speed_10m,0,400)||!codes.has(c.weather_code))return null;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
 if(!Array.isArray(d.time)||d.time.length!==7||d.time[0]!==today)return null;
 const days:Forecast['days']=[];
 for(let i=0;i<7;i++){
  const date=d.time[i],min=d.temperature_2m_min?.[i],max=d.temperature_2m_max?.[i],probability=d.precipitation_probability_max?.[i],code=d.weather_code?.[i],uv=d.uv_index_max?.[i];
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Date.parse(date)-Date.parse(d.time[0])!==i*86400000||!number(min,-50,60)||!number(max,-50,60)||min>max||!number(probability,0,100)||!codes.has(code))return null;
  days.push({date,code,min,max,probability,uv:number(uv,0,30)?uv:null});
 }
 return{modelTime:c.time,retrievedAt:at,current:{temperature:c.temperature_2m,code:c.weather_code,wind:c.wind_speed_10m},days};
}
export function modelSignal(code:number):'thunder'|'heavyRain'|'fog'|null {
 if([95,96,99].includes(code))return'thunder';
 if([65,67,82].includes(code))return'heavyRain';
 if([45,48].includes(code))return'fog';
 return null;
}
