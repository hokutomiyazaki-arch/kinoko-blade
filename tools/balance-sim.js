/* 総当たりCPU対戦で相性表を出す。 node tools/balance-sim.js
   index.html の数値を変えたらここも同じ値に合わせて回す。
   飛び道具（shot）も index.html と同じ挙動を実装してある：
     bolt 直進 / dart 高速 / wave 蛇行 / lob 山なり（近距離は頭上を越す） / mist 低速で減速し居座る */
const S=[
 {id:"シイタケ",hp:110,speed:90,dmg:16,reach:130,atkGauge:2.0,guardGauge:1.28,windup:0.28,active:0.14,recover:0.32,guardTime:.70,parryWindow:.20,
  shot:{kind:"bolt",gauge:3.3,dmg:6,speed:214,windup:.22,recover:.30,r:7,life:2.6}},
 {id:"エノキ",hp:88,speed:141,dmg:13,reach:105,atkGauge:1.2,guardGauge:0.9,windup:0.12,active:0.09,recover:0.18,guardTime:.52,parryWindow:.19,
  shot:{kind:"dart",gauge:2.58,dmg:3,speed:368,windup:.10,recover:.16,r:5,life:1.6}},
 {id:"ベニテング",hp:78,speed:53,dmg:23,reach:148,atkGauge:3.2,guardGauge:2.0,windup:0.5,active:0.2,recover:0.58,guardTime:.62,parryWindow:.14,poison:{dps:1.8,dur:6},
  shot:{kind:"mist",gauge:2.08,dmg:9,speed:145,windup:.34,recover:.42,r:13,life:2.6,poison:{dps:1.2,dur:4}}},
 {id:"マイタケ",hp:132,speed:60,dmg:15,reach:118,atkGauge:2.8,guardGauge:1.05,windup:0.34,active:0.16,recover:0.42,guardTime:.90,parryWindow:.22,reflect:6,
  shot:{kind:"lob",gauge:2.6,dmg:13,speed:201,up:132,windup:.28,recover:.36,r:9,life:3.0}},
 {id:"マツタケ",hp:74,speed:101,dmg:15,reach:116,atkGauge:2.8,guardGauge:2.0,windup:0.2,active:0.12,recover:0.3,guardTime:.56,parryWindow:.24,parryRefund:1,
  shot:{kind:"wave",gauge:2.9,dmg:6,speed:261,amp:17,freq:9,windup:.16,recover:.24,r:7,life:2.2}},
];
const R={wallL:44,wallR:516,bodyGap:58,blockChip:.35,chipCap:5,parryStun:.65,hurtTime:.25,shotHurt:.18,
         knockback:22,shotKnock:8,gravity:300,muzzleY:-44,hitTop:-62,hitBot:-4,hitHalfW:22,
         shotBlockRefund:.45,shotParryRefund:.75,
         roundTime:90,react:.22};
const DT=1/60;

/* 乱数は種を固定する。同じ数値なら誰が回しても同じ表が出る（以前は毎回振れていた） */
let _seed=20260815;
function rnd(){ _seed|=0; _seed=_seed+0x6D2B79F5|0;
  let t=Math.imul(_seed^_seed>>>15,1|_seed); t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296; }
function reseed(v){ _seed=v|0; }

function mk(s,x,d,dmgScale){return{s,x,dir:d,hp:s.hp,atk:0,grd:0,sht:0,st:"walk",t:0,hit:0,cast:0,poi:0,pdps:0,timer:0,hurtLim:R.hurtTime,dmgScale:dmgScale==null?1:dmgScale};}

/* 敵のレベル。index.html の cpuProfile() と同じ式にすること。
   Lv.1 は反応が鈍く滅多にガードしない。Lv.10 で従来のCPUに並ぶ。 */
function cpuProfile(lv){
  const t=Math.pow(Math.min(1,Math.max(0,(lv-1)/9)),0.5), over=Math.min(1,Math.max(0,(lv-10)/10));
  return { react:0.60-0.38*t-0.10*over, guard:0.20+0.52*t+0.15*over,
           pGuard:0.25+0.55*t+0.12*over, shot:0.15+0.40*t+0.15*over,
           dmg:0.75+0.25*t, hp:1.00+0.15*over, lv };
}
const PROF10 = cpuProfile(10);
function facing(a,b){return Math.sign(b.x-a.x)===a.dir;}

