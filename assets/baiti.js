(() => {
  'use strict';

  const STORAGE_KEY = 'baitiMvpStateV1';
  const CURRENCY = 'ر.س';

  const defaultState = {
    view: 'customer',
    selectedCookId: 1,
    cart: [],
    orders: [],
    filters: {
      search: '',
      category: 'all',
      onlineOnly: false,
      liveOnly: false
    },
    customer: {
      name: '',
      phone: '',
      address: '',
      notes: ''
    },
    cooks: [
      {
        id: 1,
        name: 'أم محمد',
        district: 'حي المروج - تبوك',
        rating: 4.8,
        online: true,
        live: false,
        capacity: 5,
        avatar: '👩‍🍳',
        specialty: 'أكلات شعبية يومية',
        products: [
          { id: 'p-101', name: 'كبسة دجاج', category: 'rice', price: 32, prep: 45, available: true },
          { id: 'p-102', name: 'مناقيش جبنة', category: 'breakfast', price: 12, prep: 20, available: true },
          { id: 'p-103', name: 'سلطة خضراء', category: 'snack', price: 8, prep: 10, available: true }
        ]
      },
      {
        id: 2,
        name: 'أم سعيد',
        district: 'حي الورود - تبوك',
        rating: 4.5,
        online: false,
        live: false,
        capacity: 3,
        avatar: '🍯',
        specialty: 'فطور وحلويات منزلية',
        products: [
          { id: 'p-201', name: 'معصوب ملكي', category: 'breakfast', price: 18, prep: 25, available: true },
          { id: 'p-202', name: 'عصير برتقال طازج', category: 'breakfast', price: 9, prep: 8, available: true },
          { id: 'p-203', name: 'لقيمات بالعسل', category: 'dessert', price: 16, prep: 30, available: true }
        ]
      },
      {
        id: 3,
        name: 'أم سلمان',
        district: 'حي سلطانة - تبوك',
        rating: 4.9,
        online: true,
        live: true,
        capacity: 4,
        avatar: '🔥',
        specialty: 'كبسات ومناسبات صغيرة',
        products: [
          { id: 'p-301', name: 'كبسة لحم', category: 'rice', price: 48, prep: 60, available: true },
          { id: 'p-302', name: 'حلى قهوة', category: 'dessert', price: 22, prep: 35, available: true },
          { id: 'p-303', name: 'سمبوسة مشكلة', category: 'snack', price: 20, prep: 40, available: true }
        ]
      },
      {
        id: 4,
        name: 'أم إبراهيم',
        district: 'حي النهضة - تبوك',
        rating: 4.7,
        online: true,
        live: false,
        capacity: 6,
        avatar: '🥣',
        specialty: 'مقبلات وشوربات',
        products: [
          { id: 'p-401', name: 'سمبوسة جبن', category: 'snack', price: 15, prep: 25, available: true },
          { id: 'p-402', name: 'شوربة عدس', category: 'snack', price: 10, prep: 20, available: true },
          { id: 'p-403', name: 'كنافة نابلسية', category: 'dessert', price: 28, prep: 45, available: true }
        ]
      }
    ]
  };

  let state = loadState();
  let toastTimer;
  let syncTimer;

  const backend = {
    mode: 'local',
    connected: false,
    client: null,
    lastSync: null,
    error: null
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function safeClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeState(input) {
    const parsed = input && typeof input === 'object' ? input : {};
    const merged = {
      ...safeClone(defaultState),
      ...parsed,
      filters: { ...safeClone(defaultState.filters), ...(parsed.filters || {}) },
      customer: { ...safeClone(defaultState.customer), ...(parsed.customer || {}) }
    };
    merged.cooks = Array.isArray(parsed.cooks) && parsed.cooks.length ? parsed.cooks : safeClone(defaultState.cooks);
    merged.cart = Array.isArray(parsed.cart) ? parsed.cart : [];
    merged.orders = Array.isArray(parsed.orders) ? parsed.orders : [];
    return merged;
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return safeClone(defaultState);
      return mergeState(JSON.parse(saved));
    } catch (error) {
      console.warn('Failed to load Baiti state:', error);
      return safeClone(defaultState);
    }
  }

  function getConfig() {
    const config = window.BAITI_CONFIG || {};
    return {
      backend: config.backend || 'local',
      supabaseUrl: (config.supabaseUrl || '').trim(),
      supabaseAnonKey: (config.supabaseAnonKey || '').trim(),
      tableName: config.tableName || 'baiti_app_state',
      stateId: config.stateId || 'public-demo'
    };
  }

  async function initBackend() {
    const config = getConfig();
    const hasSupabaseConfig = config.backend === 'supabase' && config.supabaseUrl && config.supabaseAnonKey;
    const hasClientFactory = Boolean(window.supabase && typeof window.supabase.createClient === 'function');

    if (!hasSupabaseConfig || !hasClientFactory) {
      backend.mode = 'local';
      backend.connected = false;
      backend.error = hasSupabaseConfig ? 'تعذر تحميل مكتبة Supabase.' : 'لم يتم إدخال مفاتيح Supabase بعد.';
      renderBackendStatus();
      return;
    }

    try {
      backend.mode = 'supabase';
      backend.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

      const { data, error } = await backend.client
        .from(config.tableName)
        .select('data, updated_at')
        .eq('id', config.stateId)
        .maybeSingle();

      if (error) throw error;

      if (data && data.data && Object.keys(data.data).length) {
        state = mergeState(data.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } else {
        await syncToSupabase(true);
      }

      backend.connected = true;
      backend.error = null;
      backend.lastSync = data?.updated_at || new Date().toISOString();
      renderBackendStatus();
      showToast('تم ربط بيتِيّ بقاعدة Supabase ✅');
    } catch (error) {
      backend.mode = 'local';
      backend.connected = false;
      backend.error = error.message || 'تعذر الاتصال بـ Supabase.';
      console.warn('Supabase connection failed:', error);
      renderBackendStatus();
      showToast('تعذر الاتصال بقاعدة البيانات، يعمل النموذج محلياً.');
    }
  }

  function saveState(options = {}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (backend.connected && options.remote !== false) queueRemoteSave();
    renderBackendStatus();
  }

  function queueRemoteSave() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncToSupabase(false), 450);
  }

  async function syncToSupabase(silent = false) {
    const config = getConfig();
    if (!backend.client || backend.mode !== 'supabase') return;

    try {
      const { error } = await backend.client
        .from(config.tableName)
        .upsert({
          id: config.stateId,
          data: state,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;
      backend.connected = true;
      backend.error = null;
      backend.lastSync = new Date().toISOString();
      renderBackendStatus();
      if (!silent) console.info('Baiti state synced to Supabase');
    } catch (error) {
      backend.connected = false;
      backend.error = error.message || 'فشل حفظ البيانات في Supabase.';
      console.warn('Supabase sync failed:', error);
      renderBackendStatus();
    }
  }

  function renderBackendStatus() {
    const status = $('#backendStatus');
    if (!status) return;
    const config = getConfig();
    if (backend.connected) {
      const time = backend.lastSync ? new Date(backend.lastSync).toLocaleString('ar-SA') : 'الآن';
      status.textContent = `✅ متصل بقاعدة Supabase — آخر مزامنة: ${time}`;
      return;
    }
    if (config.backend === 'supabase' && (!config.supabaseUrl || !config.supabaseAnonKey)) {
      status.textContent = '⚠️ جاهز للربط: أدخل رابط Supabase و anon key في assets/baiti-config.js. حالياً يعمل عبر localStorage.';
      return;
    }
    status.textContent = `💾 يعمل محلياً عبر localStorage${backend.error ? ` — ${backend.error}` : ''}`;
  }

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function formatMoney(value) {
    return `${Number(value || 0).toFixed(0)} ${CURRENCY}`;
  }

  function getCook(cookId) {
    return state.cooks.find((cook) => Number(cook.id) === Number(cookId));
  }

  function getProduct(cookId, productId) {
    const cook = getCook(cookId);
    if (!cook) return null;
    return cook.products.find((product) => product.id === productId) || null;
  }

  function getActiveOrdersForCook(cookId) {
    return state.orders.filter((order) => Number(order.cookId) === Number(cookId) && !['delivered', 'cancelled'].includes(order.status));
  }

  function canCookAccept(cook) {
    if (!cook || !cook.online) return false;
    return getActiveOrdersForCook(cook.id).length < cook.capacity;
  }

  function statusLabel(status) {
    return {
      pending: 'بانتظار قبول الطباخة',
      accepted: 'تم القبول',
      preparing: 'قيد التحضير',
      ready: 'جاهز للتسليم',
      delivered: 'تم التسليم',
      cancelled: 'ملغي'
    }[status] || status;
  }

  function statusStep(status) {
    return { pending: 0, accepted: 1, preparing: 2, ready: 3, delivered: 4, cancelled: 0 }[status] ?? 0;
  }

  function categoryLabel(category) {
    return {
      rice: 'كبسات وأرز',
      breakfast: 'فطور',
      dessert: 'حلويات',
      snack: 'مقبلات'
    }[category] || 'عام';
  }

  function generateOrderId() {
    const seed = Math.floor(Math.random() * 9000) + 1000;
    return `BT-${new Date().getFullYear()}-${seed}`;
  }

  function setView(viewName, options = {}) {
    state.view = viewName;
    saveState();
    $$('.app-view').forEach((view) => view.classList.remove('active'));
    $(`#${viewName}View`)?.classList.add('active');
    $$('.view-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === viewName));
    if (options.scroll !== false) window.scrollTo({ top: 0, behavior: 'smooth' });
    render();
  }

  function addToCart(cookId, productId) {
    const cook = getCook(cookId);
    const product = getProduct(cookId, productId);
    if (!cook || !product || !product.available) return showToast('هذا المنتج غير متاح حالياً.');
    if (!canCookAccept(cook)) return showToast('الطباخة غير متاحة أو طاقتها ممتلئة حالياً.');

    const existing = state.cart.find((item) => Number(item.cookId) === Number(cookId) && item.productId === productId);
    if (existing) existing.qty += 1;
    else state.cart.push({ cookId: Number(cookId), productId, qty: 1, addedAt: new Date().toISOString() });

    saveState();
    render();
    showToast(`تمت إضافة ${product.name} إلى السلة 🧺`);
  }

  function updateCartQty(index, delta) {
    const item = state.cart[index];
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) state.cart.splice(index, 1);
    saveState();
    render();
  }

  function removeCartItem(index) {
    state.cart.splice(index, 1);
    saveState();
    render();
  }

  function cartTotals() {
    return state.cart.reduce((summary, item) => {
      const product = getProduct(item.cookId, item.productId);
      if (!product) return summary;
      summary.subtotal += product.price * item.qty;
      summary.items += item.qty;
      summary.prep = Math.max(summary.prep, product.prep || 0);
      return summary;
    }, { subtotal: 0, items: 0, prep: 0 });
  }

  function groupCartByCook() {
    return state.cart.reduce((groups, item) => {
      const cookId = Number(item.cookId);
      if (!groups[cookId]) groups[cookId] = [];
      groups[cookId].push(item);
      return groups;
    }, {});
  }

  function checkout(event) {
    event.preventDefault();
    if (!state.cart.length) return showToast('السلة فارغة. أضف منتجاً أولاً.');

    const customer = {
      name: $('#customerName')?.value.trim() || '',
      phone: $('#customerPhone')?.value.trim() || '',
      address: $('#customerAddress')?.value.trim() || '',
      notes: $('#customerNotes')?.value.trim() || ''
    };

    if (!customer.name || !customer.phone || !customer.address) return showToast('أكمل الاسم والجوال والعنوان قبل تأكيد الطلب.');

    const grouped = groupCartByCook();
    const newOrders = [];

    Object.entries(grouped).forEach(([cookId, items]) => {
      const cook = getCook(cookId);
      if (!canCookAccept(cook)) return;
      const orderItems = items.map((item) => {
        const product = getProduct(item.cookId, item.productId);
        return {
          productId: item.productId,
          name: product.name,
          price: product.price,
          qty: item.qty,
          prep: product.prep,
          category: product.category
        };
      });
      const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
      newOrders.push({
        id: generateOrderId(),
        cookId: Number(cookId),
        cookName: cook.name,
        customer,
        items: orderItems,
        subtotal,
        deliveryFee: 0,
        total: subtotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
        timeline: [{ status: 'pending', at: new Date().toISOString(), note: 'تم تسجيل الطلب' }]
      });
    });

    if (!newOrders.length) return showToast('تعذر إنشاء الطلب: الطباخة غير متاحة أو ممتلئة.');

    state.orders.unshift(...newOrders);
    state.cart = [];
    state.customer = customer;
    saveState();
    setView('cart');
    showToast(`تم إنشاء ${newOrders.length} طلب بنجاح ✅`);
  }

  function updateOrderStatus(orderId, nextStatus) {
    const order = state.orders.find((item) => item.id === orderId);
    if (!order) return;
    order.status = nextStatus;
    order.timeline.push({ status: nextStatus, at: new Date().toISOString(), note: statusLabel(nextStatus) });
    saveState();
    render();
    showToast(`تم تحديث الطلب ${order.id}: ${statusLabel(nextStatus)}`);
  }

  function cancelOrder(orderId) {
    const order = state.orders.find((item) => item.id === orderId);
    if (!order || ['ready', 'delivered'].includes(order.status)) return showToast('لا يمكن إلغاء الطلب في هذه المرحلة.');
    updateOrderStatus(orderId, 'cancelled');
  }

  function simulateOrder() {
    const cook = getCook(state.selectedCookId);
    if (!canCookAccept(cook)) return showToast('لا يمكن المحاكاة: الحساب غير متصل أو الطاقة ممتلئة.');
    const product = cook.products[0];
    const order = {
      id: generateOrderId(),
      cookId: cook.id,
      cookName: cook.name,
      customer: { name: 'عميل تجريبي', phone: '0500000000', address: cook.district, notes: 'طلب محاكاة' },
      items: [{ productId: product.id, name: product.name, price: product.price, qty: 1, prep: product.prep, category: product.category }],
      subtotal: product.price,
      deliveryFee: 0,
      total: product.price,
      status: 'pending',
      createdAt: new Date().toISOString(),
      timeline: [{ status: 'pending', at: new Date().toISOString(), note: 'تم تسجيل طلب تجريبي' }]
    };
    state.orders.unshift(order);
    saveState();
    render();
    showToast(`وصل طلب تجريبي إلى ${cook.name}`);
  }

  function resetApp() {
    const ok = window.confirm('سيتم حذف بيانات النموذج من هذا المتصفح ومزامنة الحالة الجديدة إن كانت Supabase مفعلة. هل تريد المتابعة؟');
    if (!ok) return;
    state = safeClone(defaultState);
    saveState();
    render();
    setView('customer');
    showToast('تمت إعادة ضبط النموذج.');
  }

  function exportData() {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `baiti-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('تم تجهيز ملف التصدير.');
  }

  function clearDelivered() {
    const before = state.orders.length;
    state.orders = state.orders.filter((order) => !['delivered', 'cancelled'].includes(order.status));
    saveState();
    render();
    showToast(`تم إخفاء ${before - state.orders.length} طلب منتهٍ.`);
  }

  function resetFilters() {
    state.filters = safeClone(defaultState.filters);
    saveState();
    hydrateFilters();
    render();
  }

  function hydrateFilters() {
    const search = $('#searchInput');
    const category = $('#categoryFilter');
    const onlineOnly = $('#onlineOnlyFilter');
    const liveOnly = $('#liveOnlyFilter');
    if (search) search.value = state.filters.search;
    if (category) category.value = state.filters.category;
    if (onlineOnly) onlineOnly.checked = state.filters.onlineOnly;
    if (liveOnly) liveOnly.checked = state.filters.liveOnly;
  }

  function hydrateCustomerForm() {
    $('#customerName') && ($('#customerName').value = state.customer.name || '');
    $('#customerPhone') && ($('#customerPhone').value = state.customer.phone || '');
    $('#customerAddress') && ($('#customerAddress').value = state.customer.address || '');
    $('#customerNotes') && ($('#customerNotes').value = state.customer.notes || '');
  }

  function renderMetrics() {
    const online = state.cooks.filter((cook) => cook.online).length;
    const live = state.cooks.filter((cook) => cook.live).length;
    const activeOrders = state.orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length;
    $('#metricOnline') && ($('#metricOnline').textContent = online);
    $('#metricLive') && ($('#metricLive').textContent = live);
    $('#metricOrders') && ($('#metricOrders').textContent = activeOrders);
    $('#cartCount') && ($('#cartCount').textContent = cartTotals().items);
  }

  function filteredCooks() {
    const searchTerm = state.filters.search.trim().toLowerCase();
    return state.cooks.filter((cook) => {
      const active = canCookAccept(cook);
      const text = [cook.name, cook.district, cook.specialty, ...cook.products.map((product) => product.name)].join(' ').toLowerCase();
      const categoryMatch = state.filters.category === 'all' || cook.products.some((product) => product.category === state.filters.category);
      const searchMatch = !searchTerm || text.includes(searchTerm);
      const onlineMatch = !state.filters.onlineOnly || active;
      const liveMatch = !state.filters.liveOnly || cook.live;
      return categoryMatch && searchMatch && onlineMatch && liveMatch;
    });
  }

  function renderCookGrid() {
    const container = $('#cookGrid');
    if (!container) return;
    const list = filteredCooks();
    if (!list.length) {
      container.innerHTML = '<div class="empty-state">لا توجد نتائج مطابقة. جرّب تقليل الفلاتر.</div>';
      return;
    }
    container.innerHTML = list.map((cook) => {
      const activeOrders = getActiveOrdersForCook(cook.id).length;
      const isFull = activeOrders >= cook.capacity;
      const canOrder = canCookAccept(cook);
      const productCards = cook.products
        .filter((product) => state.filters.category === 'all' || product.category === state.filters.category)
        .map((product) => `
          <div class="product-card">
            <div>
              <div class="product-title">${product.name}</div>
              <div class="product-meta">${categoryLabel(product.category)} · ${product.prep} دقيقة</div>
            </div>
            <div>
              <div class="price">${formatMoney(product.price)}</div>
              <button class="btn btn-soft" data-add-cart="${cook.id}|${product.id}" ${canOrder ? '' : 'disabled'} type="button">أضف</button>
            </div>
          </div>`).join('');
      return `
        <article class="cook-card">
          <div class="cook-top">
            <div class="cook-id">
              <div class="avatar">${cook.avatar}</div>
              <div>
                <div class="cook-name">${cook.name}</div>
                <div class="cook-meta">${cook.district} · ⭐ ${cook.rating}</div>
              </div>
            </div>
            <div class="badges">
              <span class="badge ${cook.online ? 'online' : 'offline'}">${cook.online ? 'متصلة' : 'غير متصلة'}</span>
              ${cook.live ? '<span class="badge live">بث مباشر</span>' : ''}
              ${isFull ? '<span class="badge full">ممتلئة</span>' : ''}
            </div>
          </div>
          <p class="muted">${cook.specialty}</p>
          <div class="status-row"><span>الطلبات النشطة</span><strong>${activeOrders} / ${cook.capacity}</strong></div>
          <div class="product-list">${productCards}</div>
        </article>`;
    }).join('');
  }

  function renderCart() {
    const itemsContainer = $('#cartItems');
    const summaryContainer = $('#cartSummary');
    if (!itemsContainer || !summaryContainer) return;

    if (!state.cart.length) {
      itemsContainer.innerHTML = '<div class="empty-state">السلة فارغة. انتقل إلى السوق وأضف وجبة.</div>';
      summaryContainer.innerHTML = '';
      return;
    }

    itemsContainer.innerHTML = state.cart.map((item, index) => {
      const cook = getCook(item.cookId);
      const product = getProduct(item.cookId, item.productId);
      if (!cook || !product) return '';
      return `
        <div class="cart-item">
          <div class="cart-line">
            <div>
              <strong>${product.name}</strong>
              <div class="muted">${cook.name} · ${categoryLabel(product.category)} · ${product.prep} دقيقة</div>
            </div>
            <strong>${formatMoney(product.price * item.qty)}</strong>
          </div>
          <div class="cart-line">
            <div class="qty-controls">
              <button data-cart-delta="${index}|-1" type="button">−</button>
              <strong>${item.qty}</strong>
              <button data-cart-delta="${index}|1" type="button">+</button>
            </div>
            <button class="btn btn-soft" data-remove-cart="${index}" type="button">حذف</button>
          </div>
        </div>`;
    }).join('');

    const totals = cartTotals();
    summaryContainer.innerHTML = `
      <div class="summary-row"><span>عدد المنتجات</span><strong>${totals.items}</strong></div>
      <div class="summary-row"><span>أطول وقت تحضير تقديري</span><strong>${totals.prep} دقيقة</strong></div>
      <div class="summary-row"><span>الإجمالي التجريبي</span><strong>${formatMoney(totals.subtotal)}</strong></div>`;
  }

  function renderCustomerOrders() {
    const container = $('#customerOrders');
    if (!container) return;
    if (!state.orders.length) {
      container.innerHTML = '<div class="empty-state">لا توجد طلبات بعد.</div>';
      return;
    }
    container.innerHTML = state.orders.map((order) => orderHtml(order, 'customer')).join('');
  }

  function renderCookSelector() {
    const selector = $('#cookSelector');
    if (!selector) return;
    selector.innerHTML = state.cooks.map((cook) => `<option value="${cook.id}">${cook.name} — ${cook.district}</option>`).join('');
    selector.value = String(state.selectedCookId);
  }

  function renderCookDashboard() {
    const cook = getCook(state.selectedCookId) || state.cooks[0];
    state.selectedCookId = cook.id;
    const activeOrders = getActiveOrdersForCook(cook.id).length;

    const profile = $('#cookProfileCard');
    if (profile) {
      profile.innerHTML = `
        <div class="cook-id">
          <div class="avatar">${cook.avatar}</div>
          <div>
            <h3>${cook.name}</h3>
            <p class="muted">${cook.specialty}</p>
            <p class="muted">${cook.district} · ⭐ ${cook.rating}</p>
          </div>
        </div>
        <div class="status-row" style="margin-top:12px;"><span>الطلبات النشطة</span><strong>${activeOrders} / ${cook.capacity}</strong></div>`;
    }

    const onlineToggle = $('#cookOnlineToggle');
    const liveToggle = $('#cookLiveToggle');
    const capacityRange = $('#capacityRange');
    const capacityLabel = $('#capacityLabel');
    if (onlineToggle) onlineToggle.checked = cook.online;
    if (liveToggle) liveToggle.checked = cook.live;
    if (capacityRange) capacityRange.value = cook.capacity;
    if (capacityLabel) capacityLabel.textContent = `${cook.capacity} طلبات كحد أقصى`;

    const orders = state.orders.filter((order) => Number(order.cookId) === Number(cook.id));
    const badge = $('#cookOrdersBadge');
    if (badge) badge.textContent = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length;
    const list = $('#cookOrdersList');
    if (!list) return;
    if (!orders.length) {
      list.innerHTML = '<div class="empty-state">لا توجد طلبات لهذا الحساب.</div>';
      return;
    }
    list.innerHTML = orders.map((order) => orderHtml(order, 'cook')).join('');
  }

  function orderHtml(order, mode) {
    const step = statusStep(order.status);
    const steps = ['تسجيل', 'قبول', 'تحضير', 'جاهز', 'تسليم'];
    const items = order.items.map((item) => `${item.qty}× ${item.name}`).join('، ');
    const actions = mode === 'cook' ? cookOrderActions(order) : customerOrderActions(order);
    return `
      <article class="order-card">
        <div class="cart-line">
          <div>
            <strong>${order.id}</strong>
            <div class="order-meta">${mode === 'cook' ? order.customer.name : order.cookName} · ${new Date(order.createdAt).toLocaleString('ar-SA')}</div>
          </div>
          <span class="badge status">${statusLabel(order.status)}</span>
        </div>
        <div class="muted">${items}</div>
        <div class="status-row"><span>الإجمالي</span><strong>${formatMoney(order.total)}</strong></div>
        ${mode === 'cook' ? `<div class="muted">📍 ${order.customer.address} · 📞 ${order.customer.phone}</div>` : ''}
        ${order.customer.notes ? `<div class="muted">📝 ${order.customer.notes}</div>` : ''}
        <div class="progress">${steps.map((label, index) => `<div class="progress-step ${index <= step && order.status !== 'cancelled' ? 'active' : ''}">${label}</div>`).join('')}</div>
        ${actions ? `<div class="order-actions">${actions}</div>` : ''}
      </article>`;
  }

  function cookOrderActions(order) {
    if (order.status === 'pending') return `<button class="btn btn-primary" data-order-status="${order.id}|accepted" type="button">قبول</button><button class="btn btn-danger" data-order-status="${order.id}|cancelled" type="button">رفض</button>`;
    if (order.status === 'accepted') return `<button class="btn btn-primary" data-order-status="${order.id}|preparing" type="button">بدء التحضير</button>`;
    if (order.status === 'preparing') return `<button class="btn btn-primary" data-order-status="${order.id}|ready" type="button">جاهز</button>`;
    if (order.status === 'ready') return `<button class="btn btn-primary" data-order-status="${order.id}|delivered" type="button">تم التسليم</button>`;
    return '';
  }

  function customerOrderActions(order) {
    if (['pending', 'accepted'].includes(order.status)) return `<button class="btn btn-soft" data-cancel-order="${order.id}" type="button">إلغاء الطلب</button>`;
    return '';
  }

  function renderLive() {
    const container = $('#liveGrid');
    if (!container) return;
    const liveCooks = state.cooks.filter((cook) => cook.live);
    if (!liveCooks.length) {
      container.innerHTML = '<div class="empty-state">لا يوجد بث مباشر حالياً. فعّل البث من لوحة الطباخة.</div>';
      return;
    }
    container.innerHTML = liveCooks.map((cook) => {
      const mainProduct = cook.products[0];
      return `
        <article class="live-card">
          <div class="live-screen">
            <div>
              <div style="font-size:2.3rem;">${cook.avatar}</div>
              <strong>🔴 ${cook.name} تبث الآن</strong>
              <p>${mainProduct.name} قيد التحضير</p>
            </div>
          </div>
          <div class="live-body">
            <div class="status-row"><span>${cook.district}</span><strong>${formatMoney(mainProduct.price)}</strong></div>
            <div class="comment-box">
              <input type="text" placeholder="اكتب تعليقاً تجريبياً..." />
              <button class="btn btn-soft" data-live-comment="${cook.id}" type="button">إرسال</button>
            </div>
            <button class="btn btn-primary full" data-add-cart="${cook.id}|${mainProduct.id}" ${canCookAccept(cook) ? '' : 'disabled'} type="button">اطلب وجبة البث</button>
          </div>
        </article>`;
    }).join('');
  }

  function renderStats() {
    const container = $('#statsGrid');
    if (!container) return;
    const active = state.orders.filter((order) => !['delivered', 'cancelled'].includes(order.status));
    const revenue = state.orders.filter((order) => order.status === 'delivered').reduce((sum, order) => sum + order.total, 0);
    const pending = state.orders.filter((order) => order.status === 'pending').length;
    const cart = cartTotals();
    const stats = [
      ['الطباخات', state.cooks.length, 'حسابات تجريبية جاهزة'],
      ['المتصلات', state.cooks.filter((cook) => cook.online).length, 'قابلات لاستقبال الطلب'],
      ['طلبات نشطة', active.length, 'غير مسلّمة أو ملغية'],
      ['بانتظار القبول', pending, 'تحتاج إجراء من الطباخة'],
      ['قيمة السلة', formatMoney(cart.subtotal), 'إجمالي قبل التأكيد'],
      ['مبيعات مسلّمة', formatMoney(revenue), 'محاكاة فقط']
    ];
    container.innerHTML = stats.map(([title, value, note]) => `
      <article class="stat-card">
        <span class="muted">${title}</span>
        <strong>${value}</strong>
        <p class="muted">${note}</p>
      </article>`).join('');
  }

  function render() {
    renderMetrics();
    renderCookGrid();
    renderCart();
    renderCustomerOrders();
    renderCookSelector();
    renderCookDashboard();
    renderLive();
    renderStats();
    renderBackendStatus();
  }

  function bindEvents() {
    $$('.view-tab').forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));
    $$('[data-view-jump]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.viewJump)));

    $('#searchInput')?.addEventListener('input', (event) => {
      state.filters.search = event.target.value;
      saveState();
      renderCookGrid();
    });
    $('#categoryFilter')?.addEventListener('change', (event) => {
      state.filters.category = event.target.value;
      saveState();
      renderCookGrid();
    });
    $('#onlineOnlyFilter')?.addEventListener('change', (event) => {
      state.filters.onlineOnly = event.target.checked;
      saveState();
      renderCookGrid();
    });
    $('#liveOnlyFilter')?.addEventListener('change', (event) => {
      state.filters.liveOnly = event.target.checked;
      saveState();
      renderCookGrid();
    });
    $('#resetFiltersBtn')?.addEventListener('click', resetFilters);

    document.addEventListener('click', (event) => {
      const addButton = event.target.closest('[data-add-cart]');
      if (addButton) {
        const [cookId, productId] = addButton.dataset.addCart.split('|');
        addToCart(Number(cookId), productId);
        return;
      }

      const cartDelta = event.target.closest('[data-cart-delta]');
      if (cartDelta) {
        const [index, delta] = cartDelta.dataset.cartDelta.split('|').map(Number);
        updateCartQty(index, delta);
        return;
      }

      const removeCart = event.target.closest('[data-remove-cart]');
      if (removeCart) {
        removeCartItem(Number(removeCart.dataset.removeCart));
        return;
      }

      const orderStatus = event.target.closest('[data-order-status]');
      if (orderStatus) {
        const [orderId, nextStatus] = orderStatus.dataset.orderStatus.split('|');
        updateOrderStatus(orderId, nextStatus);
        return;
      }

      const cancelButton = event.target.closest('[data-cancel-order]');
      if (cancelButton) {
        cancelOrder(cancelButton.dataset.cancelOrder);
        return;
      }

      const liveComment = event.target.closest('[data-live-comment]');
      if (liveComment) showToast('تم إرسال التعليق التجريبي للبث.');
    });

    $('#checkoutForm')?.addEventListener('submit', checkout);
    $('#clearCartBtn')?.addEventListener('click', () => {
      state.cart = [];
      saveState();
      render();
      showToast('تم تفريغ السلة.');
    });
    $('#clearDeliveredBtn')?.addEventListener('click', clearDelivered);

    $('#cookSelector')?.addEventListener('change', (event) => {
      state.selectedCookId = Number(event.target.value);
      saveState();
      renderCookDashboard();
    });
    $('#cookOnlineToggle')?.addEventListener('change', (event) => {
      const cook = getCook(state.selectedCookId);
      cook.online = event.target.checked;
      saveState();
      render();
      showToast(cook.online ? `${cook.name} أصبحت متصلة.` : `${cook.name} أصبحت غير متصلة.`);
    });
    $('#cookLiveToggle')?.addEventListener('change', (event) => {
      const cook = getCook(state.selectedCookId);
      cook.live = event.target.checked;
      if (cook.live) cook.online = true;
      saveState();
      render();
      showToast(cook.live ? `تم تفعيل بث ${cook.name}.` : `تم إيقاف بث ${cook.name}.`);
    });
    $('#capacityRange')?.addEventListener('input', (event) => {
      const cook = getCook(state.selectedCookId);
      cook.capacity = Number(event.target.value);
      saveState();
      render();
    });
    $('#simulateOrderBtn')?.addEventListener('click', simulateOrder);
    $('#exportDataBtn')?.addEventListener('click', exportData);
    $('#resetAppBtn')?.addEventListener('click', resetApp);
  }

  async function initApp() {
    hydrateFilters();
    hydrateCustomerForm();
    bindEvents();
    render();
    setView(state.view || 'customer', { scroll: false });
    await initBackend();
    hydrateFilters();
    hydrateCustomerForm();
    render();
    setView(state.view || 'customer', { scroll: false });
  }

  document.addEventListener('DOMContentLoaded', initApp);
})();
