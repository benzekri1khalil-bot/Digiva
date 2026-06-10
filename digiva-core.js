/* ═══════════════════════════════════════════════════
   DIGIVA CORE v3 — Fixed email, messages, payments
═══════════════════════════════════════════════════ */

const DEFAULT_CFG = {
  siteName:'Digiva', tagline:'Enter any product model. AI builds a professional A4 datasheet in seconds.',
  email:'benzekri1khalil@gmail.com', notifEmail:'benzekri1khalil@gmail.com',
  freeCreds:3, apiKey:'', apiModel:'gpt-4o',
  bgColor:'#060D1A', accentColor:'#2E9CFF',
  socialLi:'',socialIg:'',socialTt:'',socialFb:'',socialTw:'',socialYt:'',
  planLinks:{starter:'',pro:'',business:''},
  donateLink:'',
  promoCodes:{TEST2024:10,KHALIL:99,VIP100:50,DIGIVA50:25},
  plans:[
    {name:'Starter',price:9,credits:10,link:'',feats:['10 datasheets','All product types','A4 portrait format','Valid 12 months']},
    {name:'Professional',price:29,credits:50,link:'',feats:['50 datasheets','All product types','Custom branding','5 languages','History']},
    {name:'Business',price:79,credits:200,link:'',feats:['200 datasheets','All types','Custom branding','Bulk CSV','Priority support','White-label']},
  ],
  emailjsServiceId:'',emailjsTemplateId:'',emailjsPublicKey:'',
};

function getCfg(){const s=localStorage.getItem('dg_cfg');return s?Object.assign({},DEFAULT_CFG,JSON.parse(s)):Object.assign({},DEFAULT_CFG);}
function saveCfg(u){const c=getCfg();Object.assign(c,u);localStorage.setItem('dg_cfg',JSON.stringify(c));return c;}

/* ── Users ── */
function getUsers(){return JSON.parse(localStorage.getItem('dg_users')||'[]');}
function saveUsers(u){localStorage.setItem('dg_users',JSON.stringify(u));}

function registerUser(name,email,password){
  const users=getUsers();
  if(users.find(u=>u.email===email))return{ok:false,msg:'Email already registered.'};
  const user={id:'u_'+Date.now(),name,email,passwordHash:simpleHash(password),role:'user',
    credits:getCfg().freeCreds||3,createdAt:new Date().toISOString(),verified:false,
    verifyToken:Math.random().toString(36).slice(2),history:[],starred:[],archived:[]};
  users.push(user);saveUsers(users);
  return{ok:true,user};
}

function loginUser(email,password){
  const users=getUsers();
  const user=users.find(u=>u.email===email&&u.passwordHash===simpleHash(password));
  if(!user)return{ok:false,msg:'Wrong email or password.'};
  sessionStorage.setItem('dg_session',JSON.stringify({id:user.id,role:user.role}));
  return{ok:true,user};
}

function currentUser(){
  const s=sessionStorage.getItem('dg_session');if(!s)return null;
  const{id}=JSON.parse(s);return getUsers().find(u=>u.id===id)||null;
}
function currentRole(){const s=sessionStorage.getItem('dg_session');if(!s)return null;return JSON.parse(s).role;}

function updateUser(id,update){
  const users=getUsers();const idx=users.findIndex(u=>u.id===id);if(idx===-1)return;
  Object.assign(users[idx],update);saveUsers(users);
  const s=sessionStorage.getItem('dg_session');
  if(s&&JSON.parse(s).id===id)sessionStorage.setItem('dg_session',JSON.stringify({id,role:users[idx].role}));
}

function logout(){sessionStorage.removeItem('dg_session');window.location.href='login.html';}

/* ── Messages with star/archive ── */
function getMessages(){return JSON.parse(localStorage.getItem('dg_msgs')||'[]');}

function saveMessage(from,email,subject,body){
  const msgs=getMessages();
  const msg={id:'m_'+Date.now(),from,email,subject,body,
    time:new Date().toISOString(),read:false,starred:false,archived:false};
  msgs.unshift(msg);
  localStorage.setItem('dg_msgs',JSON.stringify(msgs));
  // Send email notification via EmailJS if configured
  sendEmailNotification(from,email,subject,body);
  return msg;
}

function updateMessage(id,update){
  const msgs=getMessages();
  const idx=msgs.findIndex(m=>m.id===id);
  if(idx===-1)return;
  Object.assign(msgs[idx],update);
  localStorage.setItem('dg_msgs',JSON.stringify(msgs));
}

function markRead(id){updateMessage(id,{read:true});}
function toggleStar(id){const m=getMessages().find(m=>m.id===id);if(m)updateMessage(id,{starred:!m.starred});}
function archiveMsg(id){updateMessage(id,{archived:true,read:true});}
function deleteMsg(id){const msgs=getMessages().filter(m=>m.id!==id);localStorage.setItem('dg_msgs',JSON.stringify(msgs));}