function fire(f,shots){
  const S=f.s.shot;
  shots.push({s:S,o:f,dir:f.dir,x:f.x+f.dir*24,dy:R.muzzleY,
              vx:f.dir*S.speed, vy:S.kind==="lob"? -S.up:0, t:0, dead:0});
}
function upd(f,shots){
  f.t+=DT;
  if(f.poi>0){f.poi-=DT;f.hp=Math.max(0,f.hp-f.pdps*DT);}
  const s=f.s;
  if(f.st==="walk"){
    f.atk=Math.min(1,f.atk+DT/s.atkGauge); f.grd=Math.min(1,f.grd+DT/s.guardGauge);
    f.sht=Math.min(1,f.sht+DT/s.shot.gauge);
    f.x+=f.dir*s.speed*DT;
    if(f.x<=R.wallL){f.x=R.wallL;f.dir=1;} if(f.x>=R.wallR){f.x=R.wallR;f.dir=-1;}
  } else if(f.st==="windup"){ if(f.t>=s.windup){f.st="active";f.t=0;} }
  else if(f.st==="active"){ if(f.t>=s.active){f.st="recover";f.t=0;} }
  else if(f.st==="recover"){ if(f.t>=s.recover){f.st="walk";f.t=0;} }
  else if(f.st==="cast"){ if(f.t>=s.shot.windup){ if(!f.cast){f.cast=1;fire(f,shots);} f.st="castRec";f.t=0; } }
  else if(f.st==="castRec"){ if(f.t>=s.shot.recover){f.st="walk";f.t=0;} }
  else if(f.st==="guard"){ if(f.t>=s.guardTime){f.st="walk";f.t=0;} }
  else { const lim=f.st==="stun"?R.parryStun:f.hurtLim; if(f.t>=lim){f.st="walk";f.t=0;} }
}
function ai(f,o,shots,pf){
  f.timer-=DT; if(f.st!=="walk"||f.timer>0) return;
  f.timer=pf.react*(0.7+rnd()*0.6);
  const d=Math.abs(o.x-f.x);
  // 飛んでくる弾は防御でしか止まらない
  if(f.grd>=1){
    let best=null;
    for(const sh of shots){
      if(sh.o===f||sh.dead) continue;
      if(Math.sign(sh.vx||sh.dir)!==Math.sign(f.x-sh.x)) continue;
      const tta=(Math.abs(sh.x-f.x)-R.hitHalfW)/Math.max(40,Math.abs(sh.vx));
      if(tta>=0&&(best===null||tta<best)) best=tta;
    }
    if(best!==null&&best<Math.min(0.34,f.s.guardTime*0.55)&&rnd()<pf.pGuard&&facing(f,o)){ f.grd=0;f.st="guard";f.t=0; return; }
  }
  if(o.st==="windup"&&f.grd>=1&&d<o.s.reach+60&&facing(f,o)){   // 背中を向けていたら防げない
    if(o.s.windup-o.t < f.s.parryWindow*0.9+0.06 && rnd()<pf.guard){ f.grd=0;f.st="guard";f.t=0; return; }
  }
  if(f.sht>=1&&facing(f,o)){
    const k=f.s.shot.kind;
    const ok = k==="lob" ? (d>150&&d<300) : d>f.s.reach*0.95;
    // 斬れる間合いに入りかけているなら撃たない（撃ち終わりに斬られる）
    const keepMelee = f.atk>=1 && d < f.s.reach*1.7;
    if(ok&&!keepMelee&&rnd()<pf.shot){ f.sht=0;f.st="cast";f.t=0;f.cast=0; return; }
  }
  if(f.atk>=1&&facing(f,o)){
    const rel=(o.st==="walk"&&!facing(o,f))? f.s.speed-o.s.speed : f.s.speed+o.s.speed;
    const tta=(d-f.s.reach*0.82)/Math.max(20,rel);
    if(tta<=f.s.windup+0.05&&tta>-0.10){ f.atk=0;f.st="windup";f.t=0;f.hit=0; }
  }
}
function res(a,b){
  if(a.st!=="active"||a.hit) return;
  if(Math.abs(a.x-b.x)>a.s.reach||!facing(a,b)) return;
  a.hit=1; const kb=Math.sign(b.x-a.x)*R.knockback;
  if(b.st==="guard"){
    if(b.t<=b.s.parryWindow){ a.st="stun";a.t=0;
      if(b.s.reflect) a.hp=Math.max(0,a.hp-b.s.reflect);
      if(b.s.parryRefund) b.atk=1;
    } else { b.hp=Math.max(0,b.hp-Math.min(a.s.dmg*R.blockChip,R.chipCap)); }
    return;
  }
  b.hp=Math.max(0,b.hp-a.s.dmg*a.dmgScale); b.st="hurt"; b.t=0; b.hurtLim=R.hurtTime;
  b.x=Math.max(R.wallL,Math.min(R.wallR,b.x+kb));
  if(a.s.poison){ b.poi=a.s.poison.dur; b.pdps=a.s.poison.dps; }
}
function shotHit(sh,f){
  sh.dead=1; const S=sh.s;
  if(f.st==="guard"){
    // 受け切ると防御ゲージが一部戻る＝弾の連射で防御を枯らせない
    if(f.t<=f.s.parryWindow){ f.grd=Math.min(1,f.grd+R.shotParryRefund); return; }
    f.hp=Math.max(0,f.hp-Math.min(S.dmg*R.blockChip,R.chipCap));
    f.grd=Math.min(1,f.grd+R.shotBlockRefund);
    return;
  }
  f.hp=Math.max(0,f.hp-S.dmg*sh.o.dmgScale); f.st="hurt"; f.t=0; f.hurtLim=R.shotHurt;
  f.x=Math.max(R.wallL,Math.min(R.wallR,f.x+Math.sign(sh.vx||sh.dir)*R.shotKnock));
  if(S.poison){ f.poi=S.poison.dur; f.pdps=S.poison.dps; }
}
function updShots(shots,a,b){
  for(const sh of shots){
    if(sh.dead) continue;
    const S=sh.s;
    sh.t+=DT;
    if(S.kind==="lob"){ sh.vy+=R.gravity*DT; sh.dy+=sh.vy*DT; }
    else if(S.kind==="wave"){ sh.dy=R.muzzleY+Math.sin(sh.t*S.freq)*S.amp; }
    else if(S.kind==="mist"){ sh.vx*=Math.pow(0.30,DT); sh.dy-=5*DT; }
    sh.x+=sh.vx*DT;
    if(sh.t>=S.life||sh.x<R.wallL-16||sh.x>R.wallR+16||sh.dy>-3){ sh.dead=1; continue; }
    for(const f of [a,b]){
      if(f===sh.o) continue;
      if(Math.abs(sh.x-f.x)<R.hitHalfW+S.r*0.5 && sh.dy>R.hitTop && sh.dy<R.hitBot){ shotHit(sh,f); break; }
    }
  }
  for(let i=0;i<shots.length;i++) for(let j=i+1;j<shots.length;j++){
    const p=shots[i],q=shots[j];
    if(p.dead||q.dead||p.o===q.o) continue;
    if(Math.abs(p.x-q.x)<p.s.r+q.s.r&&Math.abs(p.dy-q.dy)<p.s.r+q.s.r){ p.dead=q.dead=1; }
  }
  return shots.filter(s=>!s.dead);
}
function fight(A,B,pa=PROF10,pb=PROF10,flip=false){
  const a=mk(A,flip?R.wallR-80:R.wallL+80,flip?-1:1,pa.dmg),
        b=mk(B,flip?R.wallL+80:R.wallR-80,flip?1:-1,pb.dmg);
  a.hp*=pa.hp; b.hp*=pb.hp;
  let T=R.roundTime, shots=[];
  while(T>0&&a.hp>0&&b.hp>0){
    T-=DT; ai(a,b,shots,pa); ai(b,a,shots,pb); upd(a,shots); upd(b,shots);
    const d=Math.abs(a.x-b.x);
    if(d<R.bodyGap){ const s=Math.sign(a.x-b.x)||1;
      if(a.st==="walk")a.dir=s; if(b.st==="walk")b.dir=-s; a.x+=s*1.6; b.x-=s*1.6; }
    res(a,b); res(b,a);
    shots=updShots(shots,a,b);
  }
  const ra=a.hp/(A.hp*pa.hp), rb=b.hp/(B.hp*pb.hp);
  return ra>rb?1:ra<rb?-1:0;
}

