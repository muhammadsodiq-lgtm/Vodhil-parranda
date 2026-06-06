// ============================================================
//  VOHDIL PARRANDA — config.js dan: TELEGRAM_BOT_TOKEN,
//  TELEGRAM_CHAT_IDS, GIST_ID, GIST_TOKEN, ADMIN_EMAILS
// ============================================================

let PRODUCTS = [];

function fmt(n)   { return Number(n).toLocaleString('uz-UZ') + " so'm"; }
function fmtKg(n) { const v=parseFloat(n)||0; return v%1===0?v+" kg":v.toFixed(1)+" kg"; }

// ── 3D PARALLAX EFFEKT (Hero Banner) ──────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const heroBanner = document.querySelector('.hero-banner');
    const heroImg = document.querySelector('.hero-img');
    
    if (heroBanner && heroImg) {
        heroBanner.addEventListener('mousemove', (e) => {
            const rect = heroBanner.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / centerY * 8;
            const rotateY = (centerX - x) / centerX * 8;
            
            heroImg.style.transform = `scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        
        heroBanner.addEventListener('mouseleave', () => {
            heroImg.style.transform = 'scale(1) rotateX(0) rotateY(0)';
        });
    }
    
    // Kartochkalarga 3D effekt
    const priceCards = document.querySelectorAll('.price-card');
    priceCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / centerY * 5;
            const rotateY = (centerX - x) / centerX * 5;
            
            card.style.transform = `translateY(-8px) translateZ(30px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) translateZ(0) rotateX(0) rotateY(0) scale(1)';
        });
    });
});

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => { initApp(); });

async function initApp() {
    await loadPricesFromGist();
    checkAccess();
}

// ── GIST DAN NARXLARNI YUKLASH ────────────────────────────
async function loadPricesFromGist() {
    // HARDCODED NARXLAR - Gist kerak emas
    PRODUCTS = [
        {"id":1,"name":"Tovuq Filesi","price":37000,"emoji":"🍗","image":"images/1.jpg"},
        {"id":2,"name":"Golin oyoqchalar","price":34000,"emoji":"🦴","image":"images/2.jpg"},
        {"id":3,"name":"Qanotchalar","price":37000,"emoji":"🍗","image":"images/3.jpg"},
        {"id":4,"name":"Akarachka","price":28000,"emoji":"🍖","image":"images/4.jpg"},
        {"id":5,"name":"Bedro son qismi","price":30500,"emoji":"🍖","image":"images/5.jpg"},
        {"id":6,"name":"Butun tovuq","price":28000,"emoji":"🐓","image":"images/8.jpg"},
        {"id":7,"name":"Yarimta tovuq","price":28000,"emoji":"🐔","image":"images/7.jpg"},
        {"id":8,"name":"Shorvalik","price":15000,"emoji":"🍲","image":"images/6.jpg"},
        {"id":9,"name":"Marinad bo'lgan","price":36000,"emoji":"🌶️","image":"images/9.jpg"},
        {"id":10,"name":"Mol go'shtlik kolbasa","price":150000,"emoji":"🌭","image":"images/10.jpg"},
        {"id":11,"name":"Tovuq go'shtlik kolbasa","price":85000,"emoji":"🌭","image":"images/11.jpg"}
    ];
    renderPrices();
}

// ── KIRISH RUXSATI ────────────────────────────────────────
const VISITOR_KEY = 'vp_visitor_id';
const ACCESS_KEY  = 'vp_access';

function getVisitorId() {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
        id = 'V-' + Date.now() + '-' + Math.random().toString(36).slice(2,7);
        localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
}

async function checkAccess() {
    const visitorId = getVisitorId();
    const access    = localStorage.getItem(ACCESS_KEY);

    if (access === 'granted') { showMainContent(); return; }
    if (access === 'blocked') { showBlocked(); return; }

    // file:// yoki localhost — darhol kirish
    if (window.location.protocol === 'file:' || window.location.hostname === 'localhost') {
        grantAccess(); return;
    }

    // https:// — Telegram orqali ruxsat so'rash
    showWaiting();
    await sendAccessRequest(visitorId);
    pollAccessStatus(visitorId);
}

async function sendAccessRequest(visitorId) {
    const msg =
`🔔 *VOHDIL PARRANDA — Kirish so'rovi*

👤 Visitor ID: \`${visitorId}\`
📅 Vaqt: ${new Date().toLocaleString('uz-UZ')}

Saytga kirmoqchi. Ruxsat berasizmi?`;

    for (const chatId of TELEGRAM_CHAT_IDS) {
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    chat_id: chatId, text: msg, parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [[
                        { text: "✅ Ruxsat berish", callback_data: `access_grant_${visitorId}` },
                        { text: "🚫 Bloklash",       callback_data: `access_block_${visitorId}` }
                    ]]}
                })
            });
        } catch(e) {}
    }
}

