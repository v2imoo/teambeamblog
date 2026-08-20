/* Navigator — wiki.js
   Fills every .portrait[data-wiki] with a real image from the MediaWiki
   Action API (people photos / company logos). Uniform 4:5 frame is enforced
   by CSS; images use object-fit:cover so every portrait is the same size.
   On any failure it leaves the monogram fallback in place. Lazy via
   IntersectionObserver so index grids stay fast. */
(function(){
  var API='https://en.wikipedia.org/w/api.php';
  function load(el){
    var title=el.getAttribute('data-wiki');if(!title)return;
    var url=API+'?action=query&format=json&origin=*&prop=pageimages'+
            '&piprop=thumbnail&pithumbsize=640&titles='+encodeURIComponent(title);
    fetch(url).then(function(r){return r.json()}).then(function(d){
      var pages=d&&d.query&&d.query.pages||{},k=Object.keys(pages)[0],
          thumb=k&&pages[k].thumbnail&&pages[k].thumbnail.source;
      if(!thumb)return;
      var img=new Image();img.alt=el.getAttribute('data-name')||title;
      img.className='portrait';img.loading='lazy';
      img.onload=function(){el.replaceWith(img)};
      img.src=thumb;
    }).catch(function(){});
  }
  var io=('IntersectionObserver'in window)?new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){load(e.target);io.unobserve(e.target)}});
  },{rootMargin:'300px'}):null;
  document.querySelectorAll('.portrait[data-wiki]').forEach(function(el){
    if(io)io.observe(el);else load(el);
  });
})();
