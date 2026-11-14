
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('scene'),ctx=canvas.getContext('2d'),held=new Set();
const moon=[
 ['Pioneer lunar probes','Flyby attempts','Early American attempts to reach the Moon. Pioneer 4 passed the Moon in 1959.'],
 ['Ranger 1–9','Test flights / impactors','The successful Ranger probes sent close-up images before hitting the Moon.'],
 ['Surveyor 1–7','Robotic landers','Surveyor demonstrated that robotic spacecraft could make soft landings.'],
 ['Lunar Orbiter 1–5','Orbiters','These orbiters photographed the Moon and helped identify landing sites.'],
 ['Apollo lunar modules','Crewed equipment','Descent stages like Eagle’s stayed on the Moon and served as launch pads for the upper stage.'],
 ['Lunar Roving Vehicles','Crewed equipment','Astronauts drove three electric moon buggies, then parked them on the Moon.'],
 ['ALSEP stations','Surface instruments','Apollo astronauts left instrument packages to continue science after they departed.'],
 ['Lunar Prospector','Orbiter','It mapped the Moon and found signs of hydrogen near the poles.'],
 ['LRO','Orbiter','Lunar Reconnaissance Orbiter has mapped the surface in detail.'],
 ['LCROSS','Impactor','It studied material thrown up by a lunar impact and found evidence of water.'],
 ['GRAIL','Twin orbiters','Ebb and Flow mapped tiny changes in the Moon’s gravity.'],
 ['LADEE','Orbiter','It studied gases and dust around the Moon.'],
 ['CAPSTONE','Orbiter','This small spacecraft tested a lunar orbit planned for Gateway.']
];
const mars=[
 ['Mariner 3 & 4','Flyby attempts','Mariner 3 did not reach Mars. Mariner 4 returned the first close-up pictures of Mars.'],
 ['Mariner 6 & 7','Flybys','These twin spacecraft flew past Mars and photographed its surface.'],
 ['Mariner 8 & 9','Orbiter attempts','Mariner 8 failed at launch. Mariner 9 became the first spacecraft to orbit another planet.'],
 ['Viking 1 & 2','Landers / orbiters','The first U.S. landers to operate successfully on Mars reached it in 1976.'],
 ['Mars Observer','Orbiter attempt','Contact was lost shortly before the spacecraft was due to enter orbit.'],
 ['Mars Global Surveyor','Orbiter','It mapped the surface and studied the planet from orbit.'],
 ['Pathfinder & Sojourner','Lander / rover','Pathfinder delivered Sojourner, the first rover on Mars, in 1997.'],
 ['Mars Climate Orbiter','Orbiter attempt','The spacecraft was lost during its approach to Mars.'],
 ['Mars Polar Lander & Deep Space 2','Lander / impact probes','NASA lost contact with the lander and did not hear back from the two impact probes.'],
 ['Mars Odyssey','Orbiter','It mapped minerals and found evidence of ice below the surface.'],
 ['Spirit & Opportunity','Twin rovers','These twin rovers explored Mars for years and are now inactive.'],
 ['Mars Reconnaissance Orbiter','Orbiter','Its high-resolution camera shows fine details on the Martian surface.'],
 ['Phoenix','Lander','Phoenix dug into the soil to study water ice.'],
 ['Curiosity','Rover','It studies whether ancient Mars could have supported microbial life.'],
 ['MAVEN','Orbiter','It studies how Mars lost much of its atmosphere.'],
 ['InSight & MarCO','Lander / flyby CubeSats','InSight listened for marsquakes. MarCO’s two small spacecraft relayed data during landing.'],
 ['Perseverance & Ingenuity','Rover / helicopter','Perseverance collects rock samples. Ingenuity completed the first powered flight on another planet.']
];
const levels={moon:{g:1.62,title:'Moon',data:moon},mars:{g:3.71,title:'Mars',data:mars}};
for(const level of Object.values(levels))level.probes=level.data.map(([name,type,fact],i)=>({name,type,fact,x:i%2?8:-8,z:17+i*8.4,id:level.title+i}));
const routeKinds={
 moon:['signals','signals','surface','orbit','surface','surface','surface','orbit','orbit','signals','orbit','orbit','orbit'],
 mars:['signals','signals','orbit','surface','signals','orbit','surface','signals','signals','orbit','surface','orbit','surface','surface','orbit','surface','surface']
};
for(const [world,level] of Object.entries(levels)){
 const rank=['surface','orbit','signals'];
 for(const p of level.probes)p.kind=routeKinds[world][Number(p.id.slice(level.title.length))];
 level.probes.sort((a,b)=>rank.indexOf(a.kind)-rank.indexOf(b.kind));
 level.probes.forEach((p,i)=>{
   p.x=p.kind==='orbit'?11:p.kind==='signals'?-11:(i%2?4:-5);
   p.z=17+i*8.4;
 });
}
const terrainColors={moon:['#b7bcd4','#c9cbe0','#b1b6cc','#d4d6e9'],mars:['#e7a98d','#f4c2a0','#dfa184','#efb49a']};
const seen=new Set();let mode='moon',flight,width,height,last=0,points=0,speed=0,shield=0,boost=0,clock=0,hp=3,hazard,drone,pulse=0,selected=null,audio,music,soundOn=true,musicOn=false,musicGain,filter='all';
function noise(i){const n=Math.sin(i*127.1+7.45)*43758.5;return n-Math.floor(n)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
async function unlockAudio(){
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio)return false;
 try{audio??=new Audio();await audio.resume();return true}catch{return false}
}
function voice(freq,length,volume,destination,wave='sine',delay=0,end=freq){
 const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+delay;
 osc.type=wave;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(end,t+length);
 gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(volume,t+Math.min(.5,length*.25));gain.gain.exponentialRampToValueAtTime(.001,t+length);
 osc.connect(gain).connect(destination);osc.start(t);osc.stop(t+length+.03);
}
function tone(freq=465,length=.23,end=freq){
 if(!soundOn||audio?.state!=='running')return;
 voice(freq,length,.11,audio.destination,'triangle',0,end);
}
let bar=0;
function playMusic(){
 if(!musicOn||audio?.state!=='running')return;
 const chords=[[130.81,196,261.63,329.63],[110,164.81,220,261.63],[87.31,130.81,174.61,220],[98,146.83,196,293.66]];
 const chord=chords[bar++%chords.length];
 chord.forEach((freq,i)=>voice(freq,3.5,.14,musicGain,'sine',i*.08));
 [2,1,3,1].forEach((n,i)=>voice(chord[n]*2,1.25,.055,musicGain,'triangle',.24+i*.66));
}
$('music').onclick=async()=>{
 if(musicOn){musicOn=false;clearInterval(music);musicGain.gain.setTargetAtTime(0,audio.currentTime,.08)}
 else{
  if(!await unlockAudio()){status('This browser could not start audio.');return}
  if(!musicGain){musicGain=audio.createGain();musicGain.gain.value=0;musicGain.connect(audio.destination)}
  musicOn=true;musicGain.gain.setTargetAtTime(.28,audio.currentTime,.12);playMusic();music=setInterval(playMusic,3000);
 }
 $('music').textContent=musicOn?'Music on':'Music off';$('music').setAttribute('aria-pressed',String(musicOn));
};
$('sound').setAttribute('aria-pressed','true');
$('sound').onclick=async()=>{
 soundOn=!soundOn;
 if(soundOn&&await unlockAudio())tone(520,.18,680);
 $('sound').textContent=soundOn?'Effects on':'Effects off';$('sound').setAttribute('aria-pressed',String(soundOn));
};
document.addEventListener('pointerdown',()=>{if(soundOn)unlockAudio()},{once:true});
document.addEventListener('keydown',()=>{if(soundOn)unlockAudio()},{once:true});
function status(s){$('status').textContent=s}
function nearest(){return levels[mode].probes.filter(p=>!seen.has(p.id)).sort((a,b)=>range(a)-range(b))[0]}
function range(p){return Math.hypot(flight.x-p.x,flight.z-p.z)}
function story(p){selected=p;$('story').replaceChildren();const div=document.createElement('section');div.className='card';const kind=document.createElement('small'),name=document.createElement('h3'),fact=document.createElement('p');kind.textContent=p.type;name.textContent=p.name;fact.textContent=p.fact+(p.kind==='orbit'?' Scan its violet relay on the ground to add this record.':'');div.append(kind,name,fact);$('story').append(div)}
function glossary(){
 $('glossary').replaceChildren();
 for(const button of document.querySelectorAll('[data-filter]'))button.setAttribute('aria-pressed',String(button.dataset.filter===filter));
 for(const p of levels[mode].probes.filter(p=>filter==='all'||p.kind===filter)){
  const b=document.createElement('button'),kind=document.createElement('em');b.className='chip';b.textContent=(seen.has(p.id)?'✓ ':'◇ ')+p.name;
  kind.textContent={surface:'Surface',orbit:'Relay',signals:'Archive'}[p.kind];b.append(kind);b.onclick=()=>story(p);$('glossary').append(b);
 }
}
function enter(next){
 mode=next;filter='all';held.clear();flight={x:0,z:6,y:0,v:0};hp=3;hazard=null;drone=null;pulse=0;clock=0;selected=null;
 $('moon').setAttribute('aria-pressed',String(mode==='moon'));$('mars').setAttribute('aria-pressed',String(mode==='mars'));
 $('heading').textContent=levels[mode].title+' expedition';$('zone').textContent='Surface survey · '+levels[mode].g+' m/s²';
 $('story').replaceChildren();glossary();status('Follow the beacon and scan a probe record.');hud();
}
function scan(){
 const hit=levels[mode].probes.filter(p=>range(p)<=4.7).sort((a,b)=>range(a)-range(b))[0];
 if(!hit){status('Move within 4.7 m of a probe or beacon.');return}
 story(hit);
 if(seen.has(hit.id)){status('Record already collected.');return}
 seen.add(hit.id);points+=100;glossary();tone();status(hit.name+' collected · +100 points');hud();
}
function jump(){if(flight.y===0){flight.v=4.4;tone(260,.15)}}
function fire(){pulse=.30;tone(750,.19,130);if(drone&&range(drone)<14){drone=null;status('Fictional drone dispersed.')}else status('Pulse fired. Get within 14 m of a drone.')}
function buy(item){
 const cost={speed:200,shield:100,power:150}[item];
 if(item==='speed'&&speed>=3){status('Speed is fully upgraded.');return}
 if(points<cost){status('Scan more probes to earn '+cost+' points.');return}
 points-=cost;if(item==='speed')speed++;if(item==='shield')shield++;if(item==='power')boost=18;
 tone(610);status(item==='power'?'Power boost active for 18 seconds.':item==='shield'?'One extra shield equipped.':'Movement speed upgraded.');hud();
}
function damage(){
 tone(180,.29,60);
 if(boost>0){status('Power boost absorbed the hit.');return}
 if(shield>0){shield--;status('Shield absorbed the hit.');return}
 hp--;if(!hp){flight={x:0,z:6,y:0,v:0};hp=3;status('Returned to base. Your points and scans are safe.')}else status('Suit hit · '+hp+' health remaining.');
}
function hud(){
 const level=levels[mode],count=level.probes.filter(p=>seen.has(p.id)).length,p=nearest();
 const text='<b>'+points+' POINTS</b><b>'+count+' / '+level.probes.length+' SCANS</b><b>HEALTH '+hp+' · SHIELD '+shield+'</b>'+(boost>0?'<b>BOOST '+Math.ceil(boost)+'s</b>':'');
 if($('gauges').innerHTML!==text)$('gauges').innerHTML=text;
 const message=p?'Next beacon: '+p.name+' · '+Math.round(range(p))+' m '+(p.z<flight.z-2?'(behind you)':''):'Level complete. All field records collected.';
 if($('target').textContent!==message)$('target').textContent=message;
}
$('moon').onclick=()=>enter('moon');$('mars').onclick=()=>enter('mars');$('restart').onclick=()=>enter(mode);
$('scan').onclick=scan;$('jump').onclick=jump;$('pulse').onclick=fire;
$('help').onclick=()=>{held.clear();$('guide').showModal()};$('closeHelp').onclick=()=>$('guide').close();
for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{filter=b.dataset.filter;glossary()};
for(const b of document.querySelectorAll('[data-buy]'))b.onclick=()=>buy(b.dataset.buy);
const keys={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',KeyA:'left',KeyD:'right',KeyW:'up',KeyS:'down'};
addEventListener('keydown',e=>{if($('guide').open||e.ctrlKey||e.metaKey||e.altKey)return;
 if(keys[e.code]){e.preventDefault();held.add(keys[e.code])}
 if(e.code==='Space'&&!e.target.closest('button,a')){e.preventDefault();if(!e.repeat)jump()}
 if(e.code==='KeyE'&&!e.repeat)scan();if(e.code==='KeyF'&&!e.repeat)fire();
});addEventListener('keyup',e=>held.delete(keys[e.code]));addEventListener('blur',()=>held.clear());
for(const b of document.querySelectorAll('[data-key]')){
 const k=b.dataset.key;b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);held.add(k)};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>held.delete(k);b.onclick=e=>{if(!e.detail){held.add(k);setTimeout(()=>held.delete(k),200)}}
}
function update(dt){
 const x=Number(held.has('right'))-Number(held.has('left')),z=Number(held.has('up'))-Number(held.has('down')),s=(7+speed*1.9+(boost>0?4:0))*dt/(Math.hypot(x,z)||1);
 flight.x=clamp(flight.x+x*s,-20,20);flight.z=clamp(flight.z+z*s,3,levels[mode].probes.at(-1).z+10);
 if(flight.y||flight.v){flight.v-=levels[mode].g*dt;flight.y=Math.max(0,flight.y+flight.v*dt);if(!flight.y)flight.v=0}
 boost=Math.max(0,boost-dt);pulse=Math.max(0,pulse-dt);
 const before=clock;clock+=dt;
 if(Math.floor((before+4)/17)!==Math.floor((clock+4)/17)){
  tone(235,.24,360);hazard={x:flight.x,z:clamp(flight.z+3,4,levels[mode].probes.at(-1).z+8),t:2.8};status('Meteor shower warning · Move out of the red zone!');
 }
 if(hazard){hazard.t-=dt;if(hazard.t<=0){if(range(hazard)<5&&flight.y<2)damage();hazard=null}}
 if(Math.floor((before+3)/27)!==Math.floor((clock+3)/27)){
  drone={x:clamp(flight.x+6,-19,19),z:flight.z+13};status('Fictional alien drone approaching · Press F when in range.');
 }
 if(drone){const d=range(drone);if(d<1.8){damage();drone=null}else{drone.x+=(flight.x-drone.x)*dt*3.35/d;drone.z+=(flight.z-drone.z)*dt*3.35/d}}
 hud();
}
function resize(){width=canvas.clientWidth;height=canvas.clientHeight;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0)}
new ResizeObserver(resize).observe(canvas);resize();
function project(x,y,z){const depth=z-flight.z+12;if(depth<1)return null;const f=Math.min(width*.91,height*.97);return [width*.5+(x-flight.x)*f/depth,height*.39+(6+flight.y*.35-y)*f/depth,depth]}
function path(points,fill,stroke){
 if(points.some(p=>!p))return;
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}
}
function line(a,b,color,w=1){if(!a||!b)return;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.strokeStyle=color;ctx.lineWidth=w;ctx.stroke();ctx.lineWidth=1}
function box(x,y,z,w,h,d,colors){
 const coords=[[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]];
 const p=coords.map(([a,b,c])=>project(x+a*w/2,y+b*h,z+c*d/2));
 const faces=[[3,2,6,7],[1,2,6,5],[0,3,7,4],[0,1,5,4],[4,5,6,7]];
 faces.map((indices,i)=>({i,points:indices.map(j=>p[j])})).filter(o=>o.points.every(Boolean)).sort((a,b)=>b.points.reduce((s,p)=>s+p[2],0)-a.points.reduce((s,p)=>s+p[2],0)).forEach(o=>path(o.points,colors[o.i%colors.length],'#17202c45'));
}
function globe(x,y,r,colors,earth=false){
 const g=ctx.createRadialGradient(x-r*.37,y-r*.4,0,x,y,r);
 colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c));
 ctx.save();ctx.shadowBlur=earth?26:12;ctx.shadowColor=colors[0];ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.shadowBlur=0;ctx.clip();
 for(let i=0;i<32;i++){
  const ox=(noise(i+113)-.5)*r*2,oy=(noise(i+556)-.5)*r*2,s=r*(.07+noise(i+882)*.15);
  ctx.fillStyle=earth?(i%3?'#82ab7d99':'#f0f9ff77'):'#12182340';ctx.beginPath();ctx.ellipse(x+ox,y+oy,s*1.38,s*.6,i*.51,0,Math.PI*2);ctx.fill();
 }ctx.restore();
}
function terrain(){
 const palette=terrainColors[mode];
 const from=Math.max(0,Math.floor((flight.z-9)/4));
 for(let iz=Math.ceil((flight.z+85)/4);iz>=from;iz--){
  const z=iz*4+1;
  for(let ix=-13;ix<13;ix++){
   const x=ix*5;
   const heightAt=(a,b)=>Math.sin(a*.5+b*.45)*.15+Math.cos(a*.75-b*.31)*.12;
   const a=project(x,heightAt(ix,iz),z),b=project(x+5,heightAt(ix+1,iz),z),c=project(x+5,heightAt(ix+1,iz+1),z+4),d=project(x,heightAt(ix,iz+1),z+4);
   path([a,b,c],palette[Math.floor(noise(ix+iz*31)*4)]);path([a,c,d],palette[Math.floor(noise(ix+iz*31+44)*4)]);
  }
 }
}
function marker(x,z,text){
 const p=project(x,.1,z);
 if(!p)return;
 const r=clamp(width*.42/p[2],9,37);
 ctx.beginPath();ctx.ellipse(p[0],p[1],r,r*.35,0,0,Math.PI*2);ctx.strokeStyle='#dcff95';ctx.lineWidth=2;ctx.stroke();ctx.lineWidth=1;
 ctx.textAlign='center';ctx.fillStyle='#efffc3';ctx.font='700 11px system-ui';ctx.fillText(text,p[0],p[1]-r-7);
}
function lander(x,y,z,raise){
 const gold=['#9c7133','#d39d48','#b8893f','#efc573','#ffdf8e'];
 const top=['#8d9ab1','#c8d2dc','#99a5b6','#e7ecee','#f4f7ec'];
 for(const side of [-1,1])for(const front of [-1,1])line(project(x+side*.88,y+.65,z+front*.7),project(x+side*1.8,y,z+front*1.35),'#f3d08a',2);
 box(x,y+.32,z,2.2,.63,1.9,gold);
 box(x+flight.bank*.14,y+.95+raise,z,1.53,1.12,1.42,top);
 box(x,y+1.25+raise,z-.73,.82,.32,.13,['#193046','#193046','#375267','#29415c','#5c98ae']);
 if(raise>0&&raise<14){
  const a=project(x,y+.96+raise,z),b=project(x,y+.40+raise-Math.sin(raise*10)*.25,z);line(a,b,'#ffc46f',4);
 }
}
function rover(x,z,isScout=false){
 const color=isScout?['#286267','#38a5a4','#39858d','#8cddd1','#c4f4e8']:['#8d7462','#cdb398','#a38c72','#d8c2a9','#ede5c7'];
 for(const side of [-1,1])for(const off of [-.59,0,.59])box(x+side*.65,.10,z+off,.3,.42,.31,['#212631','#303846','#252a36']);
 box(x,.36,z,1.29,.38,1.36,color);box(x,.74,z+.22,.15,.56,.15,color);box(x,1.30,z+.22,.4,.19,.32,color);
}

