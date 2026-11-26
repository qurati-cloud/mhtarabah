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

export const adLines = ['Put you add here', '+1 514 446 5664'];
export const nextSigns = distance => {
  const first = 38 + Math.max(0, Math.floor((distance - 26) / 118)) * 118;
  return [first, first + 118];
};
