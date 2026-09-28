(() => {
  const locations = {
    Apple: [37.3349, -122.0090], Meta: [37.4848, -122.1484], Google: [37.4220, -122.0841], Microsoft: [47.6739, -122.1215], NVIDIA: [37.3702, -121.9530], Amazon: [47.6225, -122.3365], Snap: [34.0195, -118.4912], KLA: [37.4200, -121.8980], 'Applied Materials': [37.3712, -121.9150], Coherent: [40.5680, -79.7970], Lumentum: [37.3382, -121.8863], Luminar: [28.5383, -81.3792], Lightmatter: [37.3861, -122.0839], Lightelligence: [42.3601, -71.0589], 'Ayar Labs': [37.3382, -121.8863], PsiQuantum: [37.4419, -122.1430], 'Magic Leap': [26.1601, -80.1714], Anduril: [33.6411, -117.9187], Nuburu: [39.5800, -104.8772], Hyperlight: [42.3736, -71.1097], 'Photonics.com': [42.4501, -73.2454]
  };
  const favicon = (url) => { try { return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(new URL(url).origin)}`; } catch { return ''; } };
  function decorateLinks(root = document) {
    root.querySelectorAll('a[href]').forEach((link) => {
      if (link.querySelector('.source-icon')) return;
      let url = link.href;
      if (link.getAttribute('href').startsWith('#/company/')) { const company = D.companies.find((entry) => slug(entry[0]) === link.getAttribute('href').split('/').pop()); if (company) url = company[5]; }
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
  const originalPeople = window.people;
  window.people = () => { originalPeople(); const list = document.querySelector('.people-list'); if (list) list.innerHTML = D.people.map(peopleCard).join(''); decorateLinks(); };
  window.about = () => {
    app.innerHTML = `${header('About this page', 'A compact, source-linked intelligence index for the optics and photonics industry. It helps visitors notice changes, then go to the original source.')}<section class="about-grid"><div><details open><summary>What this site stores</summary><p>Entries contain compact metadata, a source URL, and observed dates where applicable. News articles, job descriptions, account cookies, and credentials are not copied into this database.</p></details><details><summary>Source stack and update order</summary><ol><li>Official company career pages, newsrooms, and corporate sites.</li><li>Public applicant-tracking portals such as Greenhouse, Lever, and Ashby where a public endpoint is available.</li><li>Public university, company bio, and academic profile pages for professional affiliations.</li><li>Industry reporting and professional platforms, including LinkedIn, for discovery and manual verification.</li></ol><p>LinkedIn is used only as a discovery or manual-review source. This project does not store login credentials or automate access to restricted content.</p></details><details><summary>How records become optics-specific</summary><p>An AI-assisted review filters source links for optics, photonics, imaging, lasers, sensing, lithography, quantum photonics, and closely related roles. It normalizes companies, technologies, locations, and dates, then preserves the source link. Uncertain facts are left blank until a public source supports them.</p></details><details><summary>People and relationship policy</summary><p>Person records reserve fields for current affiliations, prior roles, education, research areas, and evidence links. The public view only represents professional relationships with explicit public documentation; it does not infer private or social relationships.</p></details><details><summary>Maintaining the index</summary><p>The source registry is versioned in the repository so future update runs can follow the same provenance rules. See <a href="https://github.com/changlaplace/optics-industry-intelligence/blob/main/data/sources.json" target="_blank" rel="noreferrer">the source registry on GitHub</a>.</p></details></div><aside class="motto"><div class="eyebrow" style="color:#76e2dc">Conviction</div><blockquote>In the AI era, career advantage comes from a clearer map of the world.</blockquote><p>Build context. Follow real signals. Move with the field.</p><p>Created by an independent optics observer. <a href="https://github.com/changlaplace" target="_blank" rel="noreferrer" style="color:#fff;text-decoration:underline">GitHub profile</a></p></aside></section>`;
    decorateLinks();
  };
  function enhancedRouter() {
    const [route, id] = (location.hash.slice(2) || '').split('/');
    if (route === 'companies') return window.companies(); if (route === 'company') return window.company(id); if (route === 'people') return window.people(); if (route === 'about') return window.about(); if (route === 'blogs') return window.blogs(); if (route === 'jobs') return window.jobs(); if (route === 'news') return window.news(); if (route === 'market') return window.market(); if (route === 'sources') return window.sources(); return window.home();
  }
  window.addEventListener('hashchange', enhancedRouter); new MutationObserver(() => decorateLinks()).observe(app, { childList: true, subtree: true }); enhancedRouter();
})();
