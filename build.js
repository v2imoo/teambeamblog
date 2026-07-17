/* teambeam.blog static generator — zero dependencies.
 * Run: node build.js
 * Reads /content/*.md, writes /site.
 * JSON-LD is always built from JS objects via JSON.stringify, so a
 * malformed-structured-data error (like a stray doubled quote) is impossible.
 * A validation gate at the end re-parses every emitted ld+json block and fails loudly on any error.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'site');
const ASSETS = path.join(ROOT, 'assets');

/* ---------------------------------------------------------------- CONFIG */
const SITE = {
  name: 'TeamBeam Blog',
  brand: 'TeamBeam',
  origin: 'https://teambeam.blog',
  tagline: 'Designed. Delivered. Measured.',
  strap: 'People · Teams · Organisations · Beyond',
  email: 'start@teambeam.in',
  homes: { in: 'https://teambeam.in', us: 'https://teambeam.us', go: 'https://teambeam.in/go' },
  social: {
    LinkedIn: 'https://www.linkedin.com/company/teambeamoutings',
    X: 'https://x.com/teambeamoutings',
    Threads: 'https://www.threads.net/@teambeamoutings',
    Instagram: 'https://www.instagram.com/teambeamoutings'
  },
  ogImage: 'https://teambeam.blog/assets/og-default.png'
};

// Fixed pillar colour system — each pillar owns one accent that never changes between updates.
const PILLARS = {
  P1:  { slug: 'team-health',       name: 'Team Health',            color: '#F4634E', blurb: 'The eight dimensions of a working team, at team and organisation level.' },
  P2:  { slug: 'measurement',       name: 'Measurement & Proof',    color: '#E8940F', blurb: 'How we know a team investment worked — the Day 14/30/60 view.' },
  P3:  { slug: 'the-method',        name: 'The Method',             color: '#0FA3A3', blurb: 'Diagnostic-first design: read the team before you design the day.' },
  P4:  { slug: 'moments',           name: 'Moments That Matter',    color: '#7C5CD6', blurb: 'Onboarding, merger, restructure, burnout, kickoff, milestone.' },
  P5:  { slug: 'roles',             name: 'Roles & Decisions',      color: '#1565C0', blurb: 'Written to the real problem of each person who decides.' },
  P6:  { slug: 'functions',         name: 'Functions & Units',      color: '#2E9E5B', blurb: 'Sales, engineering, support, operations, finance, leadership.' },
  P7:  { slug: 'industries',        name: 'Industries',             color: '#3B4CCA', blurb: 'High-value sectors across India and the USA. GCCs as the bridge.' },
  P8:  { slug: 'human-layer-ai',    name: 'The Human Layer & AI',   color: '#D6297A', blurb: 'What AI changes about team work — and what it cannot.' },
  P9:  { slug: 'occasions',         name: 'Occasions',              color: '#F07A1E', blurb: 'Marking the calendar so it means something. Secular, inclusive.' },
  P10: { slug: 'behind-the-work',   name: 'Behind the Work',        color: '#5A6B7B', blurb: 'Facilitators, venue and experience partners, collaborators.' }
};
const BEAM = Object.values(PILLARS).map(p => p.color); // the spectrum strip
const BUILD_ID = Date.now(); // cache-bust the stylesheet on every deploy