let pollTimer = null;
function pollAccessStatus(visitorId) {
    let lastUpdateId = 0;
    pollTimer = setInterval(async () => {
        try {
            const url = lastUpdateId
                ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId+1}&limit=50`
                : `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?limit=50`;
            const res  = await fetch(url);
            const data = await res.json();
            if (!data.ok || !data.result.length) return;
            for (const update of data.result) {
                if (update.update_id > lastUpdateId) lastUpdateId = update.update_id;
                const cbData = update.callback_query?.data || '';
                if (cbData === `access_grant_${visitorId}`) {
                    clearInterval(pollTimer);
                    try { await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                        method:'POST', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({callback_query_id: update.callback_query.id, text:'✅ Ruxsat berildi!'})
                    }); } catch(e) {}
                    grantAccess(); return;
                }
                if (cbData === `access_block_${visitorId}`) {
                    clearInterval(pollTimer);
                    try { await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                        method:'POST', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({callback_query_id: update.callback_query.id, text:'🚫 Bloklandi!'})
                    }); } catch(e) {}
                    blockAccess(); return;
                }
            }
        } catch(e) {}
    }, 2000);
}

function grantAccess() {
    localStorage.setItem(ACCESS_KEY, 'granted');
    showMainContent();
}
function blockAccess() {
    localStorage.setItem(ACCESS_KEY, 'blocked');
    showBlocked();
}

function showMainContent() {
    document.getElementById('accessScreen').style.display = 'none';
    document.getElementById('mainContent').style.display  = 'block';
    addProductLine();
    setupPayment();
    setupLocation();
    setupSubmit();
    document.getElementById('addLineBtn').addEventListener('click', addProductLine);
    document.getElementById('newOrderBtn').addEventListener('click', () => {
        document.getElementById('successOverlay').style.display = 'none';
        addProductLine();
    });
}

function showWaiting() {
    document.getElementById('accessIcon').textContent  = '🔐';
    document.getElementById('accessTitle').textContent = 'Ruxsat kutilmoqda...';
    document.getElementById('accessMsg').textContent   = 'Admin sizning so\'rovingizni ko\'rib chiqmoqda. Biroz kuting.';
    document.getElementById('accessLoader').style.display = 'block';
    document.getElementById('accessPhones').style.display = 'none';
}

function showBlocked() {
    document.getElementById('accessScreen').style.display = 'flex';
    document.getElementById('mainContent').style.display  = 'none';
    document.getElementById('accessIcon').textContent  = '🚫';
    document.getElementById('accessTitle').textContent = 'Kirish taqiqlangan';
    document.getElementById('accessMsg').textContent   = 'Siz bloklangansiz. Qo\'ng\'iroq qiling:';
    document.getElementById('accessLoader').style.display = 'none';
    document.getElementById('accessPhones').style.display = 'flex';
}

// ── NARXLAR ───────────────────────────────────────────────
function renderPrices() {
    const grid = document.getElementById('pricesGrid');
    grid.innerHTML = '';
    PRODUCTS.forEach(p => {
        const div = document.createElement('div');
        div.className = 'price-card';
        div.innerHTML = `
            <div class="price-card-img">
                <img src="${p.image}" alt="${p.name}"
                     onerror="this.style.display='none';this.parentElement.textContent='${p.emoji}'">
            </div>
            <div class="price-card-info">
                <div class="price-card-name">${p.name}</div>
                <div class="price-card-price">${fmt(p.price)}<small>/kg</small></div>
            </div>`;
        grid.appendChild(div);
    });
}

// ── PRODUCT LINE ──────────────────────────────────────────
function addProductLine() {
    const container = document.getElementById('productLines');
    const line = document.createElement('div');
    line.className = 'product-line';
    const opts = PRODUCTS.map(p => `<option value="${p.id}">${p.name} — ${fmt(p.price)}/kg</option>`).join('');
    line.innerHTML = `
        <select>${opts}</select>
        <div class="kg-wrap">
            <input type="number" class="kg-input" placeholder="0" min="0.5" step="0.5" inputmode="decimal">
            <span class="kg-unit">kg</span>
        </div>
        <span class="line-sub">0 so'm</span>
        <button type="button" class="remove-line">&times;</button>`;
    const sel = line.querySelector('select');
    const kg  = line.querySelector('.kg-input');
    const sub = line.querySelector('.line-sub');
    function recalc() {
        const p = PRODUCTS.find(p=>p.id===Number(sel.value));
        const k = parseFloat(kg.value)||0;
        sub.textContent = p&&k>0 ? fmt(p.price*k) : "0 so'm";
        updateTotal();
    }
    sel.addEventListener('change', recalc);
    kg.addEventListener('input', recalc);
    line.querySelector('.remove-line').addEventListener('click', () => { line.remove(); updateTotal(); });
    container.appendChild(line);
}

function updateTotal() {
    let totalKg=0, totalSum=0;
    document.querySelectorAll('.product-line').forEach(line => {
        const sel = line.querySelector('select');
        const kg  = parseFloat(line.querySelector('.kg-input').value)||0;
        const p   = PRODUCTS.find(p=>p.id===Number(sel.value));
        if (p&&kg>0) { totalKg+=kg; totalSum+=p.price*kg; }
    });
    document.getElementById('totalKg').textContent  = fmtKg(totalKg);
    document.getElementById('totalSum').textContent = fmt(totalSum);
}

function collectLines() {
    const items=[]; let totalKg=0, total=0, valid=true;
    document.querySelectorAll('.product-line').forEach(line => {
        const sel = line.querySelector('select');
        const kg  = parseFloat(line.querySelector('.kg-input').value)||0;
        const p   = PRODUCTS.find(p=>p.id===Number(sel.value));
        if (!p||kg<=0) { valid=false; return; }
        items.push({ name:p.name, price:p.price, kg });
        totalKg+=kg; total+=p.price*kg;
    });
    return { valid: valid&&items.length>0, items, totalKg, total };
}

// ── PAYMENT ───────────────────────────────────────────────
function setupPayment() {
    document.querySelectorAll('input[name="payment"]').forEach(r => {
        r.addEventListener('change', () => {
            document.getElementById('clickBlock').style.display = (r.value==='click'&&r.checked) ? 'block' : 'none';
        });
    });
    document.getElementById('copyBtn').addEventListener('click', () => {
        navigator.clipboard?.writeText('9860082592807547').then(() => {
            const btn = document.getElementById('copyBtn');
            btn.textContent = '✅ Nusxa olindi!';
            setTimeout(() => btn.textContent = '📋 Nusxa', 2000);
        });
    });
    document.getElementById('receiptFile').addEventListener('change', function() {
        const file = this.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('receiptImg').src = e.target.result;
            document.getElementById('receiptPreview').style.display = 'block';
            document.getElementById('receiptUpload').style.display = 'none';
            document.getElementById('paidCheck').checked = true;
            document.getElementById('clickWarning').style.display = 'none';
        };
        reader.readAsDataURL(file);
    });
    document.getElementById('removeReceipt').addEventListener('click', () => {
        document.getElementById('receiptFile').value = '';
        document.getElementById('receiptImg').src = '';
        document.getElementById('receiptPreview').style.display = 'none';
        document.getElementById('receiptUpload').style.display = 'flex';
        document.getElementById('paidCheck').checked = false;
    });
    document.getElementById('receiptFile').addEventListener('change', function() {
        const file = this.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('receiptImg').src = e.target.result;
            document.getElementById('receiptPreview').style.display = 'block';
            document.getElementById('receiptUpload').style.display = 'none';
            document.getElementById('paidCheck').checked = true;
            document.getElementById('clickWarning').style.display = 'none';
        };
        reader.readAsDataURL(file);
    });
    document.getElementById('removeReceipt').addEventListener('click', () => {
        document.getElementById('receiptFile').value = '';
        document.getElementById('receiptImg').src = '';
        document.getElementById('receiptPreview').style.display = 'none';
        document.getElementById('receiptUpload').style.display = 'flex';
        document.getElementById('paidCheck').checked = false;
    });
}

// ── LOKATSIYA ─────────────────────────────────────────────
function setupLocation() {
    document.getElementById('getLocationBtn').addEventListener('click', () => {
        const btn    = document.getElementById('getLocationBtn');
        const status = document.getElementById('locationStatus');
        if (!navigator.geolocation) { status.textContent='❌ GPS qo\'llab-quvvatlanmaydi'; return; }
        btn.textContent = '⏳ Aniqlanmoqda...';
        btn.disabled = true;
        navigator.geolocation.getCurrentPosition(
            pos => {
                document.getElementById('orderLat').value = pos.coords.latitude.toFixed(6);
                document.getElementById('orderLng').value = pos.coords.longitude.toFixed(6);
                btn.textContent = '✅ Lokatsiya aniqlandi';
                btn.style.color = '#16a34a'; btn.disabled = false;
                status.textContent = `📍 ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
                status.style.color = '#16a34a';
            },
            err => {
                btn.textContent = '📍 Lokatsiyamni yuborish'; btn.disabled = false;
                status.textContent = err.code===1 ? '❌ Ruxsat berilmadi' : '❌ GPS signali yo\'q';
                status.style.color = '#ef4444';
                document.getElementById('noLocationHint').style.display = 'block';
            },
            { enableHighAccuracy:true, timeout:10000 }
        );
    });
}

