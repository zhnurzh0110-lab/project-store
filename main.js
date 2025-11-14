// main.js
// Handles: API load (FakeStoreAPI), CRUD localStorage, search, lightbox, theme toggle, contact validation

const STORAGE_KEY = 'fashion_products_v2';
const API_URL = 'https://fakestoreapi.com/products';
let products = [];
let lightbox = null;

/* ---------- Helpers ---------- */
function genId(){ return 'p_' + Math.random().toString(36).slice(2,9); }
function saveProducts(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
function loadLocal(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch(e){ return null; } }
function escapeHtml(s){ return String(s).replace(/[&<>"'`]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;", "`":"&#96;"}[c])); }

/* ---------- Fetch from API (FakeStoreAPI) ---------- */
async function fetchFromAPI(){
  $('#apiStatus').text('API: loading...');
  try{
    const res = await fetch(API_URL);
    const data = await res.json();
    // map to our fields: id,title,price,thumb,large
    const mapped = data.map(item => ({
      id: 'api_' + item.id,
      title: item.title,
      price: item.price,
      thumb: item.image,
      large: item.image
    }));
    $('#apiStatus').text('API: loaded (' + mapped.length + ')');
    return mapped;
  }catch(err){
    console.error('API error', err);
    $('#apiStatus').text('API: error');
    return [];
  }
}

/* ---------- Init data source ---------- */
async function initProducts(){
  const local = loadLocal();
  if(local && Array.isArray(local) && local.length){
    products = local;
    renderGallery();
    $('#apiStatus').text('Using local edits');
  } else {
    const apiItems = await fetchFromAPI();
    // convert-api to our storage and persist as initial local baseline
    products = apiItems.map(it => ({ ...it }));
    saveProducts(products);
    renderGallery();
  }
}

/* ---------- Render gallery ---------- */
function renderGallery(filter=''){
  const $gallery = $('#gallery');
  $gallery.empty();

  const filtered = products.filter(p => p.title.toLowerCase().includes(filter.toLowerCase()));

  if(filtered.length === 0){
    $gallery.append('<div class="col-12"><div class="p-4 bg-card rounded text-center text-muted small">Ничего не найдено</div></div>');
  } else {
    filtered.forEach((p, idx) => {
      const card = `<div class="col anim-flip" data-id="${p.id}">
        <div class="card h-100">
          <a href="${escapeHtml(p.large)}" class="glightbox" data-gallery="products">
            <img src="${escapeHtml(p.thumb)}" class="card-img-top" alt="${escapeHtml(p.title)}">
          </a>
          <div class="card-body">
            <h6 class="card-title mb-1">${escapeHtml(p.title)}</h6>
            <p class="card-text small text-muted mb-2">Цена: <strong>${p.price}</strong></p>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-primary btn-sm btn-edit" data-id="${p.id}">Edit</button>
              <button class="btn btn-outline-danger btn-sm btn-delete ms-auto" data-id="${p.id}">Delete</button>
            </div>
          </div>
        </div>
      </div>`;
      $gallery.append(card);
      $gallery.find('.col').last().css('animation-delay', `${idx * 40}ms`);
    });
  }

  $('#itemsCount').text(products.length + ' items');

  // init GLightbox
  try { if(lightbox) lightbox.destroy(); } catch(e){}
  lightbox = GLightbox({ selector: '.glightbox', loop: true, touchNavigation: true, zoomable: true });

  attachCardButtons();
}

/* ---------- Attach dynamic handlers ---------- */
function attachCardButtons(){
  $('.btn-edit').off('click').on('click', function(){
    const id = $(this).data('id');
    const p = products.find(x => x.id === id);
    if(!p) return;
    $('#productId').val(p.id);
    $('#title').val(p.title);
    $('#price').val(p.price);
    $('#thumb').val(p.thumb);
    $('#large').val(p.large);
    $('html,body').animate({ scrollTop: $('aside').offset().top - 20 }, 300);
  });

  $('.btn-delete').off('click').on('click', function(){
    const id = $(this).data('id');
    const $col = $(`[data-id="${id}"]`);
    $col.find('.card').fadeOut(220, function(){
      products = products.filter(x => x.id !== id);
      saveProducts(products);
      renderGallery($('#searchInput').val());
    });
  });
}

/* ---------- Form Create/Update ---------- */
$('#productForm').on('submit', function(e){
  e.preventDefault();
  const id = $('#productId').val();
  const title = $('#title').val().trim();
  const price = parseFloat($('#price').val());
  const thumb = $('#thumb').val().trim();
  const large = $('#large').val().trim();

  if(!title || isNaN(price) || !thumb || !large){
    alert('Please fill all fields correctly.');
    return;
  }

  if(id){
    const idx = products.findIndex(x => x.id === id);
    if(idx !== -1){
      products[idx] = { ...products[idx], title, price, thumb, large };
      saveProducts(products);
      renderGallery($('#searchInput').val());
      $('#productForm')[0].reset();
      $('#productId').val('');
    }
  } else {
    const newItem = { id: genId(), title, price, thumb, large };
    products.unshift(newItem);
    saveProducts(products);
    renderGallery($('#searchInput').val());
    $('#productForm')[0].reset();
  }
});

