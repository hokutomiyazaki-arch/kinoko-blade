/* 総当たりCPU対戦で相性表を出す。 node tools/balance-sim.js
   index.html の数値を変えたらここも同じ値に合わせて回す。 */
const S=[
 {id:"シイタケ",hp:104,speed:105,dmg:16,reach:134,atkGauge:2.0,guardGauge:1.2,windup:.26,active:.14,recover:.32,guardTime:.70,parryWindow:.20},
 {id:"エノキ",hp:88,speed:165,dmg:13,reach:118,atkGauge:1.1,guardGauge:0.9,windup:.14,active:.10,recover:.20,guardTime:.52,parryWindow:.19},
 {id:"ベニテング",hp:70,speed:62,dmg:23,reach:136,atkGauge:3.2,guardGauge:2.6,windup:.46,active:.18,recover:.56,guardTime:.62,parryWindow:.14,poison:{dps:1.5,dur:6}},
 {id:"マイタケ",hp:132,speed:70,dmg:15,reach:122,atkGauge:2.8,guardGauge:1.05,windup:.32,active:.15,recover:.40,guardTime:.90,parryWindow:.22,reflect:6},
 {id:"マツタケ",hp:74,speed:118,dmg:15,reach:126,atkGauge:2.8,guardGauge:2.4,windup:.20,active:.12,recover:.30,guardTime:.56,parryWindow:.24,parryRefund:1},
];
const R={wallL:44,wallR:596,bodyGap:62,blockChip:.35,chipCap:5,parryStun:.65,hurtTime:.25,knockback:26,roundTime:90,react:.22};
const DT=1/60;

function mk(s,x,d){return{s,x,dir:d,hp:s.hp,atk:0,grd:0,st:"walk",t:0,hit:0,poi:0,pdps:0,timer:0};}
function facing(a,b){return Math.sign(b.x-a.x)===a.dir;}

function upd(f){
  f.t+=DT;
  if(f.poi>0){f.poi-=DT;f.hp=Math.max(0,f.hp-f.pdps*DT);}
  const s=f.s;
  if(f.st==="walk"){
    f.atk=Math.min(1,f.atk+DT/s.atkGauge); f.grd=Math.min(1,f.grd+DT/s.guardGauge);
    f.x+=f.dir*s.speed*DT;
    if(f.x<=R.wallL){f.x=R.wallL;f.dir=1;} if(f.x>=R.wallR){f.x=R.wallR;f.dir=-1;}
  } else if(f.st==="windup"){ if(f.t>=s.windup){f.st="active";f.t=0;} }
  else if(f.st==="active"){ if(f.t>=s.active){f.st="recover";f.t=0;} }
  else if(f.st==="recover"){ if(f.t>=s.recover){f.st="walk";f.t=0;} }
  else if(f.st==="guard"){ if(f.t>=s.guardTime){f.st="walk";f.t=0;} }
  else { const lim=f.st==="stun"?R.parryStun:R.hurtTime; if(f.t>=lim){f.st="walk";f.t=0;} }
}
function ai(f,o,skill){
  f.timer-=DT; if(f.st!=="walk"||f.timer>0) return;
  f.timer=R.react*(0.7+Math.random()*0.6)/skill;
  const d=Math.abs(o.x-f.x);
  if(o.st==="windup"&&f.grd>=1&&d<o.s.reach+60){
    if(o.s.windup-o.t < f.s.parryWindow*0.9+0.06 && Math.random()<0.72){ f.grd=0;f.st="guard";f.t=0; return; }
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
  b.hp=Math.max(0,b.hp-a.s.dmg); b.st="hurt"; b.t=0;
  b.x=Math.max(R.wallL,Math.min(R.wallR,b.x+kb));
  if(a.s.poison){ b.poi=a.s.poison.dur; b.pdps=a.s.poison.dps; }
}
function fight(A,B,sa=1,sb=1,flip=false){
  const a=mk(A,flip?440:200,flip?-1:1), b=mk(B,flip?200:440,flip?1:-1); let T=R.roundTime;
  while(T>0&&a.hp>0&&b.hp>0){
    T-=DT; ai(a,b,sa); ai(b,a,sb); upd(a); upd(b);
    const d=Math.abs(a.x-b.x);
    if(d<R.bodyGap){ const s=Math.sign(a.x-b.x)||1;
      if(a.st==="walk")a.dir=s; if(b.st==="walk")b.dir=-s; a.x+=s*1.6; b.x-=s*1.6; }
    res(a,b); res(b,a);
  }
  const ra=a.hp/A.hp, rb=b.hp/B.hp;
  return ra>rb?1:ra<rb?-1:0;
}

const N=300;
console.log("行 = 自分 / 列 = 相手 (勝率%)  N="+N+"/組\n");
process.stdout.write("            "+S.map(s=>s.id.padEnd(10)).join("")+"  平均\n");
const avgs=[];
for(const A of S){
  let row=A.id.padEnd(12), tot=0, n=0;
  for(const B of S){
    let w=0; for(let i=0;i<N;i++){ const r=fight(A,B,1,1,i%2===1); if(r>0)w++; else if(r===0)w+=.5; }
    const p=w/N*100; row+=(p.toFixed(0)+"%").padEnd(10);
    if(A!==B){tot+=p;n++;}
  }
  avgs.push([A.id,tot/n]);
  console.log(row+"  "+(tot/n).toFixed(1)+"%");
}
console.log("\n--- 同キャラを除いた平均勝率（50%に近いほど均衡）---");
avgs.sort((x,y)=>y[1]-x[1]).forEach(([n,v])=>console.log(n.padEnd(12)+v.toFixed(1)+"%"));
