const D=window.REVENUE_DATA;
const companies=Object.keys(D.series);
const colors={"한빛테크":"#62e3d2","미래솔루션":"#5bbcff","새봄산업":"#ffbd6b"};
let selected=new Set(companies),year="all";
const $=s=>document.querySelector(s);
const fmt=n=>n.toLocaleString("ko-KR",{minimumFractionDigits:1,maximumFractionDigits:1});
const sum=a=>a.reduce((x,y)=>x+y,0);
const avg=a=>sum(a)/a.length;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function indices(){return D.dates.map((d,i)=>({d,i})).filter(x=>year==="all"||x.d.startsWith(year));}
function values(c){return indices().map(x=>D.series[c][x.i]);}
function annual(c,y){return sum(D.dates.reduce((a,d,i)=>(d.startsWith(y)&&a.push(D.series[c][i]),a),[]));}

function init(){
  $("#companyFilters").innerHTML=companies.map(c=>`<label class="chip"><input type="checkbox" value="${c}" checked><span style="--chip:${colors[c]}">${c}</span></label>`).join("");
  $("#companyFilters").addEventListener("change",e=>{const c=e.target.value;e.target.checked?selected.add(c):selected.delete(c);if(!selected.size){e.target.checked=true;selected.add(c)}render()});
  $("#yearFilter").addEventListener("change",e=>{year=e.target.value;render()});
  $("#csvBtn").addEventListener("click",downloadCsv);
  render();
}

function render(){renderKpis();renderLine();renderAnnual();renderSeason();renderInsights();renderTable()}

function renderKpis(){
  const cs=[...selected], all=cs.flatMap(values), total=sum(all), latest=avg(cs.map(c=>values(c).at(-1)));
  const start=avg(cs.map(c=>values(c)[0])), growth=(latest/start-1)*100;
  const best=cs.map(c=>({c,v:sum(values(c))})).sort((a,b)=>b.v-a.v)[0];
  const peak=indices().map(x=>({d:x.d,v:sum(cs.map(c=>D.series[c][x.i]))})).sort((a,b)=>b.v-a.v)[0];
  $("#kpis").innerHTML=`
  <article class="kpi" style="--glow:#62e3d2"><small>선택 기간 총매출</small><strong>${fmt(total)}억</strong><span class="delta">${indices().length}개월 합계</span></article>
  <article class="kpi" style="--glow:#5bbcff"><small>최근 월 평균</small><strong>${fmt(latest)}억</strong><span class="delta ${growth<0?'down':''}">${growth>=0?'+':''}${growth.toFixed(1)}% · 기간 첫 달 대비</span></article>
  <article class="kpi" style="--glow:#ffbd6b"><small>누적 매출 1위</small><strong>${best.c}</strong><span class="delta">${fmt(best.v)}억원</span></article>
  <article class="kpi" style="--glow:#ff7f8e"><small>합산 최고 월</small><strong>${peak.d.replace('-', '.')}</strong><span class="delta">${fmt(peak.v)}억원</span></article>`;
}

function svgBase(w,h,p={l:45,r:18,t:16,b:32}){return{w,h,p,iw:w-p.l-p.r,ih:h-p.t-p.b}}
function renderLine(){
  const ix=indices(),cs=[...selected],all=cs.flatMap(c=>ix.map(x=>D.series[c][x.i]));
  const {w,h,p,iw,ih}=svgBase(800,335),lo=Math.floor(Math.min(...all)-1),hi=Math.ceil(Math.max(...all)+1),x=i=>p.l+(i/Math.max(1,ix.length-1))*iw,y=v=>p.t+(hi-v)/(hi-lo)*ih;
  let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;
  for(let k=0;k<5;k++){const v=lo+(hi-lo)*k/4,yy=y(v);s+=`<line class="gridline" x1="${p.l}" y1="${yy}" x2="${w-p.r}" y2="${yy}"/><text x="${p.l-8}" y="${yy+4}" text-anchor="end">${v.toFixed(0)}</text>`}
  const step=Math.max(1,Math.ceil(ix.length/7));ix.forEach((q,i)=>{if(i%step===0||i===ix.length-1)s+=`<text x="${x(i)}" y="${h-8}" text-anchor="middle">${q.d.slice(2).replace('-', '.')}</text>`});
  cs.forEach(c=>{const pts=ix.map((q,i)=>`${x(i)},${y(D.series[c][q.i])}`).join(' ');s+=`<polyline points="${pts}" fill="none" stroke="${colors[c]}" stroke-width="3" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`;ix.forEach((q,i)=>{if(ix.length<=12)s+=`<circle cx="${x(i)}" cy="${y(D.series[c][q.i])}" r="3" fill="${colors[c]}"><title>${c} ${q.d}: ${D.series[c][q.i]}억원</title></circle>`})});
  $("#lineChart").innerHTML=s+"</svg>";
  $("#legend").innerHTML=cs.map(c=>`<span><i style="background:${colors[c]}"></i>${c}</span>`).join("");
}