/* ---------- Buttons ---------- */
$('#btnReset').on('click', function(){ $('#productForm')[0].reset(); $('#productId').val(''); });
$('#btnClearAll').on('click', function(){
  if(!confirm('Clear all local items?')) return;
  products = [];
  saveProducts(products);
  renderGallery();
});
$('#btnAddDemo').on('click', function(){
  const demo = { id: genId(), title: 'Demo ' + Math.floor(Math.random()*100), price: (Math.random()*100).toFixed(2), thumb: 'https://via.placeholder.com/400x400/111827/ffd966?text=Demo', large: 'https://via.placeholder.com/1200x1200/111827/ffd966?text=Demo' };
  products.unshift(demo);
  saveProducts(products);
  renderGallery();
});
$('#btnReloadAPI').on('click', async function(){
  const api = await fetchFromAPI();
  // do not overwrite local edits — ask user
  if(confirm('Reloading from API will overwrite local data. Continue?')){
    products = api;
    saveProducts(products);
    renderGallery();
  }
});

/* ---------- Search (jQuery fadeIn/fadeOut, hide/show) ---------- */
$('#searchInput').on('input', function(){
  const q = $(this).val().trim().toLowerCase();
  if(q === ''){ $('#gallery').find('.col').each(function(){ $(this).show(); }); $('#itemsCount').text(products.length + ' items'); return; }
  $('#gallery').find('.col').each(function(){
    const title = $(this).find('.card-title').text().toLowerCase();
    if(title.includes(q)){
      $(this).stop(true,true).fadeIn(200);
    } else {
      $(this).stop(true,true).fadeOut(160);
    }
  });
  const visible = $('#gallery').find('.col:visible').length;
  $('#itemsCount').text(visible + ' of ' + products.length);
});
$('#btnClearSearch').on('click', function(){ $('#searchInput').val('').trigger('input'); });

/* ---------- Theme toggle ---------- */
function setTheme(name){
  $('body').attr('data-theme', name);
  // update navbar class and card bg automatically via CSS
  localStorage.setItem('theme_mode', name);
  // animate briefly
  $('body').css('transition','background-color 320ms ease, color 320ms ease');
}
$('#themeToggle').on('change', function(){ setTheme(this.checked ? 'light' : 'dark'); });
$(function(){
  const t = localStorage.getItem('theme_mode') || 'dark';
  setTimeout(()=>{ setTheme(t); }, 20);
  $('#themeToggle').prop('checked', t === 'light');

  // Kick off initial load
  initProducts();

  // contact page bindings (if present)
  if($('#contactForm').length) initContactForm();
});

/* ---------- Contact form validation (used on contact.html) ---------- */
function initContactForm(){
  // email regex
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  function validatePassword(pw){
    const errors = [];
    if(pw.length < 8) errors.push('min 8 chars');
    if(!/[A-Z]/.test(pw)) errors.push('capital letter');
    if(!/[0-9]/.test(pw)) errors.push('digit');
    if(!/[!@#\$%\^&\*]/.test(pw)) errors.push('special char');
    return errors;
  }

  $('#contactForm').on('submit', function(e){
    e.preventDefault();
    const name = $('#conName').val() || '';
    const email = $('#conEmail').val() || '';
    const pw = $('#conPassword').val() || '';
    const pw2 = $('#conPassword2').val() || '';

    const errors = [];
    if(name.trim().length < 2) errors.push('Name too short');
    if(!emailRegex.test(email)) errors.push('Invalid email');
    const pwErr = validatePassword(pw);
    if(pwErr.length) errors.push('Password: ' + pwErr.join(', '));
    if(pw !== pw2) errors.push('Passwords do not match');

    if(errors.length){
      $('#contactErrors').removeClass('d-none').html('<ul class="mb-0"><li>' + errors.join('</li><li>') + '</li></ul>');
      $('#contactSuccess').addClass('d-none');
      return;
    }
    // success demo
    $('#contactErrors').addClass('d-none');
    $('#contactSuccess').removeClass('d-none');
    $('#contactForm')[0].reset();
  });

  $('#btnContactReset').on('click', function(){
    $('#contactForm')[0].reset();
    $('#contactErrors').addClass('d-none');
    $('#contactSuccess').addClass('d-none');
  });
}


$('#themeToggle').on('change', function() {
    setTheme(this.checked ? 'light' : 'dark');
});