function satellite(x,y,z){
 const panel=['#345598','#416bc4','#587fd3','#83aeff','#aec8ff'],body=['#a89162','#dfbd74','#c6a05d','#fce29c','#fff1be'];
 box(x,y,z,1.12,.78,.96,body);
 for(const sign of [-1,1]){
  box(x+sign*1.24,y+.29,z,1.34,.11,.78,panel);
  for(let i=0;i<3;i++)line(project(x+sign*(.69+i*.36),y+.413,z-.38),project(x+sign*(.69+i*.36),y+.413,z+.38),'#d5ebff',.8);
 }
 box(x,y+.83,z,.45,.17,.56,['#c6cedf','#ebedff','#e3dce8']);
}
function skyTraffic(time){
 const orbits=levels[mode].probes.filter(o=>o.kind==='orbit');
 orbits.forEach((o,i)=>{
  const t=time*(.21+i*.018)+i*2.4;
  const x=flight.x+Math.cos(t)*(21+i*3);
  const z=flight.z+44+i*5+Math.sin(t)*10;
  const y=12+i*1.35+Math.sin(t)*3;
  satellite(x,y,z);
  const a=project(x,y+.75,z);
  if(a&&(i===0||selected===o)){
   ctx.fillStyle='#fff';ctx.font='600 11px system-ui';ctx.textAlign='center';ctx.fillText(o.name,a[0],a[1]-7);
  }
 });
}
function draw(time){
 const g=ctx.createLinearGradient(0,0,0,height);g.addColorStop(0,mode==='moon'?'#394478':'#bc7c9f');g.addColorStop(1,mode==='moon'?'#9fa9e6':'#f7c6a8');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
 for(let i=0;i<130;i++){ctx.fillStyle='#ffffffaa';ctx.fillRect(noise(i+3)*width,noise(i+408)*height*.49,1+i%3,1+i%3)}
 if(mode==='moon')globe(width*.79,height*.25,height*.09,['#a8f2ed','#6ca8ef','#5365b0'],true);
 for(let i=0;i<5;i++){
  ctx.fillStyle=mode==='moon'?'#6973a8':'#b17b8e';
  const y=height*(.395+i*.012);
  path([[0,y+20],[width*.11,y-5],[width*.28,y-22+i*4],[width*.46,y+5],[width*.68,y-17],[width,y+10],[width,y+46],[0,y+46]],ctx.fillStyle);
 }
 terrain();skyTraffic(time);
 const p=nearest(),objects=[];
 for(const o of levels[mode].probes){if(o.z<flight.z-9||o.z>flight.z+76)continue;objects.push({z:o.z,draw(){
  if(o===p)marker(o.x,o.z,o.kind==='orbit'?'◆ ORBIT RELAY':'◆ SCAN BEACON');
  const color=seen.has(o.id)?['#94a9ad','#b5c9d2','#90acb7','#b8d1da','#d1e3e9']:['#a56fe0','#b995f3','#a482df','#d7b9ff','#ead8ff'];
  if(o.kind==='orbit'){
   box(o.x,0,o.z,1.6,.36,1.6,color);box(o.x,.34,o.z,.18,1.25,.18,color);
   box(o.x,1.58+Math.sin(time*2)*.15,o.z,.64,.32,.64,color);
   line(project(o.x-1.05,1.45,o.z),project(o.x+1.05,1.45,o.z),'#ede2ff',2);
  }else if(o.kind==='surface'&&o.type.toLowerCase().includes('rover'))rover(o.x,o.z);
  else{box(o.x,.15,o.z,1.7,.83,1.45,color);box(o.x,1,o.z,.75,.58,.62,color);box(o.x-1.2,.73,o.z,1.05,.14,.78,['#527bb7','#7194e4','#96b7f8']);box(o.x+1.2,.73,o.z,1.05,.14,.78,['#527bb7','#7194e4','#96b7f8'])}
 }})}
 if(hazard){const a=project(hazard.x,.02,hazard.z);if(a){const r=Math.min(150,Math.min(width*.91,height*.97)*5/a[2]);ctx.fillStyle='#f44c6970';ctx.beginPath();ctx.ellipse(a[0],a[1],r,r*.34,0,0,Math.PI*2);ctx.fill()}
 box(hazard.x+(hazard.t*2),hazard.t*8,hazard.z,1.25,1.25,1.25,['#a54d54','#db635a','#ff8b6b'])}
 if(drone)objects.push({z:drone.z,draw(){box(drone.x,2+Math.sin(time*4)*.25,drone.z,1.9,.68,1.25,['#698dc0','#8df1b5','#70dabb','#aaf5bb']);box(drone.x,2.65,drone.z,.88,.49,.7,['#9085e6','#d2bbff','#b3a5ff'])}});
 objects.push({z:flight.z,draw(){const x=flight.x,z=flight.z,y=flight.y,colors=['#8e77d9','#a38aef','#7873d3','#c2aaff','#eee0ff'];
 box(x-.36,y,z,.38,.54,.48,colors);box(x+.36,y,z,.38,.54,.48,colors);box(x,y+.55,z,.97,.79,.55,colors);
 box(x,y+1.34,z,.77,.58,.7,['#e2b36d','#f0cd88','#f7d98d','#ffe5a8']);box(x,y+1.46,z+.35,.58,.25,.08,['#5788a6','#75bad4','#a1ecf0']);
 if(pulse>0){const a=project(x,y+.8,z);if(a){ctx.beginPath();ctx.ellipse(a[0],a[1],25+(1-pulse/.3)*87,13+(1-pulse/.3)*34,0,0,Math.PI*2);ctx.strokeStyle='#d6ffef';ctx.lineWidth=3;ctx.stroke();ctx.lineWidth=1}}
 }});
 objects.sort((a,b)=>b.z-a.z).forEach(o=>o.draw());
}
function loop(ms){const dt=Math.min(.04,(ms-last)/1000);last=ms;if(!$('guide').open)update(dt);draw(ms/1000);requestAnimationFrame(loop)}
enter('moon');requestAnimationFrame(loop);