function renderAnnual(){
  const years=year==="all"?["2021","2022","2023","2024","2025"]:[year],cs=[...selected],vals=years.flatMap(y=>cs.map(c=>annual(c,y))),max=Math.max(...vals)*1.15;
  const {w,h,p,iw,ih}=svgBase(650,255,{l:40,r:10,t:12,b:34}),group=iw/years.length,bw=Math.min(28,(group-20)/cs.length);
  let s=`<svg viewBox="0 0 ${w} ${h}">`;
  [0,.5,1].forEach(t=>{const yy=p.t+ih*(1-t);s+=`<line class="gridline" x1="${p.l}" y1="${yy}" x2="${w-p.r}" y2="${yy}"/><text x="${p.l-7}" y="${yy+4}" text-anchor="end">${Math.round(max*t)}</text>`});
  years.forEach((yr,yi)=>{const gx=p.l+group*yi+group/2;s+=`<text x="${gx}" y="${h-9}" text-anchor="middle">${yr}</text>`;cs.forEach((c,ci)=>{const v=annual(c,yr),bh=v/max*ih,bx=gx-(bw*cs.length)/2+ci*bw;s+=`<rect x="${bx}" y="${p.t+ih-bh}" width="${Math.max(4,bw-3)}" height="${bh}" rx="3" fill="${colors[c]}"><title>${yr} ${c}: ${fmt(v)}억원</title></rect>`})});
  $("#barChart").innerHTML=s+"</svg>";
}

function renderSeason(){
  const cs=[...selected],m=Array.from({length:12},(_,i)=>avg(cs.flatMap(c=>D.series[c].filter((_,j)=>j%12===i)))),max=Math.max(...m)*1.12,min=Math.min(...m)*.9;
  const {w,h,p,iw,ih}=svgBase(650,255,{l:40,r:10,t:12,b:34}),bw=iw/12-7,y=v=>p.t+(max-v)/(max-min)*ih;
  let s=`<svg viewBox="0 0 ${w} ${h}"><line class="gridline" x1="${p.l}" y1="${p.t+ih}" x2="${w-p.r}" y2="${p.t+ih}"/>`;
  m.forEach((v,i)=>{const x=p.l+i*iw/12+3.5,bh=p.t+ih-y(v);s+=`<rect x="${x}" y="${y(v)}" width="${bw}" height="${bh}" rx="4" fill="${i===m.indexOf(Math.max(...m))?'#62e3d2':'#29445a'}"><title>${i+1}월 평균: ${fmt(v)}억원</title></rect><text x="${x+bw/2}" y="${h-9}" text-anchor="middle">${i+1}</text>`});
  $("#seasonChart").innerHTML=s+"</svg>";
}

function renderInsights(){
  const cs=[...selected],lastYear=year==="all"?"2025":year,prev=String(+lastYear-1);
  const ranks=cs.map(c=>{const before=annual(c,prev);return{c,v:annual(c,lastYear),g:before?(annual(c,lastYear)/before-1)*100:null}}).sort((a,b)=>b.v-a.v);
  const fastest=ranks[0].g===null?null:[...ranks].sort((a,b)=>b.g-a.g)[0];
  const monthAvg=Array.from({length:12},(_,i)=>avg(cs.flatMap(c=>D.series[c].filter((_,j)=>j%12===i))));
  const peak=monthAvg.indexOf(Math.max(...monthAvg))+1,low=monthAvg.indexOf(Math.min(...monthAvg))+1;
  const volatility=cs.map(c=>{const a=values(c),mu=avg(a);return{c,cv:Math.sqrt(avg(a.map(v=>(v-mu)**2)))/mu}}).sort((a,b)=>a.cv-b.cv)[0];
  const growthCopy=fastest?`${fastest.c}가 ${fastest.g>=0?'+':''}${fastest.g.toFixed(1)}%를 기록했습니다.`:"2021년은 이전 연도 데이터가 없어 성장률을 계산하지 않았습니다.";
  $("#insights").innerHTML=`<div class="insight"><strong>${lastYear}년 매출 선두는 <span class="num">${ranks[0].c}</span></strong><p>${fmt(ranks[0].v)}억원으로 선택 기업 중 가장 높습니다.</p></div><div class="insight"><strong>${fastest?'가장 빠른 전년 대비 성장':'성장률 기준'}</strong><p>${growthCopy}</p></div><div class="insight"><strong>뚜렷한 연말 계절성</strong><p>평균 매출은 ${peak}월에 가장 높고 ${low}월에 가장 낮습니다.</p></div><div class="insight"><strong>가장 안정적인 흐름</strong><p>${volatility.c}의 월별 변동 폭이 선택 기업 중 가장 작습니다.</p></div>`;
}

function renderTable(){
  const cs=[...selected],ix=indices();
  $("#tableHead").innerHTML=`<tr><th>기준월</th>${cs.map(c=>`<th>${c} (억원)</th>`).join('')}<th>합계</th></tr>`;
  $("#tableBody").innerHTML=[...ix].reverse().map(q=>`<tr><td>${q.d}</td>${cs.map(c=>`<td>${D.series[c][q.i].toFixed(2)}</td>`).join('')}<td>${sum(cs.map(c=>D.series[c][q.i])).toFixed(2)}</td></tr>`).join('');
}

function downloadCsv(){
  const cs=[...selected],rows=[["기준월",...cs.map(c=>`${c} 매출(억원)`),"합계(억원)"]];
  indices().forEach(q=>rows.push([q.d,...cs.map(c=>D.series[c][q.i]),sum(cs.map(c=>D.series[c][q.i])).toFixed(2)]));
  const blob=new Blob(["\ufeff"+rows.map(r=>r.join(",")).join("\n")],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`매출분석_${year}.csv`;a.click();URL.revokeObjectURL(a.href);
}
init();