/* ---------------------------------------------------------------- HELPERS */
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function attr(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');}

function parseFrontmatter(raw){
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if(!m) return { meta:{}, body: raw };
  const meta = {}; const body = m[2];
  m[1].split('\n').forEach(line=>{
    if(!line.trim() || /^\s*#/.test(line)) return;
    const i = line.indexOf(':'); if(i<0) return;
    const k = line.slice(0,i).trim(); let v = line.slice(i+1).trim();
    if(v.startsWith('[')||v.startsWith('{')){ try{ v = JSON.parse(v);}catch(e){/* leave string */} }
    meta[k]=v;
  });
  return { meta, body };
}

// Minimal, deterministic Markdown -> HTML for the subset we author.
function md(src){
  const lines = src.replace(/\r\n/g,'\n').split('\n');
  const out=[]; let i=0;
  const inline = t => esc(t)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,x,u)=>`<a href="${attr(u)}">${x}</a>`)
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g,'$1<em>$2</em>');
  while(i<lines.length){
    let line=lines[i];
    if(!line.trim()){i++;continue;}
    if(/^#{1,6}\s/.test(line)){const l=line.match(/^#+/)[0].length;out.push(`<h${l}>${inline(line.replace(/^#+\s/,''))}</h${l}>`);i++;continue;}
    if(/^---\s*$/.test(line)){out.push('<hr>');i++;continue;}
    if(/^>\s?/.test(line)){const b=[];while(i<lines.length&&/^>\s?/.test(lines[i])){b.push(lines[i].replace(/^>\s?/,''));i++;}out.push(`<blockquote>${inline(b.join(' '))}</blockquote>`);continue;}
    if(/^\s*[-*]\s+/.test(line)){const items=[];while(i<lines.length&&/^\s*[-*]\s+/.test(lines[i])){items.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/,''))}</li>`);i++;}out.push(`<ul>${items.join('')}</ul>`);continue;}
    if(/^\s*\d+\.\s+/.test(line)){const items=[];while(i<lines.length&&/^\s*\d+\.\s+/.test(lines[i])){items.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/,''))}</li>`);i++;}out.push(`<ol>${items.join('')}</ol>`);continue;}
    const para=[];while(i<lines.length&&lines[i].trim()&&!/^(#{1,6}\s|>|---|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])){para.push(lines[i]);i++;}
    if(para.length===0){i++;continue;} // guard: never stall
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

function readTime(body){const w=body.split(/\s+/).length;return Math.max(2,Math.round(w/200))+' min read';}

/* ---------------------------------------------------------------- JSON-LD (always via stringify) */
function orgNode(){
  return {
    '@type':'Organization', name:'TeamBeam', url:SITE.homes.in, email:SITE.email,
    description:'TeamBeam designs, delivers and measures corporate team experiences. Diagnostic-first design and Day 14/30/60 measurement.',
    sameAs:[SITE.homes.us, ...Object.values(SITE.social)]
  };
}
function jsonLd(obj){
  // Validate on the way out; throw if it ever fails.
  const s = JSON.stringify(obj);
  JSON.parse(s);
  return `<script type="application/ld+json">${s}</script>`;
}

/* ---------------------------------------------------------------- SHELL */
function head(p){
  const url = SITE.origin + p.path;
  const graph = { '@context':'https://schema.org', '@graph':[ orgNode(), ...p.nodes ] };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${attr(p.desc)}">
<meta name="ai-summary" content="${attr(p.ai||p.desc)}">
<link rel="canonical" href="${attr(url)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#0D2137">
<meta property="og:type" content="${p.ogType||'website'}">
<meta property="og:site_name" content="TeamBeam Blog">
<meta property="og:title" content="${attr(p.title)}">
<meta property="og:description" content="${attr(p.desc)}">
<meta property="og:url" content="${attr(url)}">
<meta property="og:image" content="${attr(SITE.ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(p.title)}">
<meta name="twitter:description" content="${attr(p.desc)}">
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/Bricolage.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/Jakarta.woff2" crossorigin>
<link rel="stylesheet" href="/assets/styles.css?v=${BUILD_ID}">
<link rel="alternate" type="application/rss+xml" title="TeamBeam Blog" href="/rss.xml">
${jsonLd(graph)}
</head>
<body>
${header()}
<main id="main">`;
}

function header(){
  const items = Object.entries(PILLARS).map(([k,p])=>
    `<a class="mega__item" href="/${p.slug}/" style="--c:${p.color}"><span class="dot"></span>${esc(p.name)}</a>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<header class="nav" id="nav">
  <div class="nav__in">
    <a class="brand" href="/" aria-label="TeamBeam Blog home">
      <span class="brand__mark" aria-hidden="true">&#923;</span>
      <span class="brand__word">TEAM<b>BEAM</b></span>
      <span class="brand__blog">blog</span>
    </a>
    <nav class="nav__links" aria-label="Primary">
      <a href="/insights/">All insights</a>
      <div class="has-mega">
        <button class="megabtn" aria-expanded="false" aria-controls="mega">Pillars <span aria-hidden="true">&#9662;</span></button>
        <div class="mega" id="mega" role="menu">${items}</div>
      </div>
      <a href="/about/">About</a>
      <a class="cta" data-geo-cta href="${SITE.homes.go}">Talk to us</a>
    </nav>
    <button class="burger" aria-label="Menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button>
  </div>
  <div class="beam" aria-hidden="true">${BEAM.map(c=>`<i style="background:${c}"></i>`).join('')}</div>
</header>
<div class="drawer" id="drawer">
  <a href="/insights/">All insights</a>
  ${Object.entries(PILLARS).map(([k,p])=>`<a href="/${p.slug}/" style="--c:${p.color}"><span class="dot"></span>${esc(p.name)}</a>`).join('')}
  <a href="/about/">About</a>
  <a class="cta" data-geo-cta href="${SITE.homes.go}">Talk to us</a>
</div>`;
}

function footer(){
  const soc = Object.entries(SITE.social).map(([n,u])=>`<a href="${attr(u)}" rel="noopener">${esc(n)}</a>`).join('');
  const cols = Object.entries(PILLARS).map(([k,p])=>`<a href="/${p.slug}/">${esc(p.name)}</a>`).join('');
  return `</main>
<footer class="foot">
  <div class="foot__beam" aria-hidden="true">${BEAM.map(c=>`<i style="background:${c}"></i>`).join('')}</div>
  <div class="foot__in">
    <div class="foot__brand">
      <span class="brand__mark" aria-hidden="true">&#923;</span>
      <span class="brand__word">TEAM<b>BEAM</b> <span class="brand__blog">blog</span></span>
      <p class="foot__line">${esc(SITE.tagline)}<br>${esc(SITE.strap)}</p>
      <p class="foot__write">Have a view, a question, or a story? Write to us at <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
    </div>
    <nav class="foot__cols" aria-label="Pillars">${cols}</nav>
    <div class="foot__meta">
      <div class="foot__soc">${soc}</div>
      <a class="cta cta--ghost" data-geo-cta href="${SITE.homes.go}">Talk to us</a>
    </div>
  </div>
  <div class="foot__legal">One business, two homes — <a href="${SITE.homes.in}">teambeam.in</a> for India and the world, <a href="${SITE.homes.us}">teambeam.us</a> for the USA. &copy; ${new Date().getFullYear()} TeamBeam.</div>
</footer>
<script>
(function(){
  var b=document.querySelector('.burger'),d=document.getElementById('drawer');
  if(b&&d){b.addEventListener('click',function(){var o=!d.classList.contains('open');d.classList.toggle('open',o);b.classList.toggle('open',o);b.setAttribute('aria-expanded',String(o));});
    d.querySelectorAll('a').forEach(function(l){l.addEventListener('click',function(){d.classList.remove('open');b.classList.remove('open');b.setAttribute('aria-expanded','false');});});}
  var mb=document.querySelector('.megabtn'),mg=document.getElementById('mega');
  if(mb){mb.addEventListener('click',function(){var o=mb.getAttribute('aria-expanded')==='true';mb.setAttribute('aria-expanded',String(!o));mg.classList.toggle('open',!o);});
    document.addEventListener('click',function(e){if(!e.target.closest('.has-mega')){mb.setAttribute('aria-expanded','false');mg.classList.remove('open');}});}
  // Progressive geo hint: default stays neutral (/go); only redirect the CTA target, never the page.
  try{var tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';var host='${SITE.homes.go}';
    if(/Kolkata|Calcutta/.test(tz))host='${SITE.homes.in}';else if(/America|US\\/|New_York|Chicago|Denver|Los_Angeles/.test(tz))host='${SITE.homes.us}';
    document.querySelectorAll('[data-geo-cta]').forEach(function(a){a.setAttribute('href',host);});}catch(e){}
})();
</script>
</body></html>`;
}

/* ---------------------------------------------------------------- CARDS */
function card(a){
  const p = PILLARS[a.pillar];
  return `<a class="card" href="/${a.slug}/" style="--c:${p.color}">
    <span class="card__edge"></span>
    <span class="card__eyebrow">${esc(p.name)}</span>
    <span class="card__title">${esc(a.title)}</span>
    <span class="card__sum">${esc(a.summary)}</span>
    <span class="card__meta">${esc(a.read)} <span aria-hidden="true">&rarr;</span></span>
  </a>`;
}

function relatedBlock(a, all){
  const same = all.filter(x=>x.slug!==a.slug && x.pillar===a.pillar).slice(0,2);
  const others = all.filter(x=>x.slug!==a.slug && x.pillar!==a.pillar).slice(0,3);
  return { same, others };
}

/* ---------------------------------------------------------------- PAGES */
function articlePage(a, all){
  const p = PILLARS[a.pillar];
  const rel = relatedBlock(a, all);
  const faq = Array.isArray(a.faq)? a.faq : [];
  const nodes = [
    { '@type':'BreadcrumbList', itemListElement:[
      {'@type':'ListItem',position:1,name:'Home',item:SITE.origin+'/'},
      {'@type':'ListItem',position:2,name:p.name,item:SITE.origin+'/'+p.slug+'/'},
      {'@type':'ListItem',position:3,name:a.title,item:SITE.origin+'/'+a.slug+'/'}
    ]},
    { '@type':'BlogPosting', headline:a.title, description:a.summary, datePublished:a.date,
      dateModified:a.date, author:{'@type':'Organization',name:'TeamBeam'},
      publisher:{'@type':'Organization',name:'TeamBeam',url:SITE.homes.in},
      mainEntityOfPage:{'@type':'WebPage','@id':SITE.origin+'/'+a.slug+'/'},
      articleSection:p.name, inLanguage:'en' }
  ];
  if(faq.length) nodes.push({ '@type':'FAQPage', mainEntity: faq.map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}})) });

  const home = a.route==='in'?SITE.homes.in : a.route==='us'?SITE.homes.us : SITE.homes.go;
  const svcUrl = a.service_url || home;
  const svcLabel = a.service_label || 'See how we work';

  const relHtml = `
    <section class="rel">
      ${rel.same.length?`<div class="rel__grp"><h2 class="rel__h">More from ${esc(p.name)}</h2><div class="grid grid--2">${rel.same.map(card).join('')}</div></div>`:''}
      <div class="rel__grp"><h2 class="rel__h">Read more insights</h2><div class="grid grid--3">${rel.others.map(card).join('')}</div></div>
    </section>`;

  const faqHtml = faq.length?`<section class="faq"><h2>Common questions</h2>${faq.map(f=>`<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>`:'';

  return head({
    path:'/'+a.slug+'/', title:a.title+' · TeamBeam Blog', desc:a.summary, ai:a.ai_summary||a.summary,
    ogType:'article', nodes
  }) + `
  <article class="art" style="--c:${p.color}">
    <div class="art__head">
      <a class="art__pill" href="/${p.slug}/"><span class="dot"></span>${esc(p.name)}</a>
      <h1>${esc(a.title)}</h1>
      <p class="art__sum">${esc(a.summary)}</p>
      <p class="art__meta">${esc(a.read)}</p>
    </div>
    <div class="art__body">${md(a.body)}</div>
    <aside class="art__cta">
      <p class="art__ctahead">Want this for your team?</p>
      <p>Tell us what you are trying to change. Write to <a href="mailto:${SITE.email}">${SITE.email}</a>, or see the work.</p>
      <a class="cta" href="${attr(svcUrl)}">${esc(svcLabel)}</a>
    </aside>
    ${faqHtml}
  </article>
  ${relHtml}
  ` + footer();
}

function pillarPage(key, all){
  const p = PILLARS[key];
  const list = all.filter(a=>a.pillar===key);
  const nodes = [
    { '@type':'CollectionPage', name:p.name+' · TeamBeam Blog', url:SITE.origin+'/'+p.slug+'/', description:p.blurb },
    { '@type':'BreadcrumbList', itemListElement:[
      {'@type':'ListItem',position:1,name:'Home',item:SITE.origin+'/'},
      {'@type':'ListItem',position:2,name:p.name,item:SITE.origin+'/'+p.slug+'/'}
    ]}
  ];
  return head({path:'/'+p.slug+'/', title:p.name+' · TeamBeam Blog', desc:p.blurb, nodes}) + `
  <section class="hub" style="--c:${p.color}">
    <div class="hub__head">
      <span class="hub__eyebrow"><span class="dot"></span>Pillar</span>
      <h1>${esc(p.name)}</h1>
      <p>${esc(p.blurb)}</p>
    </div>
    ${list.length?`<div class="grid grid--3">${list.map(card).join('')}</div>`:`<p class="empty">Articles in this pillar are on the way. In the meantime, write to us at <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>`}
  </section>` + footer();
}

function homePage(all){
  const featured = all[0];
  const latest = all.slice(0,6);
  const nodes = [
    { '@type':'WebSite', name:'TeamBeam Blog', url:SITE.origin+'/',
      potentialAction:{'@type':'SearchAction',target:SITE.origin+'/insights/?q={q}','query-input':'required name=q'} },
    { '@type':'Blog', name:'TeamBeam Blog', url:SITE.origin+'/', description:'How to design, deliver and measure team and organisation experiences.' }
  ];
  const tiles = Object.entries(PILLARS).map(([k,p])=>
    `<a class="tile" href="/${p.slug}/" style="--c:${p.color}"><span class="tile__dot"></span><span class="tile__name">${esc(p.name)}</span><span class="tile__blurb">${esc(p.blurb)}</span></a>`).join('');
  return head({path:'/', title:'TeamBeam Blog — designing, delivering and measuring teams', desc:'A knowledge resource on team health, measurement, and the human layer of work — for the people who decide.', ai:'TeamBeam Blog teaches decision-makers how to think about team health, measurement (Day 14/30/60), and the human layer of work as AI reshapes it. One business, two homes: teambeam.in and teambeam.us.', nodes}) + `
  <section class="hero">
    <p class="hero__eyebrow">A TeamBeam resource · ${esc(SITE.strap)}</p>
    <h1 class="hero__h">Teams are built on purpose,<br>not by accident.</h1>
    <p class="hero__sub">We design, deliver and measure the experiences that make teams and organisations work. This is where we think out loud about how — for the people who decide.</p>
    <div class="hero__cta"><a class="cta" href="/insights/">Read the insights</a><a class="cta cta--ghost" data-geo-cta href="${SITE.homes.go}">Talk to us</a></div>
  </section>

  <section class="tiles">
    <h2 class="sech">Where we go deep</h2>
    <div class="tiles__grid">${tiles}</div>
  </section>

  ${featured?`<section class="feat">
    <h2 class="sech">Start here</h2>
    <a class="feat__card" href="/${featured.slug}/" style="--c:${PILLARS[featured.pillar].color}">
      <span class="feat__edge"></span>
      <div class="feat__body">
        <span class="card__eyebrow">${esc(PILLARS[featured.pillar].name)}</span>
        <span class="feat__title">${esc(featured.title)}</span>
        <span class="feat__sum">${esc(featured.summary)}</span>
        <span class="card__meta">${esc(featured.read)} <span aria-hidden="true">&rarr;</span></span>
      </div>
    </a>
  </section>`:''}

  <section class="latest">
    <div class="sech__row"><h2 class="sech">Latest</h2><a class="sech__all" href="/insights/">All insights &rarr;</a></div>
    <div class="grid grid--3">${latest.map(card).join('')}</div>
  </section>

  <section class="band">
    <div class="band__in">
      <h2>No comment box. A conversation instead.</h2>
      <p>We would rather hear from you directly than run a comment thread. Tell us where your team is stuck, or what you would argue with here.</p>
      <a class="cta" href="mailto:${SITE.email}">Write to us</a>
    </div>
  </section>` + footer();
}

function insightsPage(all){
  const nodes = [{ '@type':'CollectionPage', name:'All insights · TeamBeam Blog', url:SITE.origin+'/insights/', description:'Every TeamBeam insight, across all pillars.' }];
  return head({path:'/insights/', title:'All insights · TeamBeam Blog', desc:'Every TeamBeam insight, across all ten pillars.', nodes}) + `
  <section class="hub">
    <div class="hub__head"><span class="hub__eyebrow">Index</span><h1>All insights</h1><p>Everything we have written, newest first.</p></div>
    <div class="grid grid--3">${all.map(card).join('')}</div>
  </section>` + footer();
}

function aboutPage(){
  const nodes = [{ '@type':'AboutPage', name:'About · TeamBeam Blog', url:SITE.origin+'/about/' }];
  return head({path:'/about/', title:'About · TeamBeam Blog', desc:'Why this blog exists, and how it connects to teambeam.in and teambeam.us.', nodes}) + `
  <section class="prose">
    <span class="hub__eyebrow">About</span>
    <h1>One business. Two homes. One place to think.</h1>
    <p>TeamBeam designs, delivers and measures corporate team experiences. We work as one business with two market homes: <a href="${SITE.homes.in}">teambeam.in</a> for India and the world, and <a href="${SITE.homes.us}">teambeam.us</a> for the USA.</p>
    <p>This blog sits above both. It is where we set out how we think about team health, measurement, and the human layer of work — without a sales pitch on every line. When something here is useful to you, the right home is one link away.</p>
    <p>We do not run a comment section. If you want to push back, add to a point, or ask a question, write to us at <a href="mailto:${SITE.email}">${SITE.email}</a>. We read every message.</p>
    <a class="cta" data-geo-cta href="${SITE.homes.go}">Talk to us</a>
  </section>` + footer();
}

/* ---------------------------------------------------------------- BUILD */
function cp(src,dst){fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);}
function write(rel, html){const f=path.join(OUT,rel,'index.html');fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,html);}
function writeFile(rel, txt){const f=path.join(OUT,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,txt);}

function run(){
  // reset output
  fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});

  // load content
  const files = fs.existsSync(CONTENT)? fs.readdirSync(CONTENT).filter(f=>f.endsWith('.md')):[];
  let arts = files.map(f=>{
    const {meta,body}=parseFrontmatter(fs.readFileSync(path.join(CONTENT,f),'utf8'));
    if(!meta.title||!meta.slug||!meta.pillar) throw new Error('Missing title/slug/pillar in '+f);
    if(!PILLARS[meta.pillar]) throw new Error('Unknown pillar '+meta.pillar+' in '+f);
    return {...meta, body, read: meta.read_time||readTime(body)};
  }).sort((a,b)=> (b.date||'').localeCompare(a.date||''));

  // pages
  write('', homePage(arts));
  write('insights', insightsPage(arts));
  write('about', aboutPage());
  Object.keys(PILLARS).forEach(k=> write(PILLARS[k].slug, pillarPage(k,arts)));
  arts.forEach(a=> write(a.slug, articlePage(a,arts)));

  // assets
  cp(path.join(ASSETS,'styles.css'), path.join(OUT,'assets','styles.css'));
  const fdir=path.join(ASSETS,'fonts');
  if(fs.existsSync(fdir)) fs.readdirSync(fdir).forEach(f=>cp(path.join(fdir,f),path.join(OUT,'assets','fonts',f)));

  // sitemap
  const urls = ['/', '/insights/', '/about/', ...Object.values(PILLARS).map(p=>'/'+p.slug+'/'), ...arts.map(a=>'/'+a.slug+'/')];
  writeFile('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+
    urls.map(u=>`  <url><loc>${SITE.origin}${u}</loc></url>`).join('\n')+`\n</urlset>\n`);

  // robots
  writeFile('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE.origin}/sitemap.xml\n`);

  // RSS + JSON feed
  writeFile('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n<title>TeamBeam Blog</title><link>${SITE.origin}/</link><description>${esc('Designing, delivering and measuring teams.')}</description>\n`+
    arts.map(a=>`<item><title>${esc(a.title)}</title><link>${SITE.origin}/${a.slug}/</link><guid>${SITE.origin}/${a.slug}/</guid><description>${esc(a.summary)}</description></item>`).join('\n')+`\n</channel></rss>\n`);
  writeFile('feed.json', JSON.stringify({version:'https://jsonfeed.org/version/1.1',title:'TeamBeam Blog',home_page_url:SITE.origin+'/',feed_url:SITE.origin+'/feed.json',
    items:arts.map(a=>({id:SITE.origin+'/'+a.slug+'/',url:SITE.origin+'/'+a.slug+'/',title:a.title,summary:a.summary,date_published:a.date}))},null,2));

  // ---------- VALIDATION GATE ----------
  let checked=0, errors=[];
  function scan(dir){fs.readdirSync(dir,{withFileTypes:true}).forEach(e=>{
    const fp=path.join(dir,e.name);
    if(e.isDirectory()) return scan(fp);
    if(!e.name.endsWith('.html')) return;
    const html=fs.readFileSync(fp,'utf8');
    const blocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    blocks.forEach((m,idx)=>{checked++;try{JSON.parse(m[1]);}catch(err){errors.push(fp+' block#'+idx+': '+err.message);}});
  });}
  scan(OUT);

  const pageCount = urls.length;
  console.log('Pages written : '+pageCount);
  console.log('Articles      : '+arts.length);
  console.log('Pillars        : '+Object.keys(PILLARS).length);
  console.log('JSON-LD blocks : '+checked+' checked');
  if(errors.length){ console.error('STRUCTURED DATA ERRORS:\n'+errors.join('\n')); process.exit(1); }
  console.log('JSON-LD        : ALL VALID');
  console.log('Build OK -> /site');
}
run();
