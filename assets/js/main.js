/* Navigator — main.js : nav drawer, readable toggle, contents scrollspy */
(function(){
  var mb=document.getElementById('menuBtn'),dr=document.getElementById('drawer');
  if(mb&&dr){
    mb.addEventListener('click',function(){dr.classList.add('open')});
    dr.addEventListener('click',function(e){
      if(e.target===dr||e.target.hasAttribute('data-close'))dr.classList.remove('open');
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape')dr.classList.remove('open')});
  }
  // readable (serif body) toggle, remembered for session
  var t=document.getElementById('a11yToggle');
  if(t){
    if(sessionStorage.getItem('nav-read')==='1')document.body.classList.add('reading');
    t.addEventListener('click',function(){
      var on=document.body.classList.toggle('reading');
      try{sessionStorage.setItem('nav-read',on?'1':'0')}catch(e){}
    });
  }
  // build + spy the contents rail from H2/H3 inside .doc
  var doc=document.querySelector('.doc'),toc=document.getElementById('toc');
  if(doc&&toc){
    var hs=doc.querySelectorAll('h2,h3'),links=[];
    hs.forEach(function(h){
      if(!h.id){h.id=h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
      var a=document.createElement('a');
      a.href='#'+h.id;a.textContent=h.textContent;
      if(h.tagName==='H3')a.className='lvl3';
      a.addEventListener('click',function(e){e.preventDefault();
        document.getElementById(h.id).scrollIntoView({behavior:'smooth',block:'start'});
        history.replaceState(null,'','#'+h.id);});
      toc.appendChild(a);links.push(a);
    });
    var spy=function(){
      var y=window.scrollY+120,cur=null;
      hs.forEach(function(h){if(h.offsetTop<=y)cur=h.id});
      links.forEach(function(a){a.style.color=a.getAttribute('href')==='#'+cur?'var(--accent-ink)':'';
        a.style.borderLeftColor=a.getAttribute('href')==='#'+cur?'var(--accent)':'';});
    };
    window.addEventListener('scroll',spy,{passive:true});spy();
  }
})();