function table(N, log=console.log){
  reseed(20260815);
  const rows=[], avgs=[];
  for(const A of S){
    let row=A.id.padEnd(12), tot=0, n=0;
    for(const B of S){
      let w=0; for(let i=0;i<N;i++){ const r=fight(A,B,PROF10,PROF10,i%2===1); if(r>0)w++; else if(r===0)w+=.5; }
      const p=w/N*100; row+=(p.toFixed(0)+"%").padEnd(10);
      if(A!==B){tot+=p;n++;}
    }
    rows.push(row+"  "+(tot/n).toFixed(1)+"%"); avgs.push([A.id,tot/n]);
  }
  return {rows, avgs};
}
module.exports={S,R,fight,table,reseed,cpuProfile,PROF10};

if(require.main!==module) return;

if(process.argv[2]==="levels"){
  // 各レベルのCPUが Lv.10 のCPU相手にどれだけ勝てるか（全キャラ平均）
  reseed(20260815);
  console.log("Lv.N の敵 vs Lv.10 の敵（同キャラ同士・各120戦）\n");
  for(const lv of [1,2,3,4,5,6,8,10,12,15,20]){
    const pf=cpuProfile(lv);
    let w=0,n=0;
    for(const A of S){ for(let i=0;i<120;i++){ const r=fight(A,A,pf,PROF10,i%2===1); if(r>0)w++; else if(r===0)w+=.5; n++; } }
    const p=w/n*100;
    console.log(("Lv."+lv).padEnd(6)+ (p.toFixed(1)+"%").padStart(7) + "  " +
      "█".repeat(Math.round(p/2)) );
  }
  return;
}

const N=300;
console.log("行 = 自分 / 列 = 相手 (勝率%)  N="+N+"/組\n");
process.stdout.write("            "+S.map(s=>s.id.padEnd(10)).join("")+"  平均\n");
const {rows,avgs}=table(N);
rows.forEach(r=>console.log(r));
console.log("\n--- 同キャラを除いた平均勝率（50%に近いほど均衡）---");
avgs.sort((x,y)=>y[1]-x[1]).forEach(([n,v])=>console.log(n.padEnd(12)+v.toFixed(1)+"%"));
