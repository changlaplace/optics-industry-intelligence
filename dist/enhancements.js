(() => {
  const locations = {
    Apple: [37.3349, -122.0090], Meta: [37.4848, -122.1484], Google: [37.4220, -122.0841], Microsoft: [47.6739, -122.1215], NVIDIA: [37.3702, -121.9530], Amazon: [47.6225, -122.3365], Snap: [34.0195, -118.4912], KLA: [37.4200, -121.8980], 'Applied Materials': [37.3712, -121.9150], Coherent: [40.5680, -79.7970], Lumentum: [37.3382, -121.8863], Luminar: [28.5383, -81.3792], Lightmatter: [37.3861, -122.0839], Lightelligence: [42.3601, -71.0589], 'Ayar Labs': [37.3382, -121.8863], PsiQuantum: [37.4419, -122.1430], 'Magic Leap': [26.1601, -80.1714], Anduril: [33.6411, -117.9187], Nuburu: [39.5800, -104.8772], Hyperlight: [42.3736, -71.1097], 'Photonics.com': [42.4501, -73.2454]
  };
  const favicon = (url) => { try { return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(new URL(url).origin)}`; } catch { return ''; } };
  function decorateLinks(root = document) {
    root.querySelectorAll('a[href]').forEach((link) => {
      if (link.querySelector('.source-icon')) return;
      const href = link.getAttribute('href'); let url = link.href;
      const companyRoute = href.startsWith('#/company/');
      if (companyRoute) { const company = D.companies.find((entry) => slug(entry[0]) === href.split('/').pop()); if (company) url = company[5]; }
      if (!companyRoute && new URL(url).origin === location.origin) return;
      if (!/^https?:/.test(url)) return;
      const image = document.createElement('img'); image.className = 'source-icon'; image.src = favicon(url); image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; link.prepend(image);
    });
  }
  function addCompanyMap() {
    const directory = document.querySelector('.directory'); if (!directory || !window.L) return;
    const section = document.createElement('section'); section.className = 'section map-section';
    section.innerHTML = '<div class="section-head"><div><h2 class="section-title">North American company map</h2><p class="meta">Primary public headquarters or operating location for the initial directory.</p></div><span class="meta">Location-linked records</span></div><div id="company-map" class="company-map" aria-label="Map of companies in the directory"></div><p class="map-caption">North America is the default view. Companies outside this view retain their location in the directory.</p>';
    directory.before(section);
    const map = L.map('company-map', { scrollWheelZoom: false }).setView([39.5, -98.35], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    D.companies.forEach((company) => { const point = locations[company[0]]; if (!point) return; const marker = L.marker(point, { icon: L.icon({ iconUrl: favicon(company[5]), iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] }) }).addTo(map); marker.bindPopup(`<strong>${company[0]}</strong>${company[1]}<br><a href="#/company/${slug(company[0])}">Open company profile</a>`); });
  }
  const originalCompanies = window.companies;
  window.companies = () => { originalCompanies(); addCompanyMap(); decorateLinks(); };
  const originalCompany = window.company;
  window.company = (name) => {
    originalCompany(name); const record = D.companies.find((entry) => slug(entry[0]) === name); const top = document.querySelector('.company-page-top > div');
    if (record && top && !top.querySelector('.company-location')) top.insertAdjacentHTML('beforeend', `<p class="company-location meta"><b>Primary location:</b> ${record[1]} &middot; <a href="https://www.openstreetmap.org/?mlat=${locations[record[0]]?.[0] || ''}&mlon=${locations[record[0]]?.[1] || ''}" target="_blank" rel="noreferrer">Map source</a></p>`);
    decorateLinks();
  };
  const profiles = Object.fromEntries(D.people.map((person) => [person[0], { current: [{ organization: person[1], role: person[2] }], previous: [], education: [], sources: [] }]));
  function peopleCard(person) {
    const profile = profiles[person[0]], current = profile.current.map((entry) => `${entry.organization} — ${entry.role}`).join('; '), previous = profile.previous.length ? profile.previous.map((entry) => entry.organization).join(', ') : 'Not yet source-verified', education = profile.education.length ? profile.education.map((entry) => entry.institution).join(', ') : 'Not yet source-verified';
    const href = D.companies.some((company) => company[0] === person[1]) ? `#/company/${slug(person[1])}` : '#/people';
    return `<a class="person-card" href="${href}"><div class="avatar">${person[0].split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><h3>${person[0]}</h3><p>${person[1]}</p><span class="tag yellow">${person[2]}</span><div class="bio-facts"><span><b>Current:</b> ${current}</span><span><b>Previous:</b> ${previous}</span><span><b>Education:</b> ${education}</span></div></a>`;
  }
  const affiliationLocations = {
    'Harvard University': [42.3770, -71.1167], 'Stanford University': [37.4275, -122.1697], 'University of Washington': [47.6553, -122.3035],
    'UC Santa Barbara': [34.4140, -119.8489], 'Columbia University': [40.8075, -73.9626], UCLA: [34.0689, -118.4452], NVIDIA: [37.3702, -121.9530],
    Google: [37.4220, -122.0841], 'Ayar Labs': [37.3382, -121.8863], Lightmatter: [37.3861, -122.0839], PsiQuantum: [37.4419, -122.1430],
    ASML: [41.1212, -73.4085], ZEISS: [40.7330, -74.1724], 'Magic Leap': [26.1601, -80.1714], 'Purdue University': [40.4237, -86.9212],
    'University of Pennsylvania': [39.9522, -75.1932], 'UC Berkeley': [37.8719, -122.2585], 'University of Toronto': [43.6629, -79.3957], MIT: [42.3601, -71.0942]
  };
  function addPeopleMap() {
    const firstSection = app.querySelector('.section'); if (!firstSection || !window.L) return;
    const section = document.createElement('section'); section.className = 'section';
    section.innerHTML = '<div class="section-head"><div><h2 class="section-title">Public affiliation map</h2><p class="meta">Institutions and organizations represented in the people index.</p></div><span class="meta">No personal locations</span></div><div id="people-map" class="company-map people-map" aria-label="Map of public professional affiliations"></div><p class="people-map-note">Markers reflect public organizational affiliation only, not individual location or private information.</p>';
    firstSection.before(section);
    const map = L.map('people-map', { scrollWheelZoom: false }).setView([39.7, -99.2], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const groups = new Map();
    D.people.forEach((person) => { if (!affiliationLocations[person[1]]) return; groups.set(person[1], [...(groups.get(person[1]) || []), person[0]]); });
    groups.forEach((names, organization) => {
      const marker = L.circleMarker(affiliationLocations[organization], { radius: Math.min(11, 6 + names.length), color: '#126b70', weight: 2, fillColor: '#16a5a6', fillOpacity: .86 }).addTo(map);
      marker.bindPopup(`<strong>${organization}</strong>${names.join('<br>')}`);
    });
  }
  const originalPeople = window.people;
  window.people = () => { originalPeople(); addPeopleMap(); const list = document.querySelector('.people-list'); if (list) list.innerHTML = D.people.map(peopleCard).join(''); decorateLinks(); };
  function sourceDirectory() {
    const entries = new Map();
    D.companies.forEach((company) => entries.set(company[5], { label: `${company[0]} careers`, url: company[5] }));
    D.news.forEach((news) => { if (!entries.has(news[4])) entries.set(news[4], { label: new URL(news[4]).hostname.replace('www.', ''), url: news[4] }); });
    entries.set('https://www.linkedin.com/', { label: 'linkedin.com', url: 'https://www.linkedin.com/' });
    return [...entries.values()].sort((a, b) => a.label.localeCompare(b.label));
  }
  function sourceEntries() { return sourceDirectory().map((source) => `<a class="source-entry" href="${source.url}" target="_blank" rel="noreferrer"><span>${source.label}</span></a>`).join(''); }
  function learningBlogs() {
    const reading = [
      ['RP Photonics Encyclopedia', 'A technical reference for laser, fiber, and photonics concepts.', 'https://www.rp-photonics.com/encyclopedia.html'],
      ['Edmund Optics Knowledge Center', 'Practical optics and imaging learning resources.', 'https://www.edmundoptics.com/knowledge-center/'],
      ['Optica Publishing Group', 'Research and review articles across optics and photonics.', 'https://opg.optica.org/']
    ];
    app.innerHTML = `${header('Blogs', 'A small reading shelf for learning optics, imaging, photonics, and engineering foundations.')}<section class="news-list">${reading.map((item) => `<a class="blog-row" href="${item[2]}" target="_blank" rel="noreferrer"><div class="blog-date">Reading<br><strong>Link</strong></div><div><h3>${item[0]}</h3><p>${item[1]}</p><span class="tag">Learning resource</span></div><div class="blog-source">Open source &rarr;</div></a>`).join('')}</section>`;
    decorateLinks();
  }
  function industryNews() {
    app.innerHTML = `${header('News', 'A chronological, link-first index of optics technology, company, and industry sources.')}<div class="filters"><button class="filter active" onclick="filterNews('')">All sources</button>${D.technologies.slice(0, 7).map((technology) => `<button class="filter" onclick="filterNews('${technology}')">${technology}</button>`).join('')}</div><section id="news-list" class="news-list">${D.news.map((news) => `<a class="blog-row" href="${news[4]}" target="_blank" rel="noreferrer"><div class="blog-date">Indexed<br><strong>${news[2]}</strong></div><div><h3>${news[0]}</h3><p>${news[1]}. This index stores the source link and a short descriptor, not the article body.</p><span class="tag">${news[3]}</span></div><div class="blog-source">${new URL(news[4]).hostname.replace('www.', '')}<br>Open source &rarr;</div></a>`).join('')}</section>`;
    decorateLinks();
  }
  window.filterNews = (query) => { const list = document.querySelector('#news-list'); if (!list) return; list.innerHTML = D.news.filter((news) => !query || news.join('|').toLowerCase().includes(query.toLowerCase())).map((news) => `<a class="blog-row" href="${news[4]}" target="_blank" rel="noreferrer"><div class="blog-date">Indexed<br><strong>${news[2]}</strong></div><div><h3>${news[0]}</h3><p>${news[1]}. This index stores the source link and a short descriptor, not the article body.</p><span class="tag">${news[3]}</span></div><div class="blog-source">${new URL(news[4]).hostname.replace('www.', '')}<br>Open source &rarr;</div></a>`).join(''); decorateLinks(list); };
  window.news = industryNews;
  window.blogs = learningBlogs;
  async function loadRequestedSources() {
    const target = document.querySelector('#requested-sources'); if (!target) return;
    try {
      const response = await fetch('https://api.github.com/repos/changlaplace/optics-industry-intelligence/issues?state=open&per_page=50');
      if (!response.ok) throw new Error('Request queue unavailable');
      const items = (await response.json()).filter((item) => item.title.startsWith('[Source / '));
      target.innerHTML = items.length ? items.map((item) => `<a class="requested-item" href="${item.html_url}" target="_blank" rel="noreferrer"><strong>${item.title}</strong><small>Requested by ${item.user.login} · ${new Date(item.created_at).toLocaleDateString()}</small></a>`).join('') : '<p class="meta">No open source requests yet.</p>';
    } catch { target.innerHTML = '<p class="meta">The public request queue is available on GitHub.</p>'; }
  }
  function bindRequestForm() {
    const form = document.querySelector('#source-request-form'); if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault(); const data = new FormData(form), category = data.get('category'), url = data.get('url'), name = data.get('name');
      const destination = new URL('https://github.com/changlaplace/optics-industry-intelligence/issues/new');
      destination.searchParams.set('template', 'source-request.md'); destination.searchParams.set('title', `[Source / ${category}] ${url}`); destination.searchParams.set('body', `### Requested area\n${category}\n\n### Source URL\n${url}\n\n### Your name\n${name}\n\n### Why this link belongs in the index\n`);
      window.open(destination, '_blank', 'noopener');
    });
  }
  window.about = () => {
    app.innerHTML = `<div class="eyebrow">Optics Industry Intelligence / About this website</div><h1 class="page-title">About this website</h1><section class="about-grid"><div><details open><summary>Source directory (${sourceDirectory().length})</summary><div class="source-directory">${sourceEntries()}</div></details><details><summary>Requested sources</summary><div id="requested-sources" class="requested-list"><p class="meta">Loading public requests...</p></div></details><details open><summary>Request a source</summary><form id="source-request-form" class="request-form"><select name="category" aria-label="Requested area"><option>People</option><option>Company</option><option>Job</option><option>News</option><option>Blog</option></select><input name="name" required placeholder="Your name" aria-label="Your name" /><input name="url" type="url" required placeholder="Public source URL" aria-label="Public source URL" /><button type="submit">Open source request</button></form><p class="request-help">Requests are submitted as public GitHub issues. Your GitHub account is the visible requester identity.</p></details></div><aside class="motto"><div class="eyebrow" style="color:#76e2dc">Conviction</div><blockquote>In the AI era, career advantage comes from a clearer map of the world.</blockquote><p>Build context. Follow real signals. Move with the field.</p><p>Created by an independent optics observer. <a href="https://github.com/changlaplace" target="_blank" rel="noreferrer" style="color:#fff;text-decoration:underline">GitHub profile</a></p></aside></section>`;
    bindRequestForm(); loadRequestedSources(); decorateLinks();
  };
  function enhancedRouter() {
    const [route, id] = (location.hash.slice(2) || '').split('/');
    if (route === 'companies') return window.companies(); if (route === 'company') return window.company(id); if (route === 'people') return window.people(); if (route === 'about') return window.about(); if (route === 'blogs') return window.blogs(); if (route === 'jobs') return window.jobs(); if (route === 'news') return window.news(); if (route === 'market') return window.market(); if (route === 'sources') return window.about(); return window.home();
  }
  window.addEventListener('hashchange', enhancedRouter); new MutationObserver(() => decorateLinks()).observe(app, { childList: true, subtree: true }); enhancedRouter();
})();