// ── SUBMIT ────────────────────────────────────────────────
function setupSubmit() {
    document.getElementById('submitBtn').addEventListener('click', async () => {
        const { valid, items, totalKg, total } = collectLines();
        if (!valid) { toast('⚠️ Kamida 1 ta mahsulot va kg kiriting'); return; }
        const payVal = document.querySelector('input[name="payment"]:checked')?.value;
        if (payVal==='click' && !document.getElementById('paidCheck').checked) {
            document.getElementById('clickWarning').style.display = 'block';
            document.getElementById('clickBlock').scrollIntoView({behavior:'smooth',block:'center'});
            return;
        }
        document.getElementById('clickWarning').style.display = 'none';
        const btn = document.getElementById('submitBtn');
        btn.textContent = '⏳ Yuborilmoqda...'; btn.disabled = true;

        const orderId = 'VP-' + Date.now();
        const now     = new Date().toLocaleString('uz-UZ');
        const client  = document.getElementById('clientName').value.trim();
        const phone   = document.getElementById('clientPhone').value.trim();
        const note    = document.getElementById('orderNote').value.trim();
        const lat     = document.getElementById('orderLat').value;
        const lng     = document.getElementById('orderLng').value;
        const payText = { cash:'💵 Naqt pul', click:'📱 Click' }[payVal] || payVal;
        const itemsList = items.map(i=>`• ${i.name}: ${fmtKg(i.kg)} — ${fmt(i.price*i.kg)}`).join('\n');

        const msg =
`🐔 *VOHDIL PARRANDA — Yangi zakaz*

🆔 Zakaz: \`${orderId}\`
📅 Vaqt: ${now}
${client ? `👤 Mijoz: ${client}\n` : ''}${phone ? `📞 Tel: ${phone}\n` : ''}
📦 *Mahsulotlar:*
${itemsList}

⚖️ Jami: *${fmtKg(totalKg)}*
💰 Summa: *${fmt(total)}*
💳 To'lov: ${payText}
${note ? `📝 ${note}` : ''}`;

        let sendOk = false;
        for (const chatId of TELEGRAM_CHAT_IDS) {
            try {
                const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({ chat_id:chatId, text:msg, parse_mode:'Markdown' })
                });
                if ((await r.json()).ok) sendOk = true;
                const receiptSrc = document.getElementById('receiptImg')?.src;
                if (receiptSrc?.startsWith('data:')) {
                    const blob = base64ToBlob(receiptSrc);
                    const fd = new FormData();
                    fd.append('chat_id', chatId); fd.append('photo', blob, 'chek.jpg');
                    fd.append('caption', `📸 Click cheki — ${orderId}`);
                    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {method:'POST',body:fd});
                }
                if (lat && lng) {
                    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendLocation`, {
                        method:'POST', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({chat_id:chatId, latitude:parseFloat(lat), longitude:parseFloat(lng)})
                    });
                }
            } catch(e) { toast('❌ Tarmoq xatosi'); }
        }

        if (!sendOk) { btn.textContent = '✅ Zakazni yuborish'; btn.disabled = false; return; }

        document.getElementById('successOrderId').textContent = orderId;
        document.getElementById('successOverlay').style.display = 'flex';
        document.getElementById('productLines').innerHTML = '';
        document.getElementById('clientName').value = '';
        document.getElementById('clientPhone').value = '';
        document.getElementById('orderNote').value = '';
        document.getElementById('orderLat').value = '';
        document.getElementById('orderLng').value = '';
        document.querySelector('input[name="payment"][value="cash"]').checked = true;
        document.getElementById('clickBlock').style.display = 'none';
        document.getElementById('paidCheck').checked = false;
        document.getElementById('receiptPreview').style.display = 'none';
        document.getElementById('receiptUpload').style.display = 'flex';
        document.getElementById('receiptFile').value = '';
        document.getElementById('receiptImg').src = '';
        updateTotal();
        btn.textContent = '✅ Zakazni yuborish'; btn.disabled = false;
    });
}

function base64ToBlob(base64) {
    const parts = base64.split(';base64,');
    const mime  = parts[0].split(':')[1];
    const bin   = atob(parts[1]);
    const arr   = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
    return new Blob([arr], {type:mime});
}

function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t=document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(()=>t.classList.remove('show'), 2400);
}

// ── Admin panel faqat admin.html orqali ──────────────────