/* ── Email via EmailJS (free, no backend needed) ── */
function sendEmailNotification(from,fromEmail,subject,body){
  const cfg=getCfg();
  if(!cfg.emailjsPublicKey||!cfg.emailjsServiceId||!cfg.emailjsTemplateId)return;
  // Load EmailJS if not loaded
  if(!window.emailjs){
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    s.onload=()=>{
      window.emailjs.init(cfg.emailjsPublicKey);
      _sendViaEmailJS(from,fromEmail,subject,body,cfg);
    };
    document.head.appendChild(s);
  } else {
    _sendViaEmailJS(from,fromEmail,subject,body,cfg);
  }
}

function _sendViaEmailJS(from,fromEmail,subject,body,cfg){
  window.emailjs.send(cfg.emailjsServiceId,cfg.emailjsTemplateId,{
    to_email:cfg.notifEmail||cfg.email,
    from_name:from,from_email:fromEmail,
    subject:subject||'New message from Digiva',
    message:body,
    reply_to:fromEmail
  }).catch(e=>console.log('Email send error:',e));
}

/* ── Password reset via EmailJS ── */
function sendPasswordReset(email){
  const users=getUsers();
  const user=users.find(u=>u.email===email);
  if(!user)return{ok:false,msg:'No account found with this email.'};
  // Generate reset token
  const token=Math.random().toString(36).slice(2)+Date.now().toString(36);
  updateUser(user.id,{resetToken:token,resetExpiry:Date.now()+3600000});
  const cfg=getCfg();
  if(cfg.emailjsPublicKey){
    sendEmailNotification('Digiva System',cfg.email,'Password Reset Request',
      'A password reset was requested for: '+email+'\nReset token: '+token+'\n\nIf you did not request this, ignore this email.');
  }
  // Also store token so user can reset on same device
  localStorage.setItem('dg_reset_'+email,token);
  return{ok:true,token};
}

function resetPassword(email,token,newPassword){
  const users=getUsers();
  const user=users.find(u=>u.email===email);
  if(!user)return{ok:false,msg:'User not found.'};
  const stored=localStorage.getItem('dg_reset_'+email);
  if(stored!==token)return{ok:false,msg:'Invalid or expired reset token.'};
  updateUser(user.id,{passwordHash:simpleHash(newPassword),resetToken:null});
  localStorage.removeItem('dg_reset_'+email);
  return{ok:true};
}

/* ── Stats ── */
function getStats(){
  const users=getUsers();const msgs=getMessages();
  const allHist=users.flatMap(u=>u.history||[]);
  const today=new Date().toDateString();
  return{
    totalUsers:users.length,totalGen:allHist.length,
    todayGen:allHist.filter(h=>new Date(h.time).toDateString()===today).length,
    totalMessages:msgs.length,unreadMsgs:msgs.filter(m=>!m.read&&!m.archived).length,
    starredMsgs:msgs.filter(m=>m.starred).length,
    byCategory:groupBy(allHist,h=>h.category||'Unknown'),
    byDay:last7days(allHist),
  };
}
function groupBy(arr,fn){return arr.reduce((acc,item)=>{const k=fn(item);acc[k]=(acc[k]||0)+1;return acc;},{});}
function last7days(allHist){
  const days=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const label=d.toLocaleDateString('en',{weekday:'short'});
    const count=allHist.filter(h=>new Date(h.time).toDateString()===d.toDateString()).length;
    days.push({label,count});
  }
  return days;
}

/* ── Simple hash ── */
function simpleHash(str){let h=0;for(let i=0;i<str.length;i++)h=((h<<5)-h+str.charCodeAt(i))|0;return h.toString(16);}

/* ── Auth guards ── */
function requireAdmin(){const r=currentRole();if(r!=='admin'&&r!=='worker'){window.location.href='login.html';}}
function requireAuth(){if(!currentUser())window.location.href='login.html';}

/* ── Active API key ── */
function getActiveApiKey(){
  try{
    const userKey=localStorage.getItem('dg_k')||'';
    if(userKey&&userKey.startsWith('sk-'))return userKey;
    const cfg=JSON.parse(localStorage.getItem('dg_cfg')||'{}');
    return cfg.apiKey||'';
  }catch(e){return'';}
}

/* ── Toast ── */
function showToast(msg,type){
  let c=document.getElementById('toast-container');
  if(!c){c=document.createElement('div');c.id='toast-container';c.style.cssText='position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px';document.body.appendChild(c);}
  const el=document.createElement('div');
  const icon=type==='ok'?'✅':type==='err'?'❌':'ℹ️';
  el.style.cssText='background:#0D1E34;color:#E8F4FF;font-size:13px;padding:12px 18px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);display:flex;align-items:center;gap:10px;border:1px solid '+(type==='ok'?'rgba(34,197,94,.4)':type==='err'?'rgba(239,68,68,.4)':'rgba(46,156,255,.4)')+';max-width:320px;animation:slideIn .3s ease;cursor:pointer';
  el.innerHTML='<span style="font-size:18px;flex-shrink:0">'+icon+'</span>'+msg;
  el.onclick=()=>el.remove();
  c.appendChild(el);
  setTimeout(()=>el.remove(),5000);
}
