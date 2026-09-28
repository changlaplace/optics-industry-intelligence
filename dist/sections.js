let selectedPeople=[];

function blogRow(n){
  const source=new URL(n[4]).hostname.replace('www.','');
  return `<a class="blog-row" href="${n[4]}" target="_blank" rel="noreferrer"><div class="blog-date">Indexed<br><strong>${n[2]}</strong></div><div><h3>${n[0]}</h3><p>${n[1]}. This index stores the source link and a short descriptor, not the article body.</p><span class="tag">${n[3]}</span></div><div class="blog-source">${source}<br>Open source &rarr;</div></a>`;
}

function blogs(){
  app.innerHTML=`${header('Blogs','A chronological, link-first index of optics technology, company, and industry sources. We store minimal metadata so visitors go directly to the original reporting.') }<div class="filters"><button class="filter active" onclick="filterBlogs('')">All sources</button>${D.technologies.slice(0,7).map(x=>`<button class="filter" onclick="filterBlogs('${x}')">${x}</button>`).join('')}</div><section id="blog-list" class="news-list">${D.news.map(blogRow).join('')}</section>`;
}
window.filterBlogs=q=>document.querySelector('#blog-list').innerHTML=D.news.filter(n=>!q||n.join('|').toLowerCase().includes(q.toLowerCase())).map(blogRow).join('');

function people(){
  app.innerHTML=`${header('People & Network','A lightweight index of public professional affiliations. Select up to four people to create a private, in-browser relationship view; no selection is stored or shared.') }<section class="section"><div class="private-note">This view is intentionally scoped to people you choose. Connections represent public organization or research-area metadata only, never inferred personal relationships.</div><h2 class="section-title" style="margin-top:22px">Select people to compare</h2><div class="person-picker" id="person-picker">${D.people.map((p,i)=>`<button class="person-choice" onclick="togglePerson(${i})">${p[0]}</button>`).join('')}</div><div id="network-output"></div></section><section class="section"><div class="section-head"><h2 class="section-title">People index</h2><span class="meta">Public professional metadata</span></div><div class="people-list">${D.people.map((p,i)=>`<a class="person-card" href="#/company/${slug(p[1])}" onclick="if(!D.companies.some(c=>c[0]==='${p[1]}')) return false"><div class="avatar">${p[0].split(' ').map(x=>x[0]).slice(0,2).join('')}</div><h3>${p[0]}</h3><p>${p[1]}</p><span class="tag yellow">${p[2]}</span><p class="meta">${p[3]}${D.companies.some(c=>c[0]===p[1])?' · Company profile ↗':''}</p></a>`).join('')}</div></section>`;
  renderNetwork();
}

window.togglePerson=i=>{
  selectedPeople=selectedPeople.includes(i)?selectedPeople.filter(x=>x!==i):selectedPeople.length<4?[...selectedPeople,i]:selectedPeople;
  document.querySelectorAll('.person-choice').forEach((el,index)=>el.classList.toggle('selected',selectedPeople.includes(index)));
  renderNetwork();
};

function renderNetwork(){
  const out=document.querySelector('#network-output'); if(!out) return;
  const persons=selectedPeople.map(i=>D.people[i]);
  if(!persons.length){out.innerHTML='<div class="network-empty">Choose one or more people above.<br><small>The network remains empty by default.</small></div>';return}
  const positions=[[12,48],[38,18],[68,25],[69,66]];
  const orgs=[...new Set(persons.map(p=>p[1]))];
  const orgNodes=orgs.map((o,i)=>`<div class="node institution" style="left:${Math.min(78,20+i*27)}%;top:72%">${esc(o).slice(0,9)}</div>`).join('');
  const personNodes=persons.map((p,i)=>`<div class="node" style="left:${positions[i][0]}%;top:${positions[i][1]}%" title="${esc(p[0])}">${p[0].split(' ').map(x=>x[0]).slice(0,2).join('')}</div>`).join('');
  const lines=persons.map((p,i)=>{const orgIndex=orgs.indexOf(p[1]);return `<line x1="${positions[i][0]+4}%" y1="${positions[i][1]+8}%" x2="${23+orgIndex*27}%" y2="76%" stroke="#5ba2a6" stroke-width="1.4"/>`}).join('');
  out.innerHTML=`<div class="graph"><svg>${lines}</svg>${personNodes}${orgNodes}</div><div class="network-legend"><span><i class="legend-dot"></i>Selected person</span><span><i class="legend-dot org"></i>Public organization affiliation</span><span>Visible only in this browser session</span></div>`;
}

function company(name){
  const c=D.companies.find(x=>slug(x[0])===name); if(!c){companies();return}
  const roles=D.jobs.filter(j=>j[1]===c[0]); const peopleAtCompany=D.people.filter(p=>p[1]===c[0]);
  app.innerHTML=`<section class="company-page-top"><div><div class="eyebrow">Company record / ${c[1]}</div><h1>${c[0]}</h1><p class="lede">${c[2]}. The company record connects technology, hiring signals, public people metadata, and primary sources.</p><div>${chips(c[3])}</div><p class="activity">${c[4]} hiring signal &middot; <a href="${c[5]}" target="_blank" style="text-decoration:underline">Official careers source</a></p></div><div class="metric-grid"><div class="metric"><b>${roles.length||'—'}</b><span>Role signals</span></div><div class="metric"><b>${peopleAtCompany.length||'—'}</b><span>People indexed</span></div><div class="metric"><b>Public</b><span>Source policy</span></div><div class="metric"><b>Link</b><span>Original source</span></div></div></section><section class="detail-grid"><div><article class="detail-box"><h2>Current role signals</h2>${roles.length?jobTable(roles):'<div class="empty">No individual role signal in the initial index. Use the official careers source for live availability.</div>'}</article><article class="detail-box" style="margin-top:18px"><h2>Related source index</h2><div class="news-list">${D.news.filter(n=>n[0].includes(c[0])||c[3].split('|').includes(n[3])).slice(0,5).map(blogRow).join('')||'<div class="empty">No linked source in the initial index.</div>'}</div></article></div><aside><article class="detail-box"><h2>People metadata</h2>${peopleAtCompany.length?peopleAtCompany.map(p=>`<a class="result" href="#/people"><strong>${p[0]}</strong><small>${p[2]} · ${p[3]}</small></a>`).join(''):'<p class="meta">No person record is attached yet. Future records require a public professional source.</p>'}</article><article class="detail-box" style="margin-top:18px"><h2>Technology footprint</h2>${c[3].split('|').map((t,i)=>`<div class="bar"><span>${t}</span><i style="width:${85-i*13}%"></i></div>`).join('')}</article></aside></section>`;
}

function router(){
  const p=location.hash.slice(2)||''; const [r,id]=p.split('/');
  ({companies,jobs,news:blogs,blogs,people,market,sources}[r]||(()=>r==='company'?company(id):home()))();
}

window.addEventListener('hashchange',router);
router();
