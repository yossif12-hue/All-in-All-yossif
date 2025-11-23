// Core interaction script: canvas background, translations, gps, chat, modal
(() => {
  // --- Utilities ---
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // --- Configuration for form delivery ---
  // Set one of these to enable sending real requests.
  // 1) Formspree: create a free form at https://formspree.io and paste the form endpoint here (e.g. https://formspree.io/f/yourid)
  // 2) CUSTOM_API_ENDPOINT: point to your server endpoint that accepts JSON POST { name, email, service, message }
  const FORMSPREE_ENDPOINT = '';
  const CUSTOM_API_ENDPOINT = '';

  // Year
  try{document.getElementById('year').textContent=new Date().getFullYear()}catch(e){}

  // --- Splash ---
  const splash = $('#splash');
  window.addEventListener('load', ()=>{
    setTimeout(()=>{splash.classList.add('shrink');}, 1400);
    setTimeout(()=>{splash.style.display='none';}, 2200);
  });

  // --- Canvas background (particle network) ---
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let w=0,h=0,particles=[];
  const mouse={x:-9999,y:-9999};
  // dynamic config based on area for performance
  const base = {maxDist:140,mouseRadius:120};

  function resize(){
    w=canvas.width=window.innerWidth; h=canvas.height=window.innerHeight;
    // scale particle count with area, clamp between 40 and 140
    const area = (w*h)/ (1366*768);
    const count = Math.round(Math.max(40, Math.min(140, 80 * area)));
    initParticles(count);
  }
  window.addEventListener('resize', resize); resize();

  window.addEventListener('mousemove', e=>{mouse.x=e.clientX;mouse.y=e.clientY});
  window.addEventListener('mouseleave', ()=>{mouse.x=-9999;mouse.y=-9999});

  function rand(min,max){return Math.random()*(max-min)+min}
  function initParticles(count){
    particles = [];
    for(let i=0;i<count;i++){
      particles.push({x:rand(0,w),y:rand(0,h),vx:rand(-0.45,0.45),vy:rand(-0.45,0.45),r:rand(0.8,1.8)});
    }
  }

  // time-based color cycling
  const start = performance.now();

  function step(now){
    const t = now || performance.now();
    // subtle background clear with slight alpha for motion tail
    ctx.clearRect(0,0,w,h);
    // compute smooth hue (200..320) and lightness to create neon-like shift
    const hue = 210 + 60 * Math.sin((t - start) * 0.00035);
    const primary = `hsla(${hue.toFixed(1)},95%,55%,`;

    // draw particles
    ctx.globalCompositeOperation = 'lighter';
    for(let p of particles){
      p.x += p.vx; p.y += p.vy;
      if(p.x < -10 || p.x > w+10) p.vx *= -1;
      if(p.y < -10 || p.y > h+10) p.vy *= -1;
      ctx.beginPath();
      ctx.fillStyle = primary + '0.95)';
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      // small outer glow
      ctx.beginPath();
      ctx.fillStyle = primary + '0.18)';
      ctx.arc(p.x, p.y, p.r*4, 0, Math.PI*2);
      ctx.fill();
    }

    // connect lines with color based on distance and hue
    const maxDist = base.maxDist * (Math.min(Math.max(w, h) / 900, 1.6));
    for(let i=0;i<particles.length;i++){
      for(let j=i+1;j<particles.length;j++){
        const a=particles[i], b=particles[j];
        const dx=a.x-b.x, dy=a.y-b.y; const d=Math.hypot(dx,dy);
        if(d < maxDist){
          const alpha = (1 - d / maxDist) * 0.14;
          ctx.beginPath();
          ctx.strokeStyle = `hsla(${hue.toFixed(1)},85%,60%,${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }

    // attract to mouse with subtle force
    const mouseRadius = base.mouseRadius * (Math.min(Math.max(w, h) / 900, 1.4));
    for(let p of particles){
      const dx = mouse.x - p.x, dy = mouse.y - p.y; const d = Math.hypot(dx, dy);
      if(d < mouseRadius){ p.vx += (dx/d) * 0.018; p.vy += (dy/d) * 0.018; }
      // damping
      p.vx *= 0.996; p.vy *= 0.996;
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);

  // --- Scroll reveal ---
  const observer = new IntersectionObserver((entries)=>{
    for(const e of entries){ if(e.isIntersecting) e.target.classList.add('show'); }
  },{threshold:0.12});
  $$('section, .card, .chip').forEach(el=>{el.classList.add('reveal'); observer.observe(el)});

  // --- Modal form ---
  const modal = $('#modal');
  $('#open-service').addEventListener('click', ()=>{modal.classList.remove('hide');});
  $('#close-modal').addEventListener('click', ()=>{modal.classList.add('hide');});
  $('#service-form').addEventListener('submit', async e=>{
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn && submitBtn.textContent;
    try{
      if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }
      const formData = new FormData(form);
      // include current language and optionally location info if available
      if(window.__currentLang) formData.append('lang', window.__currentLang);
      // If a Formspree endpoint is configured, POST the FormData directly
      if(FORMSPREE_ENDPOINT){
        const res = await fetch(FORMSPREE_ENDPOINT, { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } });
        if(res.ok){
          alert('Request sent — we will contact you soon.');
          modal.classList.add('hide');
          form.reset();
        } else {
          const body = await res.text();
          console.error('Formspree error', body);
          alert('Failed to send — please try again later.');
        }
      } else if(CUSTOM_API_ENDPOINT){
        // send JSON to custom API
        const payload = {};
        formData.forEach((v,k)=>{ payload[k]=v; });
        const res = await fetch(CUSTOM_API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
        if(res.ok){
          const j = await res.json().catch(()=>null);
          alert((j && j.message) ? j.message : 'Request sent — we will contact you soon.');
          modal.classList.add('hide');
          form.reset();
        } else {
          console.error('API error', await res.text());
          alert('Failed to send — server returned an error.');
        }
      } else {
        // fallback demo behaviour
        alert('Submitted — demo only. To enable real sending, configure Formspree or a custom API endpoint.');
        modal.classList.add('hide');
        form.reset();
      }
    }catch(err){
      console.error('Submit error', err);
      alert('An error occurred while sending. Please try again later.');
    }finally{
      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = originalText; }
    }
  });

  // --- Service card click animation (ripple + brief scale) ---
  $$('.service').forEach((el)=>{
    el.addEventListener('click', (ev)=>{
      // create ripple element
      const rect = el.getBoundingClientRect();
      const ripple = document.createElement('span'); ripple.className = 'ripple';
      const size = Math.max(rect.width, rect.height) * 1.6;
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (ev.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (ev.clientY - rect.top - size/2) + 'px';
      el.appendChild(ripple);
      ripple.style.animation = 'rip 600ms ease-out';
      // clicked visual
      el.classList.add('clicked');
      setTimeout(()=>{ el.classList.remove('clicked'); }, 420);
      // cleanup ripple
      setTimeout(()=>{ try{ ripple.remove(); }catch(e){} }, 700);
    });
  });

  // --- Image modal / lightbox for illustrations ---
  const imgModal = $('#img-modal');
  const imgModalImg = $('#img-modal-img');
  const imgModalCaption = $('#img-modal-caption');
  $('#close-img-modal').addEventListener('click', ()=>{ imgModal.classList.add('hide'); imgModalImg.src=''; imgModalCaption.textContent=''; });
  // close when clicking outside panel
  imgModal.addEventListener('click', (e)=>{ if(e.target === imgModal) { imgModal.classList.add('hide'); imgModalImg.src=''; imgModalCaption.textContent=''; } });

  // open modal when clicking any illustration image
  document.addEventListener('click', (e)=>{
    const t = e.target.closest && e.target.closest('.illustration');
    if(!t) return;
    e.preventDefault();
    const src = t.getAttribute('src');
    const card = t.closest('.card');
    const caption = (card && card.querySelector('strong')) ? card.querySelector('strong').textContent : '';
    imgModalImg.src = src;
    imgModalCaption.textContent = caption;
    imgModal.classList.remove('hide');
  });

  // --- Chat assistant ---
  const chatBtn = $('#open-chat'); const chatWindow = $('#chat-window');
  $('#chat-btn').addEventListener('click', ()=>{ chatWindow.classList.toggle('hide'); });
  let chatMode = 'general';
  $$('.quick').forEach(b=>b.addEventListener('click', ()=>{
    const q=b.dataset.q; const body = $('#chat-body');
    if(q === 'problem'){
      chatMode = 'problem';
      const prompt = 'You are in Problem Solver mode. Describe the issue (platform, error messages, steps to reproduce).';
      const el0 = document.createElement('div'); el0.className='chat-msg bot'; el0.textContent = prompt; body.appendChild(el0);
      // focus input
      $('#chat-input').focus();
    } else {
      const el=document.createElement('div'); el.className='chat-msg bot'; el.textContent=generateQuickReply(q); body.appendChild(el);
    }
    body.scrollTop=body.scrollHeight;
  }));
  
  // send input handler
  const chatInput = $('#chat-input');
  const sendBtn = $('#send-chat');
  sendBtn.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); sendChat(); }});

  function sendChat(){
    const txt = chatInput.value && chatInput.value.trim();
    if(!txt) return;
    const body = $('#chat-body');
    const me = document.createElement('div'); me.className='chat-msg'; me.style.background='linear-gradient(90deg,#0b2a33, #06202a)'; me.textContent = txt; body.appendChild(me);
    chatInput.value = '';
    // generate assistant reply
    setTimeout(()=>{
      let reply = '';
      const lower = txt.toLowerCase();
      const serviceKeywords = /service|services|خدمة|خدمات|سعر|price|pricing|أسعار/;
      if(chatMode !== 'problem' && serviceKeywords.test(lower)){
        reply = generateQuickReply('services');
      } else {
        reply = generateProblemReply(txt, chatMode);
      }
      const bot = document.createElement('div'); bot.className='chat-msg bot'; bot.innerHTML = reply;
      body.appendChild(bot);
      body.scrollTop = body.scrollHeight;
    }, 700);
  }
  function generateQuickReply(key){
    const lang = window.__currentLang || 'en';
    const maps = {
      en: {
        services: 'Please contact the developer to arrange details. Thank you for visiting the site.',
        prices: 'Pricing depends on scope — request a quote.',
        contact: 'Phone: 01270903132 — Email: add06591@gmail.com',
        problem: 'Describe the problem and we will propose a solution.'
      },
      ar: {
        services: 'برجاء التواصل مع المطور للاتفاق. شكرًا لزيارة الموقع.',
        prices: 'الأسعار تعتمد على نطاق المشروع — أرسل طلب عرض.',
        contact: 'الهاتف: 01270903132 — البريد: add06591@gmail.com',
        problem: 'صف المشكلة وسنقترح الحلول.'
      },
      fr: {
        services: "Veuillez contacter le développeur pour convenir des détails. Merci de votre visite.",
        prices: "Les tarifs dépendent du périmètre — demandez un devis.",
        contact: 'Téléphone: 01270903132 — Email: add06591@gmail.com',
        problem: 'Décrivez le problème et nous proposerons des solutions.'
      }
    };
    return (maps[lang] && maps[lang][key]) || maps['en'][key] || 'How can I help?';
  }

  function generateProblemReply(text, mode){
    // simple heuristic-driven assistant focused on solving problems
    if(mode !== 'problem') return 'I can help — to use the Problem Solver, press the Problem button.';
    // look for platform keywords
    const lower = text.toLowerCase();
    const hints = [];
    if(/android|ios|mobile|flutter/.test(lower)) hints.push('platform: Mobile (specify OS and version)');
    if(/web|browser|spa|pwa/.test(lower)) hints.push('platform: Web (specify browser and version)');
    if(/error|exception|trace|stack/.test(lower)) hints.push('include exact error message or stack trace');
    if(/slow|performance|lag/.test(lower)) hints.push('measure: steps to reproduce + timings');
    // build reply
    let out = '<strong>Problem Solver — suggested next steps:</strong><ol>';
    out += '<li>Summarize the issue in one sentence.</li>';
    out += '<li>List steps to reproduce and expected vs actual behavior.</li>';
    out += '<li>Collect logs, screenshots, or error messages.</li>';
    out += '<li>Try quick fixes: clear cache/restart, reproduce in another environment.</li>';
    out += '</ol>';
    if(hints.length){ out += '<p><strong>Detected hints:</strong> ' + hints.join(', ') + '</p>'; }
    out += '<p>If you want, press <em>Request Service</em> to send details and we can follow up.</p>';
    return out;
  }

  // --- Location (GPS + reverse geocoding) ---
  const locInfo = $('#location-info');
  $('#get-location').addEventListener('click', ()=>{
    if(!navigator.geolocation) return showLocError('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat=pos.coords.latitude.toFixed(6), lon=pos.coords.longitude.toFixed(6);
      // reverse geocode via Nominatim
      try{
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&email=add06591@gmail.com`);
        const data = await res.json();
        const city = data.address.city||data.address.town||data.address.village||data.address.county||'';
        const country = data.address.country||'';
        locInfo.innerHTML = `<strong>${country} — ${city}</strong><br/>Coords: ${lat}, ${lon}<br/><a href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}" target="_blank">Open in Google Maps</a>`;
        locInfo.classList.remove('hide');
      }catch(err){showLocError('Reverse geocode failed');}
    }, err=>{showLocError(err.message)}, {enableHighAccuracy:true,timeout:10000});
  });
  function showLocError(msg){locInfo.classList.remove('hide');locInfo.innerHTML=`<strong>Error</strong><br/>${msg}`}

  // --- Translations & direction ---
  const translations = {
    en: {
      welcome_msg: "Welcome! Glad you're here — explore services or ask the assistant.",
      welcome_cta: 'Explore Services',
      welcome_dismiss: 'Dismiss',
      splash_sub: 'Welcome — Professional software solutions',
      nav_home:'Home',nav_services:'Services',nav_tech:'Tech',nav_portfolio:'Portfolio',nav_how:'How we work',nav_cases:'Cases',nav_contact:'Contact',
      hero_title:'All-in-All — Integrated software solutions', hero_sub:'Build modern mobile & web apps with performance and UX-first design.',
      cta_request:'Request Service', cta_location:'Get Location',
      services_title:'Services', svc_mobile:'Mobile Apps (Native, Flutter, Dart)', svc_web:'Web Apps (SPA, PWA)', svc_front:'Front-end Development', svc_back:'Back-end Development', svc_devops:'DevOps & Deployment', svc_problem:'Problem Solving',
      tech_title:'Technologies', portfolio_title:'Portfolio', how_title:'How We Work', cases_title:'Problem Solving', contact_title:'Contact',
      modal_title:'Service Request', field_name:'Name', field_email:'Email', field_service:'Service', field_message:'Message', send:'Send'
    },
    ar: {
      welcome_msg: 'مرحباً! سعيدون بزيارتك — تصفح الخدمات أو اسأل المساعد.',
      welcome_cta: 'استعراض الخدمات',
      welcome_dismiss: 'إغلاق',
      splash_sub: 'مرحبا — حلول برمجية احترافية',
      nav_home:'الصفحة الرئيسية',nav_services:'الخدمات',nav_tech:'التقنيات',nav_portfolio:'معرض الأعمال',nav_how:'كيف نعمل',nav_cases:'حلول',nav_contact:'تواصل',
      hero_title:'All-in-All — حلول برمجية متكاملة', hero_sub:'بناء تطبيقات موبايل وويب حديثة مع أداء وتجربة مستخدم مميزة',
      cta_request:'طلب خدمة', cta_location:'تحديد الموقع',
      services_title:'الخدمات', svc_mobile:'تطبيقات موبايل (Native, Flutter, Dart)', svc_web:'تطبيقات ويب (SPA, PWA)', svc_front:'تطوير الواجهة الأمامية', svc_back:'تطوير الواجهة الخلفية', svc_devops:'DevOps والنشر', svc_problem:'حل المشكلات',
      tech_title:'التقنيات', portfolio_title:'معرض الأعمال', how_title:'كيف نعمل', cases_title:'حلول المشكلات', contact_title:'تواصل',
      modal_title:'طلب خدمة', field_name:'الاسم', field_email:'البريد الإلكتروني', field_service:'الخدمة', field_message:'الرسالة', send:'إرسال'
    },
    fr: {
      welcome_msg: "Bienvenue! Heureux de vous voir — explorez les services ou demandez à l'assistant.",
      welcome_cta: 'Voir les services',
      welcome_dismiss: 'Fermer',
      splash_sub: 'Bienvenue — Solutions logicielles professionnelles',
      nav_home:'Accueil',nav_services:'Services',nav_tech:'Tech',nav_portfolio:'Portfolio',nav_how:'Méthode',nav_cases:'Cas',nav_contact:'Contact',
      hero_title:'All-in-All — Solutions logicielles intégrées', hero_sub:'Création d\'applications mobiles et web modernes.',
      cta_request:'Demander un service', cta_location:'Localisation',
      services_title:'Services', svc_mobile:'Applications mobiles (Native, Flutter, Dart)', svc_web:'Applications Web (SPA, PWA)', svc_front:'Front-end Development', svc_back:'Back-end Development', svc_devops:'DevOps & Deployment', svc_problem:'Problem Solving',
      tech_title:'Technologies', portfolio_title:'Portfolio', how_title:'Comment nous travaillons', cases_title:'Études de cas', contact_title:'Contact',
      modal_title:'Demande de service', field_name:'Nom', field_email:'Email', field_service:'Service', field_message:'Message', send:'Envoyer'
    }
  };

  function applyLang(lang){
    const map=translations[lang]||translations.en;
    $$('[data-i18n]').forEach(el=>{const key=el.getAttribute('data-i18n'); if(map[key]) el.textContent=map[key];});
    // dir
    if(lang==='ar'){document.documentElement.dir='rtl'}else{document.documentElement.dir='ltr'}
    // active button
    $$('.lang-btn').forEach(b=>b.classList.toggle('active', b.dataset.lang===lang));
    // store current language
    window.__currentLang = lang;
  }
  // initial language from navigator or default
  let initLang = navigator.language && navigator.language.startsWith('ar')? 'ar' : 'en'; applyLang(initLang);
  $$('.lang-btn').forEach(b=>b.addEventListener('click', ()=>applyLang(b.dataset.lang)));

  // welcome banner behavior and nav-target handling
  // show welcome banner once (with localStorage)
  const wb = $('#welcome-banner');
  const wbClose = $('#wb-close');
  const wbCta = $('#wb-cta');
  setTimeout(()=>{
    try{
      const seen = localStorage.getItem('welcome_seen');
      if(!seen){ wb && wb.classList.remove('hide'); }
    }catch(e){ wb && wb.classList.remove('hide'); }
  }, 900);
  wbClose && wbClose.addEventListener('click', ()=>{ wb && wb.classList.add('hide'); try{localStorage.setItem('welcome_seen','1')}catch(e){} });
  wbCta && wbCta.addEventListener('click', ()=>{ const el = document.getElementById('services'); if(el) el.scrollIntoView({behavior:'smooth'}); wb && wb.classList.add('hide'); });

  // Emoji welcome bubble: show once for first-time visitors
  const emojiBubble = $('#emoji-welcome');
  (function handleEmojiWelcome(){
    try{
      const seen = localStorage.getItem('emoji_seen');
      if(emojiBubble && !seen){
        // show after small delay so splash can be seen
        setTimeout(()=>{ emojiBubble.classList.remove('hide'); setTimeout(()=>emojiBubble.classList.add('show'),40); }, 900);
        // auto-hide after 6s and mark seen
        setTimeout(()=>{ if(emojiBubble){ emojiBubble.classList.remove('show'); emojiBubble.classList.add('hide'); try{ localStorage.setItem('emoji_seen','1'); }catch(e){} } }, 6900);
      }
    }catch(e){ /* ignore */ }
  })();
  // clicking bubble opens welcome banner (or hides) and marks seen
  if(emojiBubble){
    emojiBubble.addEventListener('click', ()=>{
      try{ localStorage.setItem('emoji_seen','1'); }catch(e){}
      try{ emojiBubble.classList.remove('show'); emojiBubble.classList.add('hide'); }catch(e){}
      if(wb) wb.classList.remove('hide');
    });
  }

  // Smooth in-page nav for anchors
  document.querySelectorAll('a[href^="#"]').forEach(a=>{a.addEventListener('click', e=>{e.preventDefault();const t=document.querySelector(a.getAttribute('href')); if(t) t.scrollIntoView({behavior:'smooth'});});});

  // No main-tab switching: sections are separate anchors now.

})();
