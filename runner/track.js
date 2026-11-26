const stretch = 185;
const sections = [
  {kind:'bridge', style:'harbor', length:70, trim:'#36b0bf', wall:'#2c7385'},
  {kind:'tunnel', style:'arch', length:70, trim:'#ffc57a', wall:'#725c63'},
  {kind:'tunnel', style:'glass', length:62, trim:'#9bdcff', wall:'#426979'},
  {kind:'bridge', style:'canyon', length:84, trim:'#ffa570', wall:'#a96453'},
  {kind:'tunnel', style:'metro', length:81, trim:'#a8f4a7', wall:'#415665'}
];

function feature(index) {
  return {...sections[index % sections.length], start:70 + index * stretch};
}

export function trackFeatures(distance) {
  const i = Math.max(0, Math.floor((distance - 70) / stretch));
  return [feature(i), feature(i + 1)];
}

export function overTunnel(distance) {
  return trackFeatures(distance).some(({kind,start,length}) =>
    kind === 'tunnel' && distance >= start && distance < start + length);
}

export function roadSignOpacity(distance, at) {
  const ahead = at-distance;
  const camera = distance-12;
  const ramp = value => {
    const t = Math.max(0,Math.min(1,value));
    return t*t*(3-2*t);
  };
  let opacity = Math.min(ramp((125-ahead)/48),ramp((ahead-1)/8));
  for(const {kind,start,length} of trackFeatures(camera-24)) {
    if(kind!=='tunnel' || at<start) continue;
    const end = start+length;
    const clearance = Math.max(start-camera,camera-end,0);
    opacity = Math.min(opacity,ramp(clearance/24));
  }
  return opacity;
}

export function openRoadSign(distance) {
  const tunnel = trackFeatures(distance).find(({kind,start,length}) =>
    kind === 'tunnel' && distance >= start && distance < start + length);
  return tunnel ? tunnel.start+tunnel.length+8 : distance;
}

export const adLines = ['Put you add here', '+1 514 446 5664'];
export const nextSigns = distance => {
  if (overTunnel(distance)) return [];
  const spacing = 472;
  const first = 38 + Math.max(0, Math.floor((distance - 26) / spacing)) * spacing;
  return [first, first + spacing].map(openRoadSign).filter(at=>roadSignOpacity(distance,at)>0);
};

export function railwayScene(distance) {
  const spacing = 156;
  const station = 51 + Math.max(0,Math.floor((distance-91)/spacing)+1)*spacing;
  const delta = distance-station;
  return {
    station, train:station+(delta < -37 ? (delta+37)*.48 : Math.max(0,delta-21)*1.18),
    unloading:Math.max(0,Math.min(1,(delta+35)/29))
  };
}
