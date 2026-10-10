// Amélio Tattoo Designer — scripts do site (sem dependências)

const WHATSAPP_MSG = 'Olá Tiago! Vim pelo site da Amélio Tattoo e gostaria de fazer um orçamento.';
const GALLERY_PAGE = 12;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Caminhos salvos pelo painel começam com "/"; deixamos relativos para funcionar em qualquer endereço.
const asset = (path) => (/^(https?:)?\/\//.test(path) ? path : path.replace(/^\//, ''));

async function loadJSON(path) {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// Aberto direto do computador (file://), o navegador bloqueia a leitura de .json.
// Nesse caso usamos content/dados-offline.js, gerado a partir dos mesmos arquivos.
function loadOffline() {
  return new Promise((resolve) => {
    const script = el('script', { src: 'content/dados-offline.js' });
    script.onload = () => resolve(window.SITE_DATA ?? {});
    script.onerror = () => resolve({});
    document.head.append(script);
  });
}

async function loadContent() {
  if (location.protocol === 'file:') return loadOffline();
  const nomes = ['site', 'galeria', 'depoimentos', 'avaliacoes', 'instagram'];
  const dados = await Promise.all(nomes.map((n) => loadJSON(`content/${n}.json`)));
  return Object.fromEntries(nomes.map((n, i) => [n, dados[i]]));
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'text') node.textContent = value;
    else if (value != null) node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

/* ---------- topo, menu, links ---------- */

function setupChrome() {
  const topbar = $('[data-topbar]');
  const fab = $('.fab');
  const contact = $('#contato');
  const onScroll = () => topbar.classList.toggle('is-scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // esconde o botão flutuante quando a seção de contato está na tela
  if (fab && contact) {
    new IntersectionObserver(([entry]) => fab.classList.toggle('is-hidden', entry.isIntersecting), { threshold: 0.3 }).observe(contact);
  }

  const btn = $('[data-menu-btn]');
  const menu = $('[data-menu]');
  const setMenu = (open) => {
    btn.setAttribute('aria-expanded', open);
    menu.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => e.target.closest('a') && setMenu(false));
  addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  // link ativo conforme a seção visível
  const links = $$('.nav a[href^="#"]:not(.btn)');
  const spy = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((a) => a.classList.toggle('is-active', a.hash === `#${entry.target.id}`));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a) => { const s = $(a.hash); if (s) spy.observe(s); });

  $$('[data-whatsapp]').forEach((a) => {
    const url = new URL(a.href);
    url.searchParams.set('text', WHATSAPP_MSG);
    a.href = url;
  });

  $('[data-year]').textContent = new Date().getFullYear();
}

/* ---------- animações de entrada ---------- */

const revealer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealer.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px' })
  : null;

function reveal(nodes) {
  nodes.forEach((node, i) => {
    node.style.transitionDelay = `${Math.min(i % 4, 3) * 80}ms`;
    revealer ? revealer.observe(node) : node.classList.add('is-visible');
  });
}

/* ---------- fotos de destaque ---------- */

function applySite(site) {
  if (!site) return;
  $$('[data-site]').forEach((img) => {
    const src = site[img.dataset.site];
    if (src) img.src = asset(src);
  });
  const fotos = site.fotosProcesso?.filter(Boolean);
  if (fotos?.length) {
    $$('[data-process] img').forEach((img, i) => { if (fotos[i]) img.src = asset(fotos[i]); });
  }
}

/* ---------- galeria ---------- */

function setupGallery(data) {
  const list = $('[data-gallery]');
  const filters = $('[data-filters]');
  const more = $('[data-more]');
  const fotos = (data?.fotos ?? []).filter((f) => f.imagem);
  if (!fotos.length) return;

  let current = fotos;
  let shown = 0;

  const estilos = [...new Set(fotos.map((f) => f.estilo).filter(Boolean))];
  if (estilos.length > 1) {
    for (const estilo of ['Todos', ...estilos]) {
      const b = el('button', { type: 'button', 'aria-pressed': estilo === 'Todos', text: estilo });
      b.addEventListener('click', () => {
        $$('button', filters).forEach((x) => x.setAttribute('aria-pressed', x === b));
        current = estilo === 'Todos' ? fotos : fotos.filter((f) => f.estilo === estilo);
        const swap = () => { list.replaceChildren(); shown = 0; render(); };
        document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches
          ? document.startViewTransition(swap)
          : swap();
      });
      filters.append(b);
    }
    filters.hidden = false;
  }

  function render() {
    const slice = current.slice(shown, shown + GALLERY_PAGE);
    const start = shown;
    list.append(...slice.map((foto, i) => {
      const titulo = foto.titulo || 'Tatuagem';
      const btn = el('button', { class: 'tile', type: 'button', 'aria-label': `Ampliar: ${titulo}` }, [
        el('img', { src: asset(foto.imagem), alt: titulo, loading: 'lazy', decoding: 'async' }),
        el('span', { class: 'tile__info' }, [
          el('strong', { text: titulo }),
          foto.estilo ? el('span', { text: foto.estilo }) : '',
        ]),
      ]);
      btn.addEventListener('click', () => lightbox.open(current, start + i));
      const li = el('li', { class: 'is-entering' }, [btn]);
      li.style.animationDelay = `${(i % GALLERY_PAGE) * 45}ms`;
      return li;
    }));
    shown += slice.length;
    more.hidden = shown >= current.length;
  }

  more.addEventListener('click', render);
  render();
}

/* ---------- lightbox ---------- */

const lightbox = (() => {
  const dialog = $('[data-lightbox]');
  if (!dialog) return null;
  const img = $('[data-lb-img]');
  const caption = $('[data-lb-caption]');
  let items = [];
  let index = 0;

  function show(i) {
    index = (i + items.length) % items.length;
    const foto = items[index];
    img.src = asset(foto.imagem);
    img.alt = foto.titulo || 'Tatuagem';
    caption.replaceChildren(foto.estilo ? el('span', { text: foto.estilo }) : '', foto.titulo || '');
    // pré-carrega a próxima
    const next = items[(index + 1) % items.length];
    if (next) new Image().src = asset(next.imagem);
  }

  $('[data-lb-close]').addEventListener('click', () => dialog.close());
  $('[data-lb-prev]').addEventListener('click', () => show(index - 1));
  $('[data-lb-next]').addEventListener('click', () => show(index + 1));
  let swiped = false;
  dialog.addEventListener('click', (e) => {
    if (swiped) { swiped = false; return; }
    if (e.target === dialog || e.target.tagName === 'FIGURE') dialog.close();
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; });

  // arrastar para o lado no celular
  let startX = null;
  dialog.addEventListener('pointerdown', (e) => { startX = e.clientX; swiped = false; });
  dialog.addEventListener('pointerup', (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    swiped = Math.abs(dx) > 50;
    if (swiped) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });

  return {
    open(list, i) {
      items = list;
      show(i);
      document.body.style.overflow = 'hidden';
      dialog.showModal();
    },
  };
})();

/* ---------- depoimentos ---------- */

function setupReviews(data) {
  const track = $('[data-reviews]');
  const items = data?.depoimentos ?? [];
  const section = $('#depoimentos');
  if (!items.length) { section.hidden = true; $('.nav a[href="#depoimentos"]').hidden = true; return; }

  track.append(...items.map((d) => el('li', { class: 'review' }, [
    d.foto ? el('img', { src: asset(d.foto), alt: `Tatuagem de ${d.nome}`, loading: 'lazy' }) : el('span'),
    el('blockquote', { text: d.texto }),
    el('p', { text: `— ${d.nome}` }),
  ])));

  const step = (dir) => {
    const card = track.firstElementChild;
    const width = card ? card.getBoundingClientRect().width + 20 : track.clientWidth;
    track.scrollBy({ left: dir * width, behavior: 'smooth' });
  };
  $('[data-reviews-prev]').addEventListener('click', () => step(-1));
  $('[data-reviews-next]').addEventListener('click', () => step(1));
}

/* ---------- avaliações do Google ---------- */

const GOOGLE_REVIEWS_MAX = 6;
const GOOGLE_REVIEW_LONG = 220; // caracteres a partir dos quais o texto recolhe no mobile

function setupGoogleReviews(data) {
  const itens = (data?.avaliacoes ?? []).filter((a) => a.texto).slice(0, GOOGLE_REVIEWS_MAX);
  if (!itens.length) return;

  const section = $('#avaliacoes');
  const nota = Number(data.nota) || 5;
  $('[data-gr-nota]').textContent = nota.toFixed(1).replace('.', ',');
  if (data.total) $('[data-gr-total]').textContent = `${data.total} avaliações no Google`;
  if (data.link) {
    const link = $('[data-gr-link]');
    link.href = data.link;
    link.hidden = false;
  }

  $('[data-gr-list]').append(...itens.map((a) => {
    const estrelas = Math.max(1, Math.min(5, Number(a.estrelas) || 5));
    return el('li', { class: 'greview' }, [
      el('p', { class: 'stars', 'aria-label': `${estrelas} de 5 estrelas`, text: '★'.repeat(estrelas) }),
      el('header', { class: 'greview__head' }, [
        el('span', { class: 'greview__avatar', 'aria-hidden': 'true', text: (a.nome || '?').trim().charAt(0).toUpperCase() }),
        el('strong', { text: a.nome || 'Cliente' }),
      ]),
      el('blockquote', { text: a.texto }),
      // no mobile os textos longos ficam recolhidos (ver CSS); o botão expande
      a.texto.length > GOOGLE_REVIEW_LONG
        ? el('button', { type: 'button', class: 'greview__more', 'aria-expanded': 'false', text: 'Ler mais' })
        : '',
    ]);
  }));

  $('[data-gr-list]').addEventListener('click', (e) => {
    const btn = e.target.closest('.greview__more');
    if (!btn) return;
    const aberto = btn.closest('.greview').classList.toggle('is-open');
    btn.setAttribute('aria-expanded', aberto);
    btn.textContent = aberto ? 'Ler menos' : 'Ler mais';
  });

  section.hidden = false;
}

/* ---------- instagram ---------- */

function setupInstagram(data, galeria) {
  let posts = (data?.posts ?? []).slice(0, 8);
  const grid = $('[data-insta]');
  if (!posts.length) {
    // sem integração configurada: mostra trabalhos da galeria levando ao perfil
    const profile = $('#instagram a.btn').href;
    posts = (galeria?.fotos ?? []).filter((f) => f.imagem).slice(0, 4)
      .map((f) => ({ imagem: f.imagem, link: profile, legenda: f.titulo, rotulo: 'Abrir o perfil no Instagram' }));
    if (!posts.length) return;
    grid.classList.add('insta__grid--teaser');
  }
  grid.append(...posts.map((p) => el('li', {}, [
    el('a', { href: p.link, target: '_blank', rel: 'noopener', 'aria-label': p.rotulo ?? 'Ver post no Instagram' }, [
      el('img', { src: asset(p.imagem), alt: p.legenda?.slice(0, 120) || 'Post do Instagram', loading: 'lazy', decoding: 'async' }),
    ]),
  ])));
  grid.hidden = false;
  $('[data-insta-empty]').hidden = !grid.classList.contains('insta__grid--teaser');
}

/* ---------- início ---------- */

setupChrome();
reveal($$('.reveal'));

if ($('[data-gallery]')) {
  loadContent().then(({ site, galeria, depoimentos, avaliacoes, instagram }) => {
    applySite(site);
    setupGallery(galeria);
    setupReviews(depoimentos);
    setupGoogleReviews(avaliacoes);
    setupInstagram(instagram, galeria);
  });
}
