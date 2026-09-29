(() => {
  const exactCompanyLocations = {
    Apple: [37.3349, -122.0090], Meta: [37.4848, -122.1484], Google: [37.4220, -122.0841], Microsoft: [47.6739, -122.1215], NVIDIA: [37.3702, -121.9530], Amazon: [47.6225, -122.3365], Snap: [34.0195, -118.4912], KLA: [37.4200, -121.8980], 'Applied Materials': [37.3712, -121.9150], Coherent: [40.5680, -79.7970], Lumentum: [37.3382, -121.8863], Luminar: [28.5383, -81.3792], Lightmatter: [37.3861, -122.0839], Lightelligence: [42.3601, -71.0589], 'Ayar Labs': [37.3382, -121.8863], PsiQuantum: [37.4419, -122.1430], 'Magic Leap': [26.1601, -80.1714], Anduril: [33.6411, -117.9187], Nuburu: [39.5800, -104.8772], Hyperlight: [42.3736, -71.1097], 'Photonics.com': [42.4501, -73.2454], 'Texas Instruments': [32.7767, -96.7970]
  };
  const placeLocations = {
    'wuhan, china': [30.5928, 114.3055], 'shanghai, china': [31.2304, 121.4737], 'changchun, china': [43.8171, 125.3235],
    'shenzhen, china': [22.5431, 114.0579], 'guangzhou, china': [23.1291, 113.2644], 'hong kong': [22.3193, 114.1694],
    'beijing, china': [39.9042, 116.4074], 'hangzhou, china': [30.2741, 120.1551], 'suzhou, china': [31.2989, 120.5853],
    'cupertino, ca': [37.3230, -122.0322], 'menlo park, ca': [37.4530, -122.1817], 'mountain view, ca': [37.3861, -122.0839],
    'santa clara, ca': [37.3541, -121.9552], 'san jose, ca': [37.3382, -121.8863], 'milpitas, ca': [37.4323, -121.8996],
    'santa monica, ca': [34.0195, -118.4912], 'costa mesa, ca': [33.6411, -117.9187], 'irvine, ca': [33.6846, -117.8265],
    'seattle, wa': [47.6062, -122.3321], 'redmond, wa': [47.6740, -122.1215], 'boston, ma': [42.3601, -71.0589],
    'cambridge, ma': [42.3736, -71.1097], 'dallas, tx': [32.7767, -96.7970], 'orlando, fl': [28.5383, -81.3792],
    'plantation, fl': [26.1276, -80.2331], 'centennial, co': [39.5807, -104.8772], 'pittsfield, ma': [42.4501, -73.2454],
    'saxonburg, pa': [40.7509, -79.8100], 'palo alto, ca': [37.4419, -122.1430], 'barcelona, spain': [41.3874, 2.1686],
    'belfast, uk': [54.5973, -5.9301], 'besancon, france': [47.2378, 6.0241], 'copenhagen, denmark': [55.6761, 12.5683],
    'kongens lyngby, denmark': [55.7704, 12.5038], 'dortmund, germany': [51.5136, 7.4653], 'dublin, ireland': [53.3498, -6.2603],
    'gottingen, germany': [51.5413, 9.9158], 'munich, germany': [48.1351, 11.5820], 'oberkochen, germany': [48.7833, 10.1000],
    'veldhoven, netherlands': [51.4189, 5.4060],
    'vilnius, lithuania': [54.6872, 25.2797], 'moscow, russia': [55.7558, 37.6173], 'seoul, south korea': [37.5665, 126.9780],
    'tokyo, japan': [35.6762, 139.6503], 'singapore': [1.3521, 103.8198], 'auckland, new zealand': [-36.8509, 174.7645],
    'kingston upon hull, uk': [53.7676, -0.3274], 'china': [35.8617, 104.1954], 'taiwan': [23.6978, 120.9605],
    'japan': [36.2048, 138.2529], 'south korea': [35.9078, 127.7669], 'australia': [-25.2744, 133.7751],
    'canada': [56.1304, -106.3468], 'denmark': [56.2639, 9.5018], 'france': [46.2276, 2.2137], 'germany': [51.1657, 10.4515],
    'ireland': [53.1424, -7.6921], 'italy': [41.8719, 12.5674], 'lithuania': [55.1694, 23.8813], 'netherlands': [52.1326, 5.2913],
    'switzerland': [46.8182, 8.2275], 'uk': [55.3781, -3.4360], 'united states': [39.8283, -98.5795], 'usa': [39.8283, -98.5795],
    'california, usa': [36.7783, -119.4179], 'illinois, usa': [40.6331, -89.3985], 'michigan, usa': [44.3148, -85.6024],
    'pennsylvania, usa': [41.2033, -77.1945]
  };
  const normalizePlace = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const placeEntries = Object.entries(placeLocations).sort((a, b) => b[0].length - a[0].length);
  function companyPoint(company) {
    if (exactCompanyLocations[company[0]]) return exactCompanyLocations[company[0]];
    const location = normalizePlace(company[1] || '');
    const match = placeEntries.find(([place]) => location === place || location.includes(place));
    return match?.[1] || null;
  }
  const favicon = (url) => { try { return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(new URL(url).origin)}`; } catch { return ''; } };
  const companiesBySlug = new Map(D.companies.map((company) => [slug(company[0]), company]));
  function decorateLinks(root = document) {
    const links = root.matches?.('a[href]') ? [root, ...root.querySelectorAll('a[href]')] : [...root.querySelectorAll('a[href]')];
    links.forEach((link) => {
      if (link.querySelector('.source-icon')) return;
      const href = link.getAttribute('href'); let url = link.href;
      const companyRoute = href.startsWith('#/company/');
      if (companyRoute) { const company = companiesBySlug.get(href.split('/').pop()); if (company) url = company[5]; }
      if (!companyRoute && new URL(url).origin === location.origin) return;
      if (!/^https?:/.test(url)) return;
      const image = document.createElement('img'); image.className = 'source-icon'; image.src = favicon(url); image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; link.prepend(image);
    });
  }
  const marketMeta = (company) => D.company_meta?.[company[0]] || { tier: 'Emerging specialist', score: 2, basis: 'Focused optics or photonics market presence' };
  const footprintBadge = (company) => {
    const meta = marketMeta(company);
    return `<span class="footprint footprint-${meta.score}" title="${meta.basis}"><i>${meta.score}/5</i>${meta.tier}</span>`;
  };
  window.companyTile = (company) => `<a class="company-card" href="#/company/${slug(company[0])}"><div class="company-card-top"><div class="initial">${company[0][0]}</div>${footprintBadge(company)}</div><h3>${company[0]}</h3><p>${company[1]}</p><div>${chips(company[3])}</div><div class="activity">${company[4]}</div></a>`;
  window.companyCard = (company) => `<a class="card" href="#/company/${slug(company[0])}"><div class="card-kicker">${footprintBadge(company)}</div><h3 class="company-name">${company[0]}</h3><p class="meta">${company[1]} &middot; ${company[2]}</p><div>${chips(company[3])}</div><div class="activity">${company[4]} hiring signal</div></a>`;
  const kilometersBetween = (a, b) => {
    const radians = (value) => value * Math.PI / 180;
    const lat = radians(b[0] - a[0]), lon = radians(b[1] - a[1]);
    const value = Math.sin(lat / 2) ** 2 + Math.cos(radians(a[0])) * Math.cos(radians(b[0])) * Math.sin(lon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  };
  function clusterLocations(items, radiusKm = 170) {
    const clusters = [];
    items.forEach((item) => {
      let cluster = clusters.find((candidate) => kilometersBetween(candidate.point, item.point) <= radiusKm);
      if (!cluster) { cluster = { point: [...item.point], items: [] }; clusters.push(cluster); }
      cluster.items.push(item);
      cluster.point = [
        cluster.items.reduce((sum, entry) => sum + entry.point[0], 0) / cluster.items.length,
        cluster.items.reduce((sum, entry) => sum + entry.point[1], 0) / cluster.items.length,
      ];
    });
    return clusters;
  }
  function addClusterMarker(map, cluster, color, renderItem, panelId) {
    const count = cluster.items.length;
    const marker = L.circleMarker(cluster.point, {
      radius: Math.min(25, 7 + Math.sqrt(count) * 4.5), color, weight: 2,
      fillColor: color, fillOpacity: .82,
    }).addTo(map);
    const places = [...new Set(cluster.items.map((item) => item.location).filter(Boolean))];
    const heading = `${count} ${count === 1 ? 'record' : 'records'}${places.length ? ` near ${places.slice(0, 2).join(' / ')}` : ''}`;
    const list = cluster.items.sort((a, b) => a.name.localeCompare(b.name)).map(renderItem).join('');
    marker.bindTooltip(`<div class="cluster-tooltip"><strong>${heading}</strong><small>Select to show the complete list below the map.</small></div>`, { direction: 'top', opacity: .97, sticky: true });
    marker.on('click', () => {
      const panel = document.getElementById(panelId); if (!panel) return;
      panel.innerHTML = `<div class="map-selection-head"><span>Selected region</span><strong>${heading}</strong></div><div class="map-selection-list">${list}</div>`;
      panel.classList.add('active');
      decorateLinks(panel);
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  function addCompanyMap() {
    const directory = document.querySelector('.directory'); if (!directory || !window.L) return;
    const section = document.createElement('section'); section.className = 'section map-section';
    section.innerHTML = '<div class="section-head"><div><h2 class="section-title">Global company map</h2><p class="meta">Nearby companies are grouped into proportional bubbles. Select a bubble to open its complete list below the map.</p></div><span class="meta">Bubble size = company count</span></div><div id="company-map" class="company-map" aria-label="Map of companies in the directory"></div><div id="company-map-selection" class="map-selection" aria-live="polite"><span>Select a bubble to inspect every company in that region.</span></div><p class="map-caption">Locations use public city or regional information. Broad locations are shown at an approximate regional center.</p>';
    directory.before(section);
    const map = L.map('company-map', { scrollWheelZoom: false }).setView([28, 15], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const items = D.companies.map((company) => ({ name: company[0], location: company[1], point: companyPoint(company), company })).filter((item) => item.point);
    clusterLocations(items).forEach((cluster) => addClusterMarker(map, cluster, '#167f83', (item) => `<a href="#/company/${slug(item.name)}"><b>${item.name}</b><small>${item.location || 'Location pending'}</small></a>`, 'company-map-selection'));
  }
  const originalCompanies = window.companies;
  window.companies = () => { originalCompanies(); addCompanyMap(); decorateLinks(); };
  const originalCompany = window.company;
  window.company = (name) => {
    originalCompany(name); const record = D.companies.find((entry) => slug(entry[0]) === name); const top = document.querySelector('.company-page-top > div');
    if (record && top && !top.querySelector('.company-footprint-detail')) {
      const meta = marketMeta(record);
      top.querySelector('h1')?.insertAdjacentHTML('afterend', `<div class="company-footprint-detail">${footprintBadge(record)}<small>${meta.basis}. Editorial market-footprint signal, not an investment rating.</small></div>`);
      const point = companyPoint(record);
      top.insertAdjacentHTML('beforeend', `<p class="company-location meta"><b>Primary location:</b> ${record[1] || 'Not yet verified'}${point ? ` &middot; <a href="https://www.openstreetmap.org/?mlat=${point[0]}&mlon=${point[1]}" target="_blank" rel="noreferrer">Map source</a>` : ''}</p>`);
    }
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
    section.innerHTML = '<div class="section-head"><div><h2 class="section-title">Public affiliation map</h2><p class="meta">Nearby institutions are grouped. Select a bubble to open its complete list below the map.</p></div><span class="meta">No personal locations</span></div><div id="people-map" class="company-map people-map" aria-label="Map of public professional affiliations"></div><div id="people-map-selection" class="map-selection" aria-live="polite"><span>Select a bubble to inspect every public affiliation in that region.</span></div><p class="people-map-note">Markers reflect public organizational affiliation only, not individual location or private information.</p>';
    firstSection.before(section);
    const map = L.map('people-map', { scrollWheelZoom: false }).setView([39.7, -99.2], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const groups = new Map();
    D.people.forEach((person) => { if (!affiliationLocations[person[1]]) return; groups.set(person[1], [...(groups.get(person[1]) || []), person[0]]); });
    const items = [...groups].map(([organization, names]) => ({ name: organization, location: organization, point: affiliationLocations[organization], names }));
    clusterLocations(items).forEach((cluster) => addClusterMarker(map, cluster, '#b65a43', (item) => `<span><b>${item.name}</b><small>${item.names.join(', ')}</small></span>`, 'people-map-selection'));
  }
  const originalPeople = window.people;
  window.people = () => { originalPeople(); addPeopleMap(); const list = document.querySelector('.people-list'); if (list) list.innerHTML = D.people.map(peopleCard).join(''); decorateLinks(); };
  function sourceDirectory() {
    const entries = new Map();
    D.companies.forEach((company) => entries.set(company[5], { label: `${company[0]} careers`, url: company[5], scope: 'Company + Jobs' }));
    D.news.forEach((news) => { if (!entries.has(news[4])) entries.set(news[4], { label: new URL(news[4]).hostname.replace('www.', ''), url: news[4], scope: 'News' }); });
    entries.set('https://www.linkedin.com/', { label: 'linkedin.com', url: 'https://www.linkedin.com/', scope: 'People' });
    return [...entries.values()].sort((a, b) => a.label.localeCompare(b.label));
  }
  function sourceEntries() { return sourceDirectory().map((source) => `<div class="source-entry"><a href="${source.url}" target="_blank" rel="noreferrer"><span>${source.label}</span></a><button type="button" onclick="requestSourceRefresh('${source.label.replace(/'/g, '&#39;')}', '${source.url}', '${source.scope}')">Request update</button><small>${source.scope} · Last indexed: ${D.updated}</small></div>`).join(''); }
  function learningBlogs() {
    const reading = [
      ['RP Photonics Encyclopedia', 'A technical reference for laser, fiber, and photonics concepts.', 'https://www.rp-photonics.com/encyclopedia.html'],
      ['Edmund Optics Knowledge Center', 'Practical optics and imaging learning resources.', 'https://www.edmundoptics.com/knowledge-center/'],
      ['Optica Publishing Group', 'Research and review articles across optics and photonics.', 'https://opg.optica.org/']
    ];
    app.innerHTML = `${header('Blogs', 'A small reading shelf for learning optics, imaging, photonics, and engineering foundations.')}<section class="news-list">${reading.map((item) => `<a class="blog-row" href="${item[2]}" target="_blank" rel="noreferrer"><div class="blog-date">Reading<br><strong>Link</strong></div><div><h3>${item[0]}</h3><p>${item[1]}</p><span class="tag">Learning resource</span></div><div class="blog-source">Open source &rarr;</div></a>`).join('')}</section>`;
    decorateLinks();
  }
  const calendarState = { view: 'month', cursor: new Date(`${D.updated}T12:00:00`), filter: '' };
  const newsMatches = (news) => !calendarState.filter || news.join('|').toLowerCase().includes(calendarState.filter.toLowerCase());
  const newsMarkup = (news) => `<a class="blog-row" href="${news[4]}" target="_blank" rel="noreferrer"><div class="blog-date">Indexed<br><strong>${news[2]}</strong></div><div><h3>${news[0]}</h3><p>${news[1]}. This index stores the source link and a short descriptor, not the article body.</p><span class="tag">${news[3]}</span></div><div class="blog-source">${new URL(news[4]).hostname.replace('www.', '')}<br>Open source &rarr;</div></a>`;
  const countFor = (start, end) => D.news.filter((news) => { const date = new Date(`${news[2]}T12:00:00`); return newsMatches(news) && date >= start && date < end; }).length;
  const heat = (count, max) => count ? Math.min(4, Math.ceil((count / Math.max(1, max)) * 4)) : 0;
  const dateKey = (date) => date.toISOString().slice(0, 10);
  function calendarCell(label, start, end, max, extra = '') { const count = countFor(start, end); return `<button class="calendar-cell heat-${heat(count, max)} ${extra}" title="${count} indexed update${count === 1 ? '' : 's'}"><time>${label}</time><b>${count || ''}${count ? ' update' + (count === 1 ? '' : 's') : ''}</b></button>`; }
  function renderNewsCalendar() {
    const root = document.querySelector('#news-calendar'); if (!root) return;
    const cursor = calendarState.cursor, view = calendarState.view;
    let cells = '', title = '', gridClass = '';
    if (view === 'month') {
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1), end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1), days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      const values = Array.from({ length: days }, (_, index) => countFor(new Date(cursor.getFullYear(), cursor.getMonth(), index + 1), new Date(cursor.getFullYear(), cursor.getMonth(), index + 2)));
      cells = '<span class="calendar-cell empty"></span>'.repeat((start.getDay() + 6) % 7) + values.map((count, index) => { const day = new Date(cursor.getFullYear(), cursor.getMonth(), index + 1); return calendarCell(String(index + 1), day, new Date(cursor.getFullYear(), cursor.getMonth(), index + 2), Math.max(...values)); }).join('');
      title = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (view === 'week') {
      const start = new Date(cursor); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const values = Array.from({ length: 7 }, (_, index) => countFor(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index), new Date(start.getFullYear(), start.getMonth(), start.getDate() + index + 1)));
      cells = values.map((count, index) => { const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index); return calendarCell(day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), day, new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1), Math.max(...values)); }).join('');
      title = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`; gridClass = 'compact';
    } else {
      const values = Array.from({ length: 12 }, (_, index) => countFor(new Date(cursor.getFullYear(), index, 1), new Date(cursor.getFullYear(), index + 1, 1)));
      cells = values.map((count, index) => calendarCell(new Date(cursor.getFullYear(), index, 1).toLocaleDateString('en-US', { month: 'long' }), new Date(cursor.getFullYear(), index, 1), new Date(cursor.getFullYear(), index + 1, 1), Math.max(...values))).join('');
      title = String(cursor.getFullYear()); gridClass = 'year';
    }
    root.innerHTML = `<div class="calendar-top"><strong class="calendar-title">${title}</strong><div class="calendar-controls"><button type="button" title="Previous period" aria-label="Previous period" onclick="shiftNewsCalendar(-1)">&larr;</button><select aria-label="Calendar view" onchange="setNewsCalendarView(this.value)"><option value="week" ${view === 'week' ? 'selected' : ''}>Week</option><option value="month" ${view === 'month' ? 'selected' : ''}>Month</option><option value="year" ${view === 'year' ? 'selected' : ''}>Year</option></select><button type="button" title="Next period" aria-label="Next period" onclick="shiftNewsCalendar(1)">&rarr;</button></div></div><div class="calendar-key"><i></i> Fewer updates <i></i> More updates</div>${view !== 'year' ? '<div class="calendar-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>' : ''}<div class="calendar-grid ${gridClass}">${cells}</div>`;
  }
  window.setNewsCalendarView = (view) => { calendarState.view = view; renderNewsCalendar(); };
  window.shiftNewsCalendar = (direction) => { const cursor = calendarState.cursor; if (calendarState.view === 'week') cursor.setDate(cursor.getDate() + direction * 7); else if (calendarState.view === 'month') cursor.setMonth(cursor.getMonth() + direction); else cursor.setFullYear(cursor.getFullYear() + direction); renderNewsCalendar(); };
  function industryNews() {
    app.innerHTML = `${header('News', 'A chronological, link-first index of optics technology, company, and industry sources.')}<div class="filters"><button class="filter active" onclick="filterNews('')">All sources</button>${D.technologies.slice(0, 7).map((technology) => `<button class="filter" onclick="filterNews('${technology}')">${technology}</button>`).join('')}</div><section id="news-calendar" class="news-calendar" aria-label="News activity calendar"></section><section id="news-list" class="news-list">${D.news.filter(newsMatches).map(newsMarkup).join('')}</section>`;
    renderNewsCalendar(); decorateLinks();
  }
  const snapshotDate = new Date(`${D.updated}T23:59:59`);
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
  const daysBeforeSnapshot = (value) => validDate(value) ? Math.floor((snapshotDate - new Date(`${value}T12:00:00`)) / 86400000) : Infinity;
  const recentJobs = (days) => D.jobs.filter((job) => daysBeforeSnapshot(job[7]) >= 0 && daysBeforeSnapshot(job[7]) < days);
  const activeJobs = () => D.jobs.filter((job) => !/inactive|closed|expired/i.test(job[5] || ''));
  function ranked(values, limit = 6) {
    const counts = new Map();
    values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
  }
  function observationRange() {
    const dates = [
      ...D.jobs.flatMap((job) => [job[7], job[8]]),
      ...D.news.map((news) => news[2]),
    ].filter(validDate).sort();
    if (!dates.length) return `Snapshot updated ${D.updated}`;
    return `${dates[0]} to ${dates.at(-1)}`;
  }
  function dataHome() {
    const jobsNow = activeJobs();
    const hiringCounts = ranked(jobsNow.map((job) => job[1]), 6);
    const hiringCompanies = hiringCounts.map(([name]) => D.companies.find((company) => company[0] === name)).filter(Boolean);
    const latestJobs = [...D.jobs].sort((a, b) => String(b[7] || '').localeCompare(String(a[7] || ''))).slice(0, 6);
    const latestNews = [...D.news].sort((a, b) => b[2].localeCompare(a[2])).slice(0, 5);
    app.innerHTML = `<section class="home-top"><article class="signal-card"><div class="eyebrow" style="color:#76e2dc">Signal desk / ${D.updated}</div><h1>The optics industry, in motion.</h1><p>Tracking companies, people, hiring, and technology across optics and photonics.</p></article><aside class="snapshot"><h2>Current data snapshot</h2><div class="metric-grid"><div class="metric"><b>${D.companies.length}</b><span>Companies</span></div><div class="metric"><b>${jobsNow.length}</b><span>Active role signals</span></div><div class="metric"><b>${D.news.length}</b><span>News records</span></div><div class="metric"><b>${D.technologies.length}</b><span>Technology areas</span></div></div><p class="meta" style="margin-top:16px">Observed dates: ${observationRange()}</p></aside></section><section class="section"><div class="section-head"><h2 class="section-title">Companies hiring most actively</h2><a href="#/companies">View company directory &rarr;</a></div><div class="grid grid-3">${hiringCompanies.map(companyCard).join('') || '<div class="empty">No active company-linked roles are indexed yet.</div>'}</div></section><section class="section"><div class="section-head"><h2 class="section-title">Recent role signals</h2><a href="#/jobs">Explore hiring market &rarr;</a></div>${jobTable(latestJobs)}</section><section class="section"><div class="section-head"><h2 class="section-title">Industry radar</h2><a href="#/news">All news &rarr;</a></div><div class="news-list">${latestNews.map(newsMarkup).join('') || '<div class="empty">No news records are indexed yet.</div>'}</div></section>`;
    decorateLinks();
  }
  function dataJobs() {
    const jobsNow = activeJobs();
    const categories = ranked(jobsNow.map((job) => job[3]), 8);
    const filters = categories.slice(0, 6).map(([name]) => `<button class="filter" onclick="filterJobs('${name.replace(/'/g, "\\'")}')">${name}</button>`).join('');
    app.innerHTML = `${header('Hiring Market', `A source-linked view generated from ${D.jobs.length} job records in the repository dataset.`)}<div class="filters"><button class="filter active" onclick="filterJobs('')">All role signals</button>${filters}</div><section class="market-grid"><div class="card"><h2 class="section-title">Current snapshot</h2><div class="metric-grid"><div class="metric"><b>${jobsNow.length}</b><span>Active role signals</span></div><div class="metric"><b>${new Set(jobsNow.map((job) => job[1])).size}</b><span>Hiring companies</span></div><div class="metric"><b>${recentJobs(7).length}</b><span>Added in 7 days</span></div><div class="metric"><b>${recentJobs(30).length}</b><span>Added in 30 days</span></div></div></div><div class="card"><h2 class="section-title">Leading categories</h2><div class="topic-list">${categories.map(([name, count]) => `<span class="topic">${name} · ${count}</span>`).join('')}</div></div></section><section class="section"><div id="job-list">${jobTable(D.jobs)}</div></section>`;
    decorateLinks();
  }
  function dataMarket() {
    const jobsNow = activeJobs();
    const categories = ranked(jobsNow.map((job) => job[3]), 7);
    const companies = ranked(jobsNow.map((job) => job[1]), 7);
    const locations = ranked(jobsNow.map((job) => job[2]), 7);
    const topics = ranked(D.news.map((news) => news[3]), 9);
    const bars = (items) => { const max = Math.max(1, ...items.map((item) => item[1])); return items.map(([name, count]) => `<div class="bar"><span>${name}</span><i style="width:${Math.max(8, Math.round(count / max * 92))}%"></i><b class="meta">${count}</b></div>`).join('') || '<div class="empty">No matching records yet.</div>'; };
    app.innerHTML = `${header('Market', `Aggregates calculated directly from the repository dataset updated ${D.updated}. No synthetic history is shown.`)}<section class="market-grid section"><article class="detail-box"><h2>Active roles by category</h2>${bars(categories)}</article><article class="detail-box"><h2>Active roles by company</h2>${bars(companies)}</article><article class="detail-box"><h2>Active roles by location</h2>${bars(locations)}</article><article class="detail-box"><h2>News by topic</h2><div class="topic-list">${topics.map(([name, count]) => `<span class="topic">${name} · ${count}</span>`).join('') || '<span class="meta">No news topics indexed yet.</span>'}</div></article></section>`;
  }
  window.filterNews = (query) => { calendarState.filter = query; const list = document.querySelector('#news-list'); if (!list) return; list.innerHTML = D.news.filter(newsMatches).map(newsMarkup).join(''); renderNewsCalendar(); decorateLinks(list); };
  window.home = dataHome;
  window.jobs = dataJobs;
  window.market = dataMarket;
  window.news = industryNews;
  window.blogs = learningBlogs;
  async function loadRequestedSources() {
    const target = document.querySelector('#requested-sources'); if (!target) return;
    try {
      const response = await fetch('https://api.github.com/repos/changlaplace/optics-industry-intelligence/issues?state=open&per_page=50');
      if (!response.ok) throw new Error('Request queue unavailable');
      const items = (await response.json()).filter((item) => item.title.startsWith('[Source / ') || item.title.startsWith('[Refresh / '));
      target.innerHTML = items.length ? items.map((item) => { const type = item.title.match(/^\[(Source|Refresh) \/ ([^\]]+)\]/); return `<a class="requested-item" href="${item.html_url}" target="_blank" rel="noreferrer"><span class="requested-type">${type ? type[1] : 'Request'} · ${type ? type[2] : 'Other'}</span><strong>${item.title.replace(/^\[[^\]]+\]\s*/, '')}</strong><small>Requested by ${item.user.login} · ${new Date(item.created_at).toLocaleDateString()}</small></a>`; }).join('') : '<p class="meta">No open source or update requests yet.</p>';
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
  function openRefreshRequest(scope, label, url) {
    const destination = new URL('https://github.com/changlaplace/optics-industry-intelligence/issues/new');
    destination.searchParams.set('template', 'update-request.md'); destination.searchParams.set('title', `[Refresh / ${scope}] ${label}`); destination.searchParams.set('body', `### Requested refresh scope\n${scope}\n\n### Source\n${label}\n${url}\n\n### Last indexed\n${D.updated}\n\n### Notes\n`);
    window.open(destination, '_blank', 'noopener');
  }
  window.requestSourceRefresh = (label, url, scope) => openRefreshRequest(scope, label, url);
  window.requestFullRefresh = () => openRefreshRequest('All tracked sources', 'All tracked sources', 'https://github.com/changlaplace/optics-industry-intelligence/blob/main/data/sources.json');
  function startUpdateCountdown() {
    const countdown = document.querySelector('#update-countdown');
    const lastRun = document.querySelector('#last-update-run');
    if (!countdown || !lastRun) return;
    fetch('update-status.json', { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error('Update status unavailable');
      return response.json();
    }).then((status) => {
      const next = new Date(status.next_automatic_run_at);
      const last = new Date(status.last_successful_run_at);
      lastRun.textContent = `Last successful source check: ${last.toLocaleString()}. DeepSeek runs only for changed pages.`;
      const tick = () => {
        const remaining = Math.max(0, next.getTime() - Date.now());
        const days = Math.floor(remaining / 86400000);
        const hours = Math.floor((remaining % 86400000) / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        countdown.textContent = remaining ? `${days}d ${hours}h ${minutes}m` : 'Due now';
      };
      tick();
      window.setInterval(tick, 60000);
    }).catch(() => {
      countdown.textContent = 'Status pending';
      lastRun.textContent = 'The schedule checks tracked sources every 72 hours; changed pages are sent to DeepSeek.';
    });
  }
  window.about = () => {
    app.innerHTML = `<div class="eyebrow">Optics Industry Intelligence / About this website</div><h1 class="page-title">About this website</h1><section class="about-grid"><div><details open><summary>Source directory (${sourceDirectory().length})</summary><p class="request-help"><button class="refresh-all" type="button" onclick="requestFullRefresh()">Request full refresh</button> Every request opens a public GitHub issue for the update queue.</p><div class="source-directory">${sourceEntries()}</div></details><details><summary>Requested sources and updates</summary><div id="requested-sources" class="requested-list"><p class="meta">Loading public requests...</p></div></details><details open><summary>Request a source</summary><form id="source-request-form" class="request-form"><select name="category" aria-label="Requested area"><option>People</option><option>Company</option><option>Job</option><option>News</option><option>Blog</option></select><input name="name" required placeholder="Your name" aria-label="Your name" /><input name="url" type="url" required placeholder="Public source URL" aria-label="Public source URL" /><button type="submit">Submit request</button></form><p class="request-help">Requests are submitted as public GitHub issues. Your GitHub account is the visible requester identity.</p></details></div><aside class="motto"><div class="eyebrow" style="color:#76e2dc">Conviction</div><blockquote>In the AI era, career advantage comes from a clearer map of the world.</blockquote><p>Build context. Follow real signals. Move with the field.</p><div class="refresh-clock"><div><span>Next scheduled source check</span><strong id="update-countdown">Loading...</strong></div><small id="last-update-run">Reading the update ledger...</small></div><div class="maintainer"><img src="https://github.com/changlaplace.png?size=160" alt="changlaplace GitHub avatar" loading="lazy" /><div><div class="eyebrow">Maintained by</div><h2>Optics PhD student</h2><p>University of Washington, Seattle</p><p>Metasurfaces · Computer vision</p><a href="https://github.com/changlaplace" target="_blank" rel="noreferrer">View GitHub profile &rarr;</a></div></div></aside></section><section class="update-pipeline"><div class="section-head"><div><h2 class="section-title">How the index refreshes</h2><p class="meta">Scheduled checks revisit tracked links; manual discovery can add domains and index their content in the same run.</p></div><span class="pipeline-cadence">Every 72 hours</span></div><div class="pipeline-flow"><div class="pipeline-step"><b>1</b><strong>Source directory</strong><small>Official careers, newsrooms, ATS pages</small></div><i aria-hidden="true">&rarr;</i><div class="pipeline-step"><b>2</b><strong>Crawl4AI</strong><small>Crawl pages and clean public content</small></div><i aria-hidden="true">&rarr;</i><div class="pipeline-step"><b>3</b><strong>Change ledger</strong><small>Compare SHA-256 hashes and preserve crawl history</small></div><i aria-hidden="true">&rarr;</i><div class="pipeline-step"><b>4</b><strong>DeepSeek Flash</strong><small>Extract only changed optics records</small></div><i aria-hidden="true">&rarr;</i><div class="pipeline-step"><b>5</b><strong>GitHub dataset</strong><small>Merge, validate, commit, and redeploy</small></div></div><div class="pipeline-note"><strong>Source discovery</strong><span>The manual Action searches beyond the configured directory, reviews candidate companies, registers careers and newsroom links, extracts changed records, then commits one validated dataset.</span></div></section>`;
    startUpdateCountdown();
    bindRequestForm(); loadRequestedSources(); decorateLinks();
  };
  const footerStatus = document.querySelector('footer span:nth-child(2)');
  if (footerStatus) footerStatus.textContent = `Research index · Updated ${D.updated}`;
  function enhancedRouter() {
    const [route, id] = (location.hash.slice(2) || '').split('/');
    if (route === 'companies') return window.companies(); if (route === 'company') return window.company(id); if (route === 'people') return window.people(); if (route === 'about') return window.about(); if (route === 'blogs') return window.blogs(); if (route === 'jobs') return window.jobs(); if (route === 'news') return window.news(); if (route === 'market') return window.market(); if (route === 'sources') return window.about(); return window.home();
  }
  const linkObserver = new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) decorateLinks(node);
  })));
  window.addEventListener('hashchange', enhancedRouter); linkObserver.observe(app, { childList: true, subtree: true }); enhancedRouter();
})();
