

// ═══════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════
var CURR = {NGN:{sym:'₦'},USD:{sym:'$'},GBP:{sym:'£'},EUR:{sym:'€'},GHS:{sym:'₵'},ZAR:{sym:'R '},KES:{sym:'Ksh '}};

var cfg = {
currency:'NGN', taxRate:10, bizName:'Arena Pro Game Center',
bizAddr:'123 Game Street, Lagos', bizPhone:'+234 800 000 0000',
footer:'Thank you for playing at Arena Pro!', lowStock:5,
loyaltyEarnRate:1, loyaltyRedeemRate:100
};

var categories = ['Snooker','Paintball','Basketball','Bowling','Table Tennis','Darts','Arcade','VR','Soccer','Boxing','Badminton','Food & Drinks','Equipment','Other'];

var modifierGroups = [
{id:'MG1', name:'Session Extensions', type:'multi', required:false,
options:[{id:'mo1',name:'+30 mins',price:1500},{id:'mo2',name:'+1 hour',price:3000},{id:'mo3',name:'Extra Player',price:500}]},
{id:'MG2', name:'Drink Add-ons', type:'single', required:false,
options:[{id:'mo4',name:'No drink',price:0},{id:'mo5',name:'Soft Drink',price:500},{id:'mo6',name:'Energy Drink',price:800}]},
];

var users = [
{id:'U1',name:'Admin',av:'👑',role:'admin',pin:'000000',clockedIn:false,clockInTime:null,totalHours:0,
perms:{pos:true,courts:true,inventory:true,sales:true,members:true,users:true,settings:true,stockAdj:true,refunds:true,shifts:true,purchaseOrders:true,analytics:true,kds:true,giftCards:true}},
{id:'U2',name:'Kemi',av:'👩',role:'cashier',pin:'111111',clockedIn:false,clockInTime:null,totalHours:0,
perms:{pos:true,courts:true,inventory:false,sales:false,members:false,users:false,settings:false,stockAdj:false,refunds:false,shifts:false,purchaseOrders:false,analytics:false,kds:true,giftCards:false}},
{id:'U3',name:'Tunde',av:'👨',role:'manager',pin:'222222',clockedIn:false,clockInTime:null,totalHours:0,
perms:{pos:true,courts:true,inventory:true,sales:true,members:true,users:false,settings:false,stockAdj:false,refunds:true,shifts:true,purchaseOrders:true,analytics:true,kds:true,giftCards:true}},
];

var products = [
{id:1,name:'Snooker Table',icon:'🎱',cat:'Snooker',type:'timed',hourly:3000,price:0,cost:500,stock:0,low:0,modGroup:'MG1'},
{id:2,name:'Paintball Session',icon:'🎯',cat:'Paintball',type:'fixed',hourly:0,price:8000,cost:2500,stock:50,low:10,modGroup:''},
{id:3,name:'Basketball Court',icon:'🏀',cat:'Basketball',type:'timed',hourly:5000,price:0,cost:1000,stock:0,low:0,modGroup:'MG1'},
{id:4,name:'Bowling Lane',icon:'🎳',cat:'Bowling',type:'timed',hourly:4000,price:0,cost:800,stock:0,low:0,modGroup:'MG1'},
{id:5,name:'Table Tennis',icon:'🏓',cat:'Table Tennis',type:'timed',hourly:1500,price:0,cost:300,stock:0,low:0,modGroup:'MG1'},
{id:6,name:'VR Experience',icon:'🥽',cat:'VR',type:'fixed',hourly:0,price:5000,cost:1500,stock:0,low:0,modGroup:''},
{id:7,name:'Arcade Tokens x10',icon:'🕹️',cat:'Arcade',type:'fixed',hourly:0,price:1000,cost:100,stock:500,low:50,modGroup:''},
{id:8,name:'Darts 30min',icon:'🎯',cat:'Darts',type:'fixed',hourly:0,price:1200,cost:200,stock:0,low:0,modGroup:''},
{id:9,name:'Paintball Ammo x50',icon:'💥',cat:'Paintball',type:'fixed',hourly:0,price:2000,cost:400,stock:1000,low:100,modGroup:''},
{id:10,name:'Pool Cue Rental',icon:'🪄',cat:'Snooker',type:'gear',hourly:0,price:500,cost:100,stock:12,low:3,modGroup:''},
{id:11,name:'Soft Drink',icon:'🥤',cat:'Food & Drinks',type:'food',hourly:0,price:500,cost:150,stock:100,low:20,modGroup:''},
{id:12,name:'Energy Drink',icon:'⚡',cat:'Food & Drinks',type:'food',hourly:0,price:800,cost:250,stock:80,low:15,modGroup:''},
{id:13,name:'Hot Dog',icon:'🌭',cat:'Food & Drinks',type:'food',hourly:0,price:1000,cost:350,stock:40,low:8,modGroup:'MG2'},
{id:14,name:'Pizza Slice',icon:'🍕',cat:'Food & Drinks',type:'food',hourly:0,price:1200,cost:400,stock:30,low:6,modGroup:'MG2'},
{id:15,name:'Water Bottle',icon:'💧',cat:'Food & Drinks',type:'food',hourly:0,price:300,cost:80,stock:200,low:30,modGroup:''},
{id:16,name:'Soccer Field',icon:'⚽',cat:'Soccer',type:'timed',hourly:8000,price:0,cost:2000,stock:0,low:0,modGroup:'MG1'},
{id:17,name:'Boxing Ring',icon:'🥊',cat:'Boxing',type:'timed',hourly:6000,price:0,cost:1500,stock:0,low:0,modGroup:'MG1'},
];

var courts = [
{id:1,name:'Snooker 1',icon:'🎱',type:'Snooker',mode:'sports',status:'available',linked:1,cust:'',start:0,diningTicket:null},
{id:2,name:'Snooker 2',icon:'🎱',type:'Snooker',mode:'sports',status:'occupied',linked:1,cust:'Emeka',start:Date.now()-2400000,diningTicket:null},
{id:3,name:'Basketball A',icon:'🏀',type:'Basketball',mode:'sports',status:'available',linked:3,cust:'',start:0,diningTicket:null},
{id:4,name:'Paintball Zone',icon:'🎯',type:'Paintball',mode:'sports',status:'occupied',linked:2,cust:'Group B',start:Date.now()-1800000,diningTicket:null},
{id:5,name:'Restaurant Table 1',icon:'🍽️',type:'Dining',mode:'dining',status:'available',linked:0,cust:'',start:0,diningTicket:null},
{id:6,name:'Restaurant Table 2',icon:'🍽️',type:'Dining',mode:'dining',status:'available',linked:0,cust:'',start:0,diningTicket:null},
];

var members = [
{id:'M001',name:'Emeka Johnson',phone:'+234 801 000 0001',email:'',tier:'Gold',pts:4500,visits:23,spent:180000,redeemHistory:[]},
{id:'M002',name:'Amaka Obi',phone:'+234 802 000 0002',email:'',tier:'Silver',pts:1200,visits:8,spent:52000,redeemHistory:[]},
{id:'M003',name:'Chidi Nwosu',phone:'+234 803 000 0003',email:'',tier:'Platinum',pts:12000,visits:67,spent:780000,redeemHistory:[]},
];

var sales = [];
var stockHistory = [];
var clockEvents = [];
var purchaseOrders = [];
var giftCards = [
{id:'GC001',code:'ARENA-XMAS-001',balance:5000,issued:new Date(Date.now()-86400000*3),customer:'Amaka Obi',active:true},
{id:'GC002',code:'ARENA-VIP-2025',balance:10000,issued:new Date(Date.now()-86400000*10),customer:'Corporate Gift',active:true},
];
var kdsOrders = [];
var shifts = [];
var currentShift = null;

// Multi-ticket state
var tickets = [{id:'T1',name:'Ticket 1',cart:[],cartTimers:{},discPct:0,customer:'',loyaltyDisc:0,loyaltyMemberId:null,gcCode:null,gcDisc:0}];
var activeTicketId = 'T1';

var currentUser = null;
var selLoginUser = null;
var activeCat = 'All';
var saleId = 2001;
var poId = 100;
var pendingRestockId = null;
var pendingModPid = null;
var pendingModSelections = {};
var pendingItemDiscCid = null;
var charts = {};

var PERMS_LIST = [
{k:'pos',l:'POS'},{k:'courts',l:'Courts'},{k:'inventory',l:'Inventory'},
{k:'sales',l:'Sales'},{k:'members',l:'Members'},{k:'users',l:'Manage Users'},
{k:'settings',l:'Settings'},{k:'stockAdj',l:'Adjust Stock'},
{k:'refunds',l:'Refunds'},{k:'shifts',l:'Shift Mgmt'},
{k:'purchaseOrders',l:'Purchase Orders'},{k:'analytics',l:'Analytics'},
{k:'kds',l:'Kitchen Display'},{k:'giftCards',l:'Gift Cards'},
];

var DEFAULT_PERMS = {
cashier:{pos:true,courts:true,inventory:false,sales:false,members:false,users:false,settings:false,stockAdj:false,refunds:false,shifts:false,purchaseOrders:false,analytics:false,kds:true,giftCards:false},
manager:{pos:true,courts:true,inventory:true,sales:true,members:true,users:false,settings:false,stockAdj:false,refunds:true,shifts:true,purchaseOrders:true,analytics:true,kds:true,giftCards:true},
viewer:{pos:false,courts:true,inventory:false,sales:true,members:false,users:false,settings:false,stockAdj:false,refunds:false,shifts:false,purchaseOrders:false,analytics:true,kds:false,giftCards:false},
};

var NAV = [
{id:'dashboard',icon:'📡',label:'Dashboard',perm:'sales',section:'main'},
{id:'pos',icon:'🏪',label:'POS',perm:'pos',section:'main'},
{id:'courts',icon:'🎯',label:'Courts',perm:'courts',section:'main'},
{id:'kds',icon:'🍳',label:'Kitchen',perm:'kds',section:'main'},
{id:'inventory',icon:'📦',label:'Inventory',perm:'inventory',section:'store'},
{id:'purchaseorders',icon:'📋',label:'Purchase Orders',perm:'purchaseOrders',section:'store'},
{id:'sales',icon:'📊',label:'Sales',perm:'sales',section:'reports'},
{id:'analytics',icon:'📈',label:'Analytics',perm:'analytics',section:'reports'},
{id:'members',icon:'👥',label:'Members',perm:'members',section:'customers'},
{id:'giftcards',icon:'🎟',label:'Gift Cards',perm:'giftCards',section:'customers'},
{id:'users',icon:'🔐',label:'Users',perm:'users',section:'admin'},
{id:'shift',icon:'⏱',label:'Shift Report',perm:'shifts',section:'admin'},
{id:'settings',icon:'⚙️',label:'Settings',perm:'settings',section:'admin'},
];

// ═══ HELPERS ═══
function fmt(n){return CURR[cfg.currency].sym+Number(n||0).toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtTime(sec){sec=Math.max(0,Math.floor(sec));var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return pad(h)+':'+pad(m)+':'+pad(s);}
function pad(n){return String(n).padStart(2,'0');}
function fmtDate(d){return(d||new Date()).toLocaleString('en-NG');}
function fmtDateShort(d){return(d||new Date()).toLocaleDateString('en-NG');}
function uid(){return '_'+Math.random().toString(36).slice(2,9);}
function gcCode(){var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';var r='ARENA-';for(var i=0;i<8;i++)r+=chars[Math.floor(Math.random()*chars.length)];return r;}

function toast(msg,type){
var old=document.querySelector('.toast');if(old)old.remove();
var t=document.createElement('div');
t.className='toast'+(type?' '+type:'');t.textContent=msg;
document.body.appendChild(t);
setTimeout(function(){if(t.parentNode)t.remove();},2800);
}
function openM(id){document.getElementById(id).classList.add('on');}
function closeM(id){document.getElementById(id).classList.remove('on');}
document.querySelectorAll('[data-close]').forEach(function(b){b.addEventListener('click',function(){closeM(b.getAttribute('data-close'));});});
document.querySelectorAll('.overlay').forEach(function(o){o.addEventListener('click',function(e){if(e.target===o)o.classList.remove('on');});});

// ═══ CLOCK ═══
setInterval(function(){var el=document.getElementById('clockEl');if(el)el.textContent=new Date().toLocaleTimeString();},1000);

// ═══ SIDEBAR ═══
document.getElementById('menuBtn').addEventListener('click',function(){document.getElementById('sidebar').classList.add('open');document.getElementById('sidebarOverlay').classList.add('on');});
document.getElementById('sbClose').addEventListener('click',closeSidebar);
document.getElementById('sidebarOverlay').addEventListener('click',closeSidebar);
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('on');}

// ═══ KDS BUTTON ═══
document.getElementById('kdsBtn').addEventListener('click',function(){showPage('kds');});

// ═══ MOBILE CART DRAWER ═══
document.getElementById('cartFab').addEventListener('click',function(){syncDrawer();document.getElementById('cartDrawer').classList.add('on');});
document.getElementById('cartDrawerOverlay').addEventListener('click',function(){document.getElementById('cartDrawer').classList.remove('on');});
document.getElementById('cartClearBtn2').addEventListener('click',function(){clearCart();document.getElementById('cartDrawer').classList.remove('on');});
document.getElementById('discApply2').addEventListener('click',function(){ticket().discPct=parseFloat(document.getElementById('discIn2').value)||0;renderCartTotals();renderCartTotals2();});
document.getElementById('discIn2').addEventListener('input',function(){document.getElementById('discIn').value=this.value;});
document.getElementById('loyaltyBtn2').addEventListener('click',function(){openLoyalty();});
['payCash2','payCard2','paySplit2','payGC2'].forEach(function(id,i){
document.getElementById(id).addEventListener('click',function(){
document.getElementById('cartDrawer').classList.remove('on');
['cash','card','split','giftcard'][i]==='giftcard'?startGCPayment():startCheckout(['cash','card','split','giftcard'][i]);
});
});
function syncDrawer(){
var ci2=document.getElementById('custIn2');var ci=document.getElementById('custIn');
if(ci2&&ci){ci2.value=ci.value;}
renderCart2();renderCartTotals2();
}

// ═══ NUMPAD ═══
['1','2','3','4','5','6','7','8','9','⌫','0','✓'].forEach(function(k){
var btn=document.createElement('button');
btn.className='np-btn'+(k==='⌫'||k==='✓'?' np-clear':'');
btn.textContent=k;
btn.addEventListener('click',function(){
var pin=document.getElementById('pinInput');
if(k==='⌫')pin.value=pin.value.slice(0,-1);
else if(k==='✓')doLogin();
else if(pin.value.length<6)pin.value+=k;
});
document.getElementById('numpad').appendChild(btn);
});

// ═══ LOGIN ═══
function buildLoginUI(){
var grid=document.getElementById('userGrid');
grid.innerHTML=users.map(function(u){
return '<div class="user-card" data-uid="'+u.id+'">'+
'<div class="uc-av">'+u.av+'</div>'+
'<div class="uc-name">'+u.name+'</div>'+
'<div class="uc-role">'+u.role+'</div>'+
(u.clockedIn?'<div class="uc-status">● Active</div>':'')+
'</div>';
}).join('');
grid.querySelectorAll('.user-card').forEach(function(c){c.addEventListener('click',function(){selUser(c.getAttribute('data-uid'));});});
if(users.length)selUser(users[0].id);
document.getElementById('noShiftWarn').style.display=currentShift?'none':'block';
}

function selUser(id){
selLoginUser=users.find(function(u){return u.id===id;});
document.querySelectorAll('.user-card').forEach(function(c){c.classList.remove('selected');});
var card=document.querySelector('.user-card[data-uid="'+id+'"]');
if(card)card.classList.add('selected');
document.getElementById('pinInput').value='';
document.getElementById('loginErr').textContent='';
}

document.getElementById('loginBtn').addEventListener('click',doLogin);
document.getElementById('pinInput').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});

function doLogin(){
if(!selLoginUser){document.getElementById('loginErr').textContent='Select a user';return;}
var pin=document.getElementById('pinInput').value;
if(pin!==selLoginUser.pin){document.getElementById('loginErr').textContent='Wrong PIN';document.getElementById('pinInput').value='';return;}
currentUser=selLoginUser;
// Clock in
var now=new Date();
currentUser.clockedIn=true;
currentUser.clockInTime=now;
clockEvents.push({userId:currentUser.id,name:currentUser.name,type:'in',time:now});
// Shift handling
if(!currentShift){
document.getElementById('loginScreen').style.display='none';
document.getElementById('shiftOpenModal').classList.add('on');
} else {
launchApp();
}
}

// Open shift
document.getElementById('confirmOpenShift').addEventListener('click',function(){
var float=parseFloat(document.getElementById('openingFloat').value)||0;
currentShift={id:'SH'+Date.now(),openedBy:currentUser.name,openTime:new Date(),openingFloat:float,note:document.getElementById('shiftNote').value,sales:[],closedTime:null,closingCash:null};
shifts.push(currentShift);
document.getElementById('shiftOpenModal').classList.remove('on');
launchApp();
});

function launchApp(){
document.getElementById('loginScreen').style.display='none';
var app=document.getElementById('app');app.style.display='flex';app.style.flexDirection='column';
initApp();
}

document.getElementById('logoutBtn').addEventListener('click',function(){
if(currentShift&&currentShift.openTime){
openCloseShift();
} else {
doLogout();
}
});

function doLogout(){
if(currentUser){
var now=new Date();
var inTime=currentUser.clockInTime;
if(inTime){var hrs=(now-inTime)/3600000;currentUser.totalHours+=hrs;}
currentUser.clockedIn=false;currentUser.clockInTime=null;
clockEvents.push({userId:currentUser.id,name:currentUser.name,type:'out',time:now});
}
currentUser=null;
tickets=[{id:'T1',name:'Ticket 1',cart:[],cartTimers:{},discPct:0,customer:'',loyaltyDisc:0,loyaltyMemberId:null,gcCode:null,gcDisc:0}];
activeTicketId='T1';
var app=document.getElementById('app');app.style.display='none';
document.getElementById('loginScreen').style.display='flex';
document.getElementById('pinInput').value='';
buildLoginUI();
}

// ═══ INIT ═══
function initApp(){
document.getElementById('sbAv').textContent=currentUser.av;
document.getElementById('sbName').textContent=currentUser.name;
document.getElementById('sbRole').textContent=currentUser.role;
document.getElementById('curSel').value=cfg.currency;
buildSidebar();
buildBottomNav();
buildCats();buildProds();buildCourts();buildInv();buildSales();buildMembers();buildUsers();buildDash();buildGiftCards();buildPOs();refreshMemDl();checkLowStock();buildTicketTabs();renderCart();renderCartTotals();
var first=NAV.find(function(n){return currentUser.perms[n.perm];});
if(first)showPage(first.id);
}

function buildSidebar(){
var nav=document.getElementById('sbNav');nav.innerHTML='';
var sections={main:'Main',store:'Store',reports:'Reports',customers:'Customers',admin:'Admin'};
var seen={};
NAV.forEach(function(item){
if(!currentUser.perms[item.perm])return;
if(!seen[item.section]){
var s=document.createElement('div');s.className='nav-section';s.textContent=sections[item.section];nav.appendChild(s);seen[item.section]=true;
}
var btn=document.createElement('button');
btn.className='nav-btn';btn.id='nb-'+item.id;
btn.innerHTML='<span class="nav-icon">'+item.icon+'</span><span>'+item.label+'</span>';
btn.addEventListener('click',function(){showPage(item.id);closeSidebar();});
nav.appendChild(btn);
});
}

function buildBottomNav(){
var bn=document.getElementById('bnInner');bn.innerHTML='';
NAV.forEach(function(item){
if(!currentUser.perms[item.perm])return;
var d=document.createElement('div');d.className='bn-item';d.id='bn-'+item.id;
d.innerHTML='<div class="bn-icon">'+item.icon+'</div><div class="bn-label">'+item.label+'</div>';
d.addEventListener('click',function(){showPage(item.id);});
bn.appendChild(d);
});
}

function showPage(id){
document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on');});
document.querySelectorAll('.nav-btn,.bn-item').forEach(function(b){b.classList.remove('active');});
var pg=document.getElementById('pg-'+id);if(!pg)return;
pg.classList.add('on');
var nb=document.getElementById('nb-'+id);if(nb)nb.classList.add('active');
var bb=document.getElementById('bn-'+id);if(bb)bb.classList.add('active');
var item=NAV.find(function(n){return n.id===id;});
document.getElementById('tbTitle').textContent=item?item.label:'';
if(id==='sales')buildSales();
if(id==='inventory'){buildInv();buildAudit();}
if(id==='members')buildMembers();
if(id==='courts')buildCourts();
if(id==='users'){buildUsers();buildClockLog();}
if(id==='dashboard')buildDash();
if(id==='analytics')buildAnalytics();
if(id==='kds')buildKDS();
if(id==='giftcards')buildGiftCards();
if(id==='purchaseorders')buildPOs();
if(id==='shift')buildShiftReport();
if(id==='settings')buildSettingsPage();
}

// ═══ CURRENCY ═══
document.getElementById('curSel').addEventListener('change',function(){cfg.currency=this.value;renderCartTotals();renderCartTotals2();buildInv();buildSales();buildDash();toast('Currency: '+this.value);});

// ═══ CATEGORIES & PRODUCTS ═══
var CAT_ICONS={'All':'🎮','Snooker':'🎱','Paintball':'🎯','Basketball':'🏀','Bowling':'🎳','Table Tennis':'🏓','Darts':'🎯','Arcade':'🕹️','VR':'🥽','Soccer':'⚽','Boxing':'🥊','Badminton':'🏸','Food & Drinks':'🍔','Equipment':'🔧','Other':'📦'};
var TYPE_CLS={timed:'pt-timed',fixed:'pt-fixed',food:'pt-food',gear:'pt-gear'};
var TYPE_LBL={timed:'⏱ Timed',fixed:'✅ Fixed',food:'🍔 Food',gear:'🔧 Gear'};

function buildCats(){
var cats=['All'].concat(categories.filter(function(c){return products.some(function(p){return p.cat===c;});}));
document.getElementById('catsBar').innerHTML=cats.map(function(c){
return '<div class="cat'+(c===activeCat?' on':'')+'" data-cat="'+c+'">'+(CAT_ICONS[c]||'📦')+' '+c+'</div>';
}).join('');
document.querySelectorAll('#catsBar .cat').forEach(function(el){
el.addEventListener('click',function(){activeCat=el.getAttribute('data-cat');buildCats();buildProds();});
});
}

function buildProds(){
var q=(document.getElementById('posSearch').value||'').toLowerCase();
var list=products.filter(function(p){
return(activeCat==='All'||p.cat===activeCat)&&(!q||p.name.toLowerCase().includes(q)||p.cat.toLowerCase().includes(q));
});
if(!list.length){document.getElementById('prodGrid').innerHTML='<div class="empty"><span>🔍</span><p>No products</p></div>';return;}
document.getElementById('prodGrid').innerHTML=list.map(function(p){
var pr=p.type==='timed'?fmt(p.hourly)+'/hr':fmt(p.price);
return '<div class="prod" data-pid="'+p.id+'">'+
'<div class="ptb '+TYPE_CLS[p.type]+'">'+TYPE_LBL[p.type]+'</div>'+
'<div class="prod-icon">'+p.icon+'</div>'+
'<div class="prod-name">'+p.name+'</div>'+
'<div class="prod-price">'+pr+'</div>'+
'<div class="prod-stock">'+(p.stock===0?'∞':p.stock)+'</div>'+
'</div>';
}).join('');
document.querySelectorAll('#prodGrid .prod').forEach(function(el){
el.addEventListener('click',function(){handleProductClick(parseInt(el.getAttribute('data-pid')));});
});
}
document.getElementById('posSearch').addEventListener('input',function(){buildProds();});

function handleProductClick(pid){
if(!currentUser.perms.pos){toast('No POS access','err');return;}
var p=products.find(function(x){return x.id===pid;});if(!p)return;
if(p.modGroup){
var mg=modifierGroups.find(function(g){return g.id===p.modGroup;});
if(mg){openModifierPopup(pid,mg);return;}
}
addToCart(pid,[]);
}

// ═══ MODIFIER POPUP ═══
function openModifierPopup(pid,mg){
pendingModPid=pid;pendingModSelections={};
var p=products.find(function(x){return x.id===pid;});
document.getElementById('modTitle').innerHTML=(p?p.icon+' '+p.name:'Options')+' <button class="modal-close" data-close="mModifiers">✕</button>';
document.querySelector('#modTitle .modal-close').addEventListener('click',function(){closeM('mModifiers');});
var basePrice=p?(p.type==='timed'?p.hourly:p.price):0;
document.getElementById('modContent').innerHTML=
'<div class="mod-popup"><div class="mod-group"><div class="mod-group-name">'+mg.name+(mg.required?' (Required)':'')+'</div>'+
mg.options.map(function(opt){
var isRadio=mg.type==='single';
return '<div class="mod-opt" data-mgid="'+mg.id+'" data-optid="'+opt.id+'" data-price="'+opt.price+'" data-single="'+(isRadio?'1':'0')+'">'+
'<div class="mod-chk '+(isRadio?'mod-radio':'')+'" id="mc-'+opt.id+'"></div>'+
'<div class="mod-label">'+opt.name+'</div>'+
'<div class="mod-price">'+(opt.price>0?'+'+fmt(opt.price):opt.price===0?'Free':'')+'</div>'+
'</div>';
}).join('')+'</div></div>';
document.getElementById('modTotalPreview').textContent=fmt(basePrice);
document.querySelectorAll('.mod-opt').forEach(function(el){
el.addEventListener('click',function(){
var optId=el.getAttribute('data-optid');var mgId=el.getAttribute('data-mgid');
var isSingle=el.getAttribute('data-single')==='1';var price=parseFloat(el.getAttribute('data-price'))||0;
if(isSingle){
document.querySelectorAll('[data-mgid="'+mgId+'"] .mod-chk').forEach(function(c){c.classList.remove('on');});
pendingModSelections[mgId]=null;
}
var chk=document.getElementById('mc-'+optId);
if(chk.classList.contains('on')&&!isSingle){chk.classList.remove('on');if(pendingModSelections[mgId])pendingModSelections[mgId]=pendingModSelections[mgId].filter(function(x){return x.id!==optId;});}
else{chk.classList.add('on');if(isSingle){pendingModSelections[mgId]=[{id:optId,name:el.querySelector('.mod-label').textContent,price:price}];}
else{if(!pendingModSelections[mgId])pendingModSelections[mgId]=[];pendingModSelections[mgId].push({id:optId,name:el.querySelector('.mod-label').textContent,price:price});}}
// Update total
var extra=Object.values(pendingModSelections).reduce(function(a,v){return a+(v?v.reduce(function(b,o){return b+o.price;},0):0);},0);
document.getElementById('modTotalPreview').textContent=fmt(basePrice+extra);
});
});
document.getElementById('confirmModBtn').onclick=function(){
var mods=[];Object.values(pendingModSelections).forEach(function(v){if(v)v.forEach(function(o){mods.push(o);});});
addToCart(pendingModPid,mods);closeM('mModifiers');
};
openM('mModifiers');
}

// ═══ TICKET TABS ═══
function ticket(){return tickets.find(function(t){return t.id===activeTicketId;})||tickets[0];}

function buildTicketTabs(){
var container=document.getElementById('ticketTabs');
container.innerHTML='';
tickets.forEach(function(t){
var tab=document.createElement('div');
tab.className='ticket-tab'+(t.id===activeTicketId?' active':'');
tab.innerHTML='<span>'+t.name+'</span><span class="tc">'+(t.cart.length?'('+t.cart.length+')':'')+'</span>'+
(tickets.length>1?'<span class="close-t" data-tid="'+t.id+'">✕</span>':'');
tab.addEventListener('click',function(e){if(e.target.classList.contains('close-t'))return;activeTicketId=t.id;buildTicketTabs();renderCart();renderCartTotals();});
container.appendChild(tab);
});
container.querySelectorAll('.close-t').forEach(function(b){
b.addEventListener('click',function(e){e.stopPropagation();closeTicket(b.getAttribute('data-tid'));});
});
var addBtn=document.createElement('div');addBtn.className='add-ticket-btn';addBtn.textContent='＋';addBtn.addEventListener('click',addTicket);container.appendChild(addBtn);
}

function addTicket(){
var id='T'+Date.now();var num=tickets.length+1;
tickets.push({id:id,name:'Ticket '+num,cart:[],cartTimers:{},discPct:0,customer:'',loyaltyDisc:0,loyaltyMemberId:null,gcCode:null,gcDisc:0});
activeTicketId=id;buildTicketTabs();renderCart();renderCartTotals();
document.getElementById('custIn').value='';
document.getElementById('discIn').value='';
document.getElementById('loyaltyRow').style.display='none';
document.getElementById('gcRow').style.display='none';
document.getElementById('loyDiscRow').style.display='none';
}

function closeTicket(id){
if(tickets.length<=1)return;
var t=tickets.find(function(x){return x.id===id;});
if(t&&t.cart.length){if(!confirm('Close ticket "'+t.name+'" with '+t.cart.length+' items? Order will be lost.'))return;}
if(t)Object.values(t.cartTimers).forEach(clearInterval);
tickets=tickets.filter(function(x){return x.id!==id;});
if(activeTicketId===id)activeTicketId=tickets[0].id;
buildTicketTabs();renderCart();renderCartTotals();
}

// ═══ CART ═══
function addToCart(pid,mods){
var p=products.find(function(x){return x.id===pid;});if(!p)return;
var t=ticket();
var basePrice=p.type==='timed'?p.hourly:p.price;
var modExtra=(mods||[]).reduce(function(a,m){return a+m.price;},0);
// Merge non-timed without mods
if(p.type!=='timed'&&!mods.length){
var ex=t.cart.find(function(c){return c.pid===pid&&!c.mods.length;});
if(ex){ex.qty++;renderCart();renderCart2();toast(p.icon+' +1');updateCartBadge();if(p.type==='food')addToKDS(ex);return;}
}
var item={cid:uid(),pid:pid,name:p.name,icon:p.icon,type:p.type,qty:1,
price:basePrice+modExtra,basePrice:basePrice,cost:p.cost,hourly:p.hourly,
mods:mods||[],itemDisc:0,
sessStart:p.type==='timed'?new Date():null,sessEnd:null,elapsedSec:0,finalPrice:null};
t.cart.push(item);
if(p.type==='timed'){
t.cartTimers[item.cid]=setInterval(function(){
var ci=t.cart.find(function(c){return c.cid===item.cid;});
if(!ci||ci.sessEnd)return;
ci.elapsedSec=Math.floor((Date.now()-ci.sessStart.getTime())/1000);
var el=document.getElementById('tmr-'+item.cid);if(el)el.textContent=fmtTime(ci.elapsedSec);
renderCartTotals();renderCartTotals2();
},1000);
}
if(p.type==='food'){addToKDS(item);}
renderCart();renderCart2();toast(p.icon+' '+p.name,'ok');updateCartBadge();
}

function addToKDS(item){
var t=ticket();
var kds=kdsOrders.find(function(k){return k.ticketId===activeTicketId&&k.status==='new';});
if(kds){kds.items.push({name:item.name,icon:item.icon,mods:item.mods,cid:item.cid,done:false});}
else{kdsOrders.unshift({id:uid(),ticketId:activeTicketId,ticketName:t.name,customer:t.customer||'Walk-in',time:new Date(),status:'new',items:[{name:item.name,icon:item.icon,mods:item.mods,cid:item.cid,done:false}]});}
var dot=document.getElementById('kdsDot');if(dot)dot.style.display='block';
}

function endCartSession(cid){
var t=ticket();var ci=t.cart.find(function(c){return c.cid===cid;});if(!ci)return;
clearInterval(t.cartTimers[cid]);ci.sessEnd=new Date();
var hrs=ci.elapsedSec/3600;ci.finalPrice=Math.max(ci.hourly*Math.max(hrs,0.5),ci.hourly*0.5);
renderCart();renderCart2();renderCartTotals();renderCartTotals2();toast('Session ended - '+fmtTime(ci.elapsedSec));
}

function updateQty(cid,d){
var t=ticket();var ci=t.cart.find(function(c){return c.cid===cid;});if(!ci)return;
ci.qty+=d;if(ci.qty<=0)removeFromCart(cid);else{renderCart();renderCart2();updateCartBadge();}
}
function removeFromCart(cid){
var t=ticket();clearInterval(t.cartTimers[cid]);delete t.cartTimers[cid];
t.cart=t.cart.filter(function(c){return c.cid!==cid;});
renderCart();renderCart2();renderCartTotals();renderCartTotals2();updateCartBadge();
}
function clearCart(){
var t=ticket();Object.values(t.cartTimers).forEach(clearInterval);t.cartTimers={};t.cart=[];t.discPct=0;t.loyaltyDisc=0;t.loyaltyMemberId=null;t.gcCode=null;t.gcDisc=0;
document.getElementById('discIn').value='';document.getElementById('discIn2').value='';
document.getElementById('loyaltyRow').style.display='none';document.getElementById('gcRow').style.display='none';document.getElementById('loyDiscRow').style.display='none';
renderCart();renderCart2();renderCartTotals();renderCartTotals2();updateCartBadge();buildTicketTabs();
}
document.getElementById('cartClearBtn').addEventListener('click',clearCart);

function updateCartBadge(){
var t=ticket();var total=t.cart.reduce(function(a,c){return a+c.qty;},0);
var badge=document.getElementById('cartBadge');badge.style.display=total>0?'flex':'none';badge.textContent=total>9?'9+':total;
}

function cartItemHTML(ci){
var isTimed=ci.type==='timed';var isRunning=isTimed&&ci.sessStart&&!ci.sessEnd;
var lp=ci.finalPrice!==null?ci.finalPrice:(isTimed?ci.elapsedSec/3600*ci.hourly:ci.price*ci.qty);
var withDisc=ci.itemDisc>0?lp*(1-ci.itemDisc/100):lp;
return '<div class="ci">'+
'<div class="ci-icon">'+ci.icon+'</div>'+
'<div class="ci-body">'+
'<div class="ci-name">'+ci.name+'</div>'+
(ci.mods&&ci.mods.length?'<div class="ci-mods">'+ci.mods.map(function(m){return m.name;}).join(', ')+'</div>':'')+
'<div class="ci-meta">'+(isTimed?fmt(ci.hourly)+'/hr':fmt(ci.price)+' ×'+ci.qty)+'</div>'+
(isTimed?'<div class="ci-timer" id="tmr-'+ci.cid+'">'+fmtTime(ci.elapsedSec)+'</div>':'')+
(isRunning?'<div class="end-btn" data-cid="'+ci.cid+'">⏹ End</div>':'')+
(ci.sessEnd?'<div style="font-size:9px;color:var(--green)">✅ Ended</div>':'')+
'</div>'+
'<div class="ci-right">'+
(ci.itemDisc>0?'<div class="ci-disc">'+fmt(lp)+'</div>':'')+
'<div class="ci-total">'+fmt(Math.max(withDisc,0))+'</div>'+
(!isTimed?'<div class="qty-row"><div class="qb" data-cid="'+ci.cid+'" data-d="-1">-</div><div class="qi">'+ci.qty+'</div><div class="qb" data-cid="'+ci.cid+'" data-d="1">+</div></div>':'')+
'<div style="display:flex;gap:3px;">'+
'<button class="ci-disc-btn" data-disc-cid="'+ci.cid+'" title="Item discount">%</button>'+
'<button class="ci-rm" data-cid="'+ci.cid+'">✕</button>'+
'</div>'+
'</div>'+
'</div>';
}

function wireCartEvents(container){
container.querySelectorAll('.end-btn').forEach(function(b){b.addEventListener('click',function(){endCartSession(b.getAttribute('data-cid'));});});
container.querySelectorAll('.qb').forEach(function(b){b.addEventListener('click',function(){updateQty(b.getAttribute('data-cid'),parseInt(b.getAttribute('data-d')));});});
container.querySelectorAll('.ci-rm').forEach(function(b){b.addEventListener('click',function(){removeFromCart(b.getAttribute('data-cid'));});});
container.querySelectorAll('.ci-disc-btn').forEach(function(b){b.addEventListener('click',function(){openItemDiscount(b.getAttribute('data-disc-cid'));});});
}

function renderCart(){
var t=ticket();var el=document.getElementById('cartItems');if(!el)return;
document.getElementById('cartTitle').textContent='🧾 '+t.name;
document.getElementById('cartSubtitle').textContent=t.cart.length?t.cart.length+' item(s)':'';
if(!t.cart.length){el.innerHTML='<div class="cart-empty"><span>🎮</span><p>Cart is empty</p></div>';renderCartTotals();return;}
el.innerHTML=t.cart.map(cartItemHTML).join('');wireCartEvents(el);renderCartTotals();
}
function renderCart2(){
var t=ticket();var el=document.getElementById('cartItems2');if(!el)return;
if(!t.cart.length){el.innerHTML='<div class="cart-empty"><span>🎮</span><p>Cart is empty</p></div>';renderCartTotals2();return;}
el.innerHTML=t.cart.map(cartItemHTML).join('');wireCartEvents(el);renderCartTotals2();
}

function getCartTotals(){
var t=ticket();
var sub=t.cart.reduce(function(a,ci){
var lp=ci.finalPrice!==null?ci.finalPrice:(ci.type==='timed'?ci.elapsedSec/3600*ci.hourly:ci.price*ci.qty);
var wd=ci.itemDisc>0?lp*(1-ci.itemDisc/100):lp;
return a+Math.max(wd,0);
},0);
var disc=sub*(t.discPct||0)/100;
var loyD=t.loyaltyDisc||0;
var gcD=t.gcDisc||0;
var taxable=sub-disc-loyD-gcD;
var tax=Math.max(taxable,0)*(cfg.taxRate/100);
var total=Math.max(taxable,0)+tax;
return{sub:sub,disc:disc,loyD:loyD,gcD:gcD,tax:tax,total:total};
}

function renderCartTotals(){
var t=ticket();if(!t||!t.cart.length){['ctSub','ctTax','ctTotal'].forEach(function(i){var e=document.getElementById(i);if(e)e.textContent='-';});['discRow','loyDiscRow','gcRow'].forEach(function(i){var e=document.getElementById(i);if(e)e.style.display='none';});return;}
var tot=getCartTotals();
s('ctSub',fmt(tot.sub));s('ctTax',fmt(tot.tax));s('ctTotal',fmt(tot.total));s('taxLbl',cfg.taxRate);
tog('discRow',tot.disc>0);if(tot.disc>0)s('discAmt','-'+fmt(tot.disc));
tog('loyDiscRow',tot.loyD>0);if(tot.loyD>0)s('loyDiscAmt','-'+fmt(tot.loyD));
tog('gcRow',tot.gcD>0);if(tot.gcD>0)s('gcAmt','-'+fmt(tot.gcD));
}
function renderCartTotals2(){
var t=ticket();if(!t||!t.cart.length){['ctSub2','ctTax2','ctTotal2'].forEach(function(i){var e=document.getElementById(i);if(e)e.textContent='-';});return;}
var tot=getCartTotals();
s('ctSub2',fmt(tot.sub));s('ctTax2',fmt(tot.tax));s('ctTotal2',fmt(tot.total));
tog('discRow2',tot.disc>0);if(tot.disc>0)s('discAmt2','-'+fmt(tot.disc));
}

function s(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
function tog(id,on){var e=document.getElementById(id);if(e)e.style.display=on?'flex':'none';}

document.getElementById('discApply').addEventListener('click',function(){ticket().discPct=parseFloat(document.getElementById('discIn').value)||0;renderCartTotals();renderCartTotals2();buildTicketTabs();});
document.getElementById('discIn').addEventListener('input',function(){document.getElementById('discIn2').value=this.value;});

// ═══ ITEM DISCOUNT ═══
function openItemDiscount(cid){
pendingItemDiscCid=cid;var t=ticket();var ci=t.cart.find(function(c){return c.cid===cid;});if(!ci)return;
document.getElementById('itemDiscContent').innerHTML=
'<p style="font-size:12px;color:var(--text2);margin-bottom:10px;">Applying discount to <strong>'+ci.name+'</strong></p>'+
'<div class="fg"><label class="fl">Discount %</label><input class="fi" type="number" id="itemDiscPct" value="'+(ci.itemDisc||0)+'" min="0" max="100" inputmode="decimal"></div>'+
'<div class="fg"><label class="fl">Reason</label><input class="fi" id="itemDiscReason" placeholder="e.g. Loyalty, promo..."></div>'+
'<button class="btn-main" id="applyItemDiscBtn">Apply</button>';
document.getElementById('applyItemDiscBtn').onclick=function(){
var pct=parseFloat(document.getElementById('itemDiscPct').value)||0;
var c=ticket().cart.find(function(x){return x.cid===pendingItemDiscCid;});
if(c){c.itemDisc=Math.min(pct,100);}
closeM('mItemDisc');renderCart();renderCart2();renderCartTotals();renderCartTotals2();toast('Item discount applied');
};
openM('mItemDisc');
}

// ═══ LOYALTY ═══
document.getElementById('loyaltyBtn').addEventListener('click',openLoyalty);
document.getElementById('loyaltyBtn2').addEventListener('click',openLoyalty);
document.getElementById('removeLoyaltyBtn').addEventListener('click',function(){
var t=ticket();t.loyaltyDisc=0;t.loyaltyMemberId=null;
document.getElementById('loyaltyRow').style.display='none';renderCartTotals();renderCartTotals2();toast('Loyalty discount removed');
});

function openLoyalty(){
var custName=(document.getElementById('custIn').value||'').trim();
var mem=members.find(function(m){return m.name.toLowerCase().includes(custName.toLowerCase())&&custName.length>2;});
var t=ticket();var tot=getCartTotals();
var html='';
if(mem){
var maxRedeem=Math.floor(mem.pts/cfg.loyaltyRedeemRate);// pts/100 = currency units
var redeemValue=maxRedeem;
html='<div style="background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:12px;">'+
'<div style="font-size:13px;font-weight:800;">'+mem.name+'</div>'+
'<div style="font-size:11px;color:var(--text2)">'+mem.tier+' · <span style="color:var(--purple);font-weight:700;">'+mem.pts.toLocaleString()+' pts</span></div>'+
'</div>'+
'<div style="font-size:12px;color:var(--text2);margin-bottom:10px;">Redeem points as a discount ('+cfg.loyaltyRedeemRate+' pts = '+fmt(1)+')</div>'+
'<div class="fg"><label class="fl">Points to Redeem (max '+mem.pts+')</label>'+
'<input class="fi" type="number" id="redeemPts" value="'+Math.min(mem.pts,tot.total*cfg.loyaltyRedeemRate)+'" max="'+mem.pts+'" min="0" inputmode="numeric"></div>'+
'<div style="font-size:11px;color:var(--purple);margin-bottom:12px;">= <span id="redeemValue">'+fmt(redeemValue)+'</span> discount</div>'+
'<div style="font-size:11px;color:var(--text2);margin-bottom:10px;">- OR -</div>'+
'<div style="font-size:12px;font-weight:700;margin-bottom:6px;">Tier Upgrade</div>'+
'<div style="font-size:11px;color:var(--text2);margin-bottom:10px;">Current: <strong>'+mem.tier+'</strong><br>Silver: 500pts | Gold: 2000pts | Platinum: 8000pts</div>'+
'<button class="btn-purple" id="applyLoyaltyBtn" style="width:100%;">Apply Points Discount</button>';
} else {
html='<div style="color:var(--text2);font-size:12px;margin-bottom:10px;">Enter a member name in the Customer field first to look up their points.</div>';
}
document.getElementById('loyaltyContent').innerHTML=html;
if(mem){
document.getElementById('redeemPts').addEventListener('input',function(){
var pts=parseFloat(this.value)||0;document.getElementById('redeemValue').textContent=fmt(pts/cfg.loyaltyRedeemRate);
});
document.getElementById('applyLoyaltyBtn').onclick=function(){
var pts=parseFloat(document.getElementById('redeemPts').value)||0;
pts=Math.min(pts,mem.pts);
var discAmt=pts/cfg.loyaltyRedeemRate;
t.loyaltyDisc=discAmt;t.loyaltyMemberId=mem.id;
document.getElementById('loyaltyRow').style.display='flex';
s('loyaltyInfo','🎁 '+pts+' pts → '+fmt(discAmt));
closeM('mLoyalty');renderCartTotals();renderCartTotals2();toast('Loyalty discount: '+fmt(discAmt),'ok');
};
}
openM('mLoyalty');
}

// ═══ CHECKOUT ═══
document.getElementById('payCash').addEventListener('click',function(){startCheckout('cash');});
document.getElementById('payCard').addEventListener('click',function(){startCheckout('card');});
document.getElementById('paySplit').addEventListener('click',function(){startCheckout('split');});
document.getElementById('payGC').addEventListener('click',function(){startGCPayment();});

function startGCPayment(){
var code=prompt('Enter Gift Card code:');if(!code)return;
var gc=giftCards.find(function(g){return g.code===code.toUpperCase()&&g.active;});
if(!gc){toast('Invalid or inactive gift card','err');return;}
var t=ticket();var tot=getCartTotals();
var use=Math.min(gc.balance,tot.total);
t.gcCode=gc.code;t.gcDisc=use;
document.getElementById('gcRow').style.display='flex';
s('gcAmt','-'+fmt(use));
renderCartTotals();renderCartTotals2();
var remaining=tot.total-use;
if(remaining<=0){completeSale('Gift Card',getCartTotals());}
else{toast('GC applied: '+fmt(use)+' remaining: '+fmt(remaining));startCheckout('cash');}
}

function startCheckout(method){
var t=ticket();
if(!t.cart.length){toast('Cart is empty','err');return;}
var running=t.cart.filter(function(ci){return ci.type==='timed'&&ci.sessStart&&!ci.sessEnd;});
if(running.length){if(!confirm(running.length+' session(s) still running. End and checkout?'))return;running.forEach(function(ci){endCartSession(ci.cid);});}
var tot=getCartTotals();
var titles={cash:'💵 Cash',card:'💳 Card',split:'⚡ Split Payment',transfer:'📱 Transfer'};
document.getElementById('payTitle').innerHTML=(titles[method]||'Payment')+' <button class="modal-close" data-close="mPay">✕</button>';
document.querySelector('#payTitle .modal-close').addEventListener('click',function(){closeM('mPay');});
var html='<div class="pay-total-wrap"><div class="pay-total-lbl">TOTAL DUE</div><div class="pay-total-val">'+fmt(tot.total)+'</div></div>';

if(method==='cash'){
html+='<div class="fg"><label class="fl">Cash Tendered</label><input class="fi" type="number" id="cashIn" placeholder="Enter amount" inputmode="decimal"></div>'+
'<div class="change-box" id="changeBox" style="display:none"></div>';
} else if(method==='split'){
html+='<div class="split-label">Split payment - enter amounts for each method (must total '+fmt(tot.total)+')</div>'+
'<div class="split-row"><input class="fi" type="number" id="splitCash" placeholder="Cash amount" inputmode="decimal"><input class="fi" type="number" id="splitCard" placeholder="Card amount" inputmode="decimal"></div>'+
'<div class="split-row"><input class="fi" type="number" id="splitTransfer" placeholder="Transfer amount" inputmode="decimal"><div id="splitRemaining" style="font-family:\'JetBrains Mono\',monospace;font-size:13px;color:var(--text2);display:flex;align-items:center;padding:0 8px;"></div></div>';
} else {
html+='<div style="text-align:center;padding:14px;background:var(--bg3);border-radius:9px;margin-bottom:10px;font-size:13px;color:var(--text2);">'+
(method==='card'?'💳 Swipe/tap card for <strong>'+fmt(tot.total)+'</strong>':'📱 Transfer <strong>'+fmt(tot.total)+'</strong>')+'</div>';
}
html+='<button class="btn-main" id="confirmPayBtn" style="margin-top:8px">✅ Confirm Payment</button>';
document.getElementById('payBody').innerHTML=html;

if(method==='cash'){
document.getElementById('cashIn').addEventListener('input',function(){
var tendered=parseFloat(this.value)||0;var change=tendered-tot.total;
var box=document.getElementById('changeBox');box.style.display='block';
if(change>=0){box.textContent='Change: '+fmt(change);box.className='change-box change-pos';}
else{box.textContent='Need: '+fmt(Math.abs(change));box.className='change-box change-neg';}
});
} else if(method==='split'){
['splitCash','splitCard','splitTransfer'].forEach(function(id){
document.getElementById(id).addEventListener('input',function(){
var c=parseFloat(document.getElementById('splitCash').value)||0;
var k=parseFloat(document.getElementById('splitCard').value)||0;
var tr=parseFloat(document.getElementById('splitTransfer').value)||0;
var rem=tot.total-(c+k+tr);
var el=document.getElementById('splitRemaining');
if(Math.abs(rem)<0.01){el.textContent='✅ Balanced';el.style.color='var(-green)';}
else if(rem>0){el.textContent='Need: '+fmt(rem);el.style.color='var(-accent2)';}
else{el.textContent='Over: '+fmt(Math.abs(rem));el.style.color='var(-accent)';}
});
});
}
document.getElementById('confirmPayBtn').addEventListener('click',function(){completeSale(method,tot);});
openM('mPay');
}

function completeSale(method,tot){
closeM('mPay');
var t=ticket();
var custEl=document.getElementById('custIn');var customer=(custEl&&custEl.value)||t.customer||'Walk-in';
var items=t.cart.map(function(c){return Object.assign({},c);});
var sale={id:saleId++,date:new Date(),customer:customer,cashier:currentUser.name,items:items,
sub:tot.sub,disc:tot.disc,loyD:tot.loyD,gcD:tot.gcD,tax:tot.tax,total:tot.total,
method:method,currency:cfg.currency,status:'completed',refunded:false};
sales.unshift(sale);
if(currentShift)currentShift.sales.push(sale.id);

// Stock deduction + audit
items.forEach(function(ci){
var p=products.find(function(x){return x.id===ci.pid;});
if(p&&p.stock>0){
var before=p.stock;p.stock=Math.max(0,p.stock-ci.qty);
stockHistory.unshift({time:new Date(),product:p.name,before:before,after:p.stock,change:-ci.qty,reason:'Sale #'+sale.id,by:currentUser.name});
}
});

// Loyalty
var mem=members.find(function(m){return m.name.toLowerCase().includes(customer.toLowerCase());});
if(mem){
var earned=Math.floor(tot.total/100*cfg.loyaltyEarnRate);mem.pts+=earned;mem.visits++;mem.spent+=tot.total;
if(t.loyaltyMemberId&&t.loyaltyMemberId===mem.id&&t.loyaltyDisc>0){
var usedPts=Math.ceil(t.loyaltyDisc*cfg.loyaltyRedeemRate);
mem.pts=Math.max(0,mem.pts-usedPts);
mem.redeemHistory.push({date:new Date(),pts:usedPts,disc:t.loyaltyDisc,saleId:sale.id});
}
// Tier upgrade check
var newTier=mem.tier;
if(mem.pts>=8000)newTier='Platinum';else if(mem.pts>=2000)newTier='Gold';else if(mem.pts>=500)newTier='Silver';else newTier='Walk-in';
if(newTier!==mem.tier){mem.tier=newTier;toast('🎉 '+mem.name+' upgraded to '+newTier,'ok');}
}

// Gift card deduction
if(t.gcCode&&t.gcDisc>0){
var gc=giftCards.find(function(g){return g.code===t.gcCode;});
if(gc){gc.balance=Math.max(0,gc.balance-t.gcDisc);if(gc.balance===0)gc.active=false;}
}

// Mark KDS done
kdsOrders.forEach(function(k){if(k.ticketId===activeTicketId&&k.status!=='done')k.status='ready';});

var savedSale=sale;
clearCart();buildTicketTabs();
if(custEl)custEl.value='';
showReceipt(savedSale);
toast('✅ Sale #'+savedSale.id+' - '+fmt(tot.total),'ok');
checkLowStock();buildInv();
}

// ═══ RECEIPT ═══
function showReceipt(sale){
var timedItems=sale.items.filter(function(i){return i.type==='timed';});
var otherItems=sale.items.filter(function(i){return i.type!=='timed';});
var html='<div class="r-logo">🎮 '+cfg.bizName+'</div>'+
'<div class="r-center">'+cfg.bizAddr+'<br>'+cfg.bizPhone+'</div><hr>'+
'<div class="r-row"><span>Receipt #</span><span>'+sale.id+'</span></div>'+
'<div class="r-row"><span>Date</span><span>'+fmtDate(sale.date)+'</span></div>'+
'<div class="r-row"><span>Customer</span><span>'+sale.customer+'</span></div>'+
'<div class="r-row"><span>Cashier</span><span>'+sale.cashier+'</span></div><hr>';
if(timedItems.length){
html+='<div class="r-bold" style="margin-bottom:4px">TIMED SESSIONS</div>';
timedItems.forEach(function(i){
html+='<div class="r-row"><span>'+i.icon+' '+i.name+'</span><span class="r-bold">'+fmt(i.finalPrice||0)+'</span></div>'+
'<div style="color:#777;font-size:10px">Start: '+(i.sessStart?fmtDate(new Date(i.sessStart)):'-')+'</div>'+
'<div class="r-row" style="color:#777;font-size:10px"><span>End: '+(i.sessEnd?fmtDate(new Date(i.sessEnd)):'-')+'</span><span>'+fmtTime(i.elapsedSec)+'</span></div>';
});html+='<hr>';
}
otherItems.forEach(function(i){
html+='<div class="r-row"><span>'+i.icon+' '+i.name+(i.mods&&i.mods.length?' ('+i.mods.map(function(m){return m.name;}).join(', ')+')':'')+' ×'+i.qty+'</span><span>'+fmt(i.price*i.qty)+'</span></div>';
});
if(otherItems.length)html+='<hr>';
html+='<div class="r-row"><span>Subtotal</span><span>'+fmt(sale.sub)+'</span></div>';
if(sale.disc>0)html+='<div class="r-row" style="color:red"><span>Order Discount</span><span>-'+fmt(sale.disc)+'</span></div>';
if(sale.loyD>0)html+='<div class="r-row" style="color:purple"><span>Loyalty Points</span><span>-'+fmt(sale.loyD)+'</span></div>';
if(sale.gcD>0)html+='<div class="r-row" style="color:purple"><span>Gift Card</span><span>-'+fmt(sale.gcD)+'</span></div>';
html+='<div class="r-row"><span>Tax ('+cfg.taxRate+'%)</span><span>'+fmt(sale.tax)+'</span></div>'+
'<div class="r-row r-bold" style="font-size:14px;margin-top:3px"><span>TOTAL</span><span>'+fmt(sale.total)+'</span></div>'+
'<div class="r-row"><span>Payment</span><span>'+sale.method.toUpperCase()+'</span></div>'+
'<hr><div class="r-center">'+cfg.footer+'</div>';
if(sale.refunded)html='<div style="text-align:center;color:red;font-weight:700;border:2px solid red;border-radius:6px;padding:4px;margin-bottom:8px">** REFUNDED **</div>'+html;
document.getElementById('receiptBody').innerHTML=html;
document.getElementById('printZone').innerHTML='<div style="font-family:monospace;font-size:11px;padding:16px;max-width:300px;margin:auto;">'+html+'</div>';
openM('mReceipt');
}
document.getElementById('printBtn').addEventListener('click',function(){window.print();});

// ═══ COURTS (C1-C: Sports/Dining) ═══
function buildCourts(){
document.getElementById('courtsGrid').innerHTML=courts.map(function(c){
var isOcc=c.status==='occupied';var isDining=c.mode==='dining';
var elapsed=isOcc&&!isDining?Math.floor((Date.now()-c.start)/1000):0;
var p=products.find(function(x){return x.id===c.linked;});
var diningItems=c.diningTicket?c.diningTicket.cart.length:0;
return '<div class="court '+(isOcc?(isDining?'dining-occupied':'occupied'):'available')+'">'+
'<div class="court-hdr"><div class="court-icon">'+c.icon+'</div>'+
'<div class="court-badges">'+
'<div class="court-status '+(isOcc?(isDining?'cs-dining':'cs-occ'):'cs-avail')+'">'+c.status+'</div>'+
'<div class="court-type-badge '+(isDining?'ct-dining':'ct-sports')+'">'+(isDining?'🍽️ Dining':'🏆 Sports')+'</div>'+
'</div></div>'+
'<div class="court-name">'+c.name+'</div>'+
'<div class="court-sub">'+c.type+'</div>'+
(!isDining&&isOcc?'<div class="court-timer" id="ct-'+c.id+'">'+fmtTime(elapsed)+'</div>':'')+
(isOcc?'<div class="court-cust">👤 '+c.cust+'</div>':'')+
(isDining&&isOcc&&diningItems?'<div class="court-items">'+diningItems+' items on ticket</div>':'')+
(!isDining&&p&&isOcc?'<div class="court-sub">'+fmt(p.hourly)+'/hr</div>':'')+
'<div class="court-actions">'+
(!isOcc?'<button class="court-btn cb-start" data-cid="'+c.id+'">▶ Start</button>':'')+
(!isDining&&isOcc?'<button class="court-btn cb-end" data-cid="'+c.id+'">⏹ Bill</button>':'')+
(isDining&&isOcc?'<button class="court-btn cb-view" data-cid="'+c.id+'">📋 Order</button><button class="court-btn cb-end" data-cid="'+c.id+'" style="background:var(--accent2);color:#fff">✓ Bill</button>':'')+
'</div>'+
'</div>';
}).join('');
document.querySelectorAll('.cb-start').forEach(function(b){b.addEventListener('click',function(){startCourt(parseInt(b.getAttribute('data-cid')));});});
document.querySelectorAll('.cb-end').forEach(function(b){b.addEventListener('click',function(){endCourt(parseInt(b.getAttribute('data-cid')));});});
document.querySelectorAll('.cb-view').forEach(function(b){b.addEventListener('click',function(){viewDiningTicket(parseInt(b.getAttribute('data-cid')));});});
}

setInterval(function(){courts.forEach(function(c){if(c.status!=='occupied'||c.mode==='dining')return;var el=document.getElementById('ct-'+c.id);if(el)el.textContent=fmtTime(Math.floor((Date.now()-c.start)/1000));});},1000);

function startCourt(cid){
var c=courts.find(function(x){return x.id===cid;});
var name=prompt('Starting at '+c.name+'.\nCustomer name:');if(!name)return;
c.status='occupied';c.cust=name;c.start=Date.now();
if(c.mode==='dining'){c.diningTicket={cart:[],cartTimers:{},discPct:0,customer:name};}
buildCourts();toast('▶ Session started - '+c.name,'ok');
}

function viewDiningTicket(cid){
var c=courts.find(function(x){return x.id===cid;});if(!c||!c.diningTicket)return;
// Switch to POS, create/use a ticket for this table
showPage('pos');
var existing=tickets.find(function(t){return t.name===c.name;});
if(!existing){
var id='T'+Date.now();
tickets.push({id:id,name:c.name,cart:c.diningTicket.cart||[],cartTimers:{},discPct:0,customer:c.cust,loyaltyDisc:0,loyaltyMemberId:null,gcCode:null,gcDisc:0});
activeTicketId=id;
} else {activeTicketId=existing.id;}
buildTicketTabs();renderCart();renderCartTotals();
toast('📋 Viewing '+c.name+' ticket');
}

function endCourt(cid){
var c=courts.find(function(x){return x.id===cid;});
if(!confirm('End session for "'+c.cust+'" at '+c.name+'?'))return;
if(c.mode==='dining'){
// Bill the dining ticket
if(c.diningTicket&&c.diningTicket.cart.length){
var t=tickets.find(function(x){return x.name===c.name;});
if(t){activeTicketId=t.id;renderCart();renderCartTotals();}
showPage('pos');toast('Please complete payment for '+c.name);
}
c.status='available';c.cust='';c.diningTicket=null;buildCourts();
} else {
var elapsed=Math.floor((Date.now()-c.start)/1000);
var p=products.find(function(x){return x.id===c.linked;});
var hrs=elapsed/3600;var amount=p?Math.max(p.hourly*Math.max(hrs,0.5),0):0;
var startTime=new Date(c.start);var endTime=new Date();
var sale={id:saleId++,date:endTime,customer:c.cust,cashier:currentUser.name,
items:[{icon:c.icon,name:c.name+(p?' ('+p.name+')':''),type:'timed',qty:1,mods:[],itemDisc:0,
sessStart:startTime,sessEnd:endTime,elapsedSec:elapsed,finalPrice:amount,price:amount,cost:p?p.cost:0,hourly:p?p.hourly:0}],
sub:amount,disc:0,loyD:0,gcD:0,tax:amount*(cfg.taxRate/100),total:amount+(amount*(cfg.taxRate/100)),
method:'pending',currency:cfg.currency,status:'completed',refunded:false};
sales.unshift(sale);if(currentShift)currentShift.sales.push(sale.id);
c.status='available';c.cust='';c.start=0;buildCourts();showReceipt(sale);
toast('✅ Session ended - '+fmt(sale.total),'ok');checkLowStock();
}
}

document.getElementById('addCourtBtn').addEventListener('click',function(){
var sel=document.getElementById('cLinked');
sel.innerHTML='<option value="">None</option>'+products.filter(function(p){return p.type==='timed';}).map(function(p){return '<option value="'+p.id+'">'+p.icon+' '+p.name+'</option>';}).join('');
openM('mAddCourt');
});
document.getElementById('cMode').addEventListener('change',function(){
document.getElementById('cLinkedWrap').style.display=this.value==='sports'?'block':'none';
});
document.getElementById('saveCourtBtn').addEventListener('click',function(){
var name=document.getElementById('cName').value.trim();if(!name){toast('Name required','err');return;}
courts.push({id:Date.now(),name:name,icon:document.getElementById('cIcon').value||'🎮',type:document.getElementById('cType').value||'Other',mode:document.getElementById('cMode').value,status:'available',linked:parseInt(document.getElementById('cLinked').value)||0,cust:'',start:0,diningTicket:null});
closeM('mAddCourt');buildCourts();toast('Court added','ok');
document.getElementById('cName').value='';document.getElementById('cIcon').value='';
});

// ═══ INVENTORY ═══
function buildInv(){
var q=(document.getElementById('invSearch').value||'').toLowerCase();
var catF=document.getElementById('invCatF').value;
var cats=[];products.forEach(function(p){if(!cats.includes(p.cat))cats.push(p.cat);});
document.getElementById('invCatF').innerHTML='<option value="">All Categories</option>'+cats.map(function(c){return '<option value="'+c+'"'+(catF===c?' selected':'')+'>'+c+'</option>';}).join('');
var list=products.filter(function(p){return(!q||p.name.toLowerCase().includes(q)||p.cat.toLowerCase().includes(q))&&(!catF||p.cat===catF);});
if(!list.length){document.getElementById('invBody').innerHTML='<tr><td colspan="6"><div class="empty"><span>📦</span><p>No products</p></div></td></tr>';return;}
document.getElementById('invBody').innerHTML=list.map(function(p){
var bp=p.type==='timed'?p.hourly:p.price;
var isLow=p.stock>0&&p.stock<=p.low;var isOut=p.stock>0&&p.stock===0;
var sbCls=isOut?'sb-out':isLow?'sb-low':'sb-ok';
var canAdj=currentUser.perms.stockAdj;var isAdm=currentUser.role==='admin';
return '<tr><td>'+p.icon+' '+p.name+'<br><span style="font-size:10px;color:var(--text3)">'+p.cat+'</span></td>'+
'<td><span style="font-size:10px">'+TYPE_LBL[p.type]+'</span></td>'+
'<td class="mono">'+fmt(bp)+(p.type==='timed'?'/hr':'')+'</td>'+
'<td class="mono">'+(p.stock===0?'∞':p.stock)+'</td>'+
'<td><span class="sb '+(p.stock===0?'sb-ok':sbCls)+'">'+(p.stock===0?'Unlimited':isOut?'Out':isLow?'Low':'OK')+'</span></td>'+
'<td><div class="tbl-actions">'+
(p.stock!==0?'<button class="btn-ghost btn-sm" data-restock="'+p.id+'">+Stock</button>':'')+
(canAdj&&p.stock!==0?'<button class="btn-danger" data-adjust="'+p.id+'">Adj</button>':'')+
(isAdm?'<button class="btn-danger" data-delprod="'+p.id+'">Del</button>':'')+
'</div></td></tr>';
}).join('');
document.querySelectorAll('[data-restock]').forEach(function(b){b.addEventListener('click',function(){openRestock(parseInt(b.getAttribute('data-restock')));});});
document.querySelectorAll('[data-adjust]').forEach(function(b){b.addEventListener('click',function(){doAdjust(parseInt(b.getAttribute('data-adjust')));});});
document.querySelectorAll('[data-delprod]').forEach(function(b){b.addEventListener('click',function(){
if(!confirm('Delete this product?'))return;
products=products.filter(function(x){return x.id!==parseInt(b.getAttribute('data-delprod'));});buildInv();buildCats();buildProds();toast('Deleted');
});});
}
document.getElementById('invSearch').addEventListener('input',function(){buildInv();});
document.getElementById('invCatF').addEventListener('change',function(){buildInv();});
document.getElementById('exportInvBtn').addEventListener('click',function(){
var csv=['Name,Category,Type,Price,Cost,Stock'].concat(products.map(function(p){return '"'+p.name+'","'+p.cat+'","'+p.type+'",'+(p.type==='timed'?p.hourly:p.price)+','+p.cost+','+p.stock;})).join('\n');
dlCSV(csv,'inventory.csv');toast('Exported');
});

function openRestock(pid){
pendingRestockId=pid;var p=products.find(function(x){return x.id===pid;});
document.getElementById('restockBody').innerHTML=
'<p style="font-size:12px;color:var(--text2);margin-bottom:10px">Restocking <strong>'+p.icon+' '+p.name+'</strong> (Current: '+p.stock+')</p>'+
'<div class="fg"><label class="fl">Quantity to Add</label><input class="fi" id="rQty" type="number" min="1" inputmode="numeric" placeholder="e.g. 50"></div>'+
'<div class="fg"><label class="fl">Supplier / Note</label><input class="fi" id="rNote" placeholder="Supplier name or note"></div>'+
'<button class="btn-main" id="confirmRBtn">Add Stock</button>';
document.getElementById('confirmRBtn').addEventListener('click',function(){
var qty=parseInt(document.getElementById('rQty').value)||0;if(qty<=0){toast('Enter valid qty','err');return;}
var prod=products.find(function(x){return x.id===pendingRestockId;});
var before=prod.stock;prod.stock+=qty;
stockHistory.unshift({time:new Date(),product:prod.name,before:before,after:prod.stock,change:qty,reason:'Restock: '+document.getElementById('rNote').value,by:currentUser.name});
closeM('mRestock');buildInv();buildProds();toast('✅ Restocked +'+qty,'ok');checkLowStock();
});
openM('mRestock');
}

function doAdjust(pid){
if(!currentUser.perms.stockAdj){toast('Admin permission required','err');return;}
var p=products.find(function(x){return x.id===pid;});
var nq=prompt('Adjust stock for "'+p.name+'"\nCurrent: '+p.stock+'\nNew quantity:');if(nq===null)return;
var n=parseInt(nq);if(isNaN(n)||n<0){toast('Invalid','err');return;}
var reason=prompt('Reason for adjustment:');if(!reason){toast('Reason required','err');return;}
var before=p.stock;p.stock=n;
stockHistory.unshift({time:new Date(),product:p.name,before:before,after:n,change:n-before,reason:reason,by:currentUser.name});
buildInv();buildProds();toast('Stock: '+before+' → '+n);checkLowStock();
}

function buildAudit(){
document.getElementById('auditBody').innerHTML=stockHistory.slice(0,50).map(function(h){
return '<tr><td style="font-size:10px;color:var(--text2)">'+fmtDate(h.time)+'</td>'+
'<td>'+h.product+'</td>'+
'<td class="mono" style="color:'+(h.change>=0?'var(--green)':'var(--accent2)')+'">'+
(h.change>=0?'+':'')+h.change+'</td>'+
'<td style="font-size:11px;color:var(--text2)">'+h.reason+'</td>'+
'<td style="font-size:11px;color:var(--text2)">'+h.by+'</td></tr>';
}).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:12px">No audit history yet</td></tr>';
}

// Product form
document.getElementById('pType').addEventListener('change',function(){
document.getElementById('pTimedF').style.display=this.value==='timed'?'block':'none';
document.getElementById('pFixedF').style.display=this.value!=='timed'?'block':'none';
});
document.getElementById('addProductBtn').addEventListener('click',function(){
// Populate cat and mod group dropdowns
document.getElementById('pCat').innerHTML=categories.map(function(c){return '<option>'+c+'</option>';}).join('');
document.getElementById('pModGroup').innerHTML='<option value="">None</option>'+modifierGroups.map(function(g){return '<option value="'+g.id+'">'+g.name+'</option>';}).join('');
openM('mAddProduct');
});
document.getElementById('saveProductBtn').addEventListener('click',function(){
var name=document.getElementById('pName').value.trim();var type=document.getElementById('pType').value;
if(!name){toast('Name required','err');return;}
var hourly=parseFloat(document.getElementById('pHourly').value)||0;var price=parseFloat(document.getElementById('pPrice').value)||0;
if(type==='timed'&&!hourly){toast('Enter hourly rate','err');return;}
if(type!=='timed'&&!price){toast('Enter price','err');return;}
products.push({id:Date.now(),name:name,icon:document.getElementById('pIcon').value||'📦',cat:document.getElementById('pCat').value,type:type,hourly:hourly,price:price,cost:parseFloat(document.getElementById('pCost').value)||0,stock:parseInt(document.getElementById('pStock').value)||0,low:parseInt(document.getElementById('pLow').value)||5,modGroup:document.getElementById('pModGroup').value||''});
closeM('mAddProduct');buildCats();buildProds();buildInv();toast('✅ '+name+' added','ok');
['pName','pIcon','pHourly','pMinSess','pPrice','pCost','pStock','pLow'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
});

// ═══ SALES + REFUNDS ═══
function buildSales(){
var filter=document.getElementById('salesFilter').value;var now=new Date();
var list=sales.filter(function(s){
if(filter==='today')return s.date.toDateString()===now.toDateString();
if(filter==='week'){var d=new Date(now);d.setDate(d.getDate()-7);return s.date>=d;}return true;
});
var rev=list.reduce(function(a,s){return a+s.total;},0);
var todayList=sales.filter(function(s){return s.date.toDateString()===now.toDateString();});
var todayRev=todayList.reduce(function(a,s){return a+s.total;},0);
var refunds=sales.filter(function(s){return s.refunded;}).length;
document.getElementById('salesStats').innerHTML=
'<div class="stat"><div class="stat-lbl">Total Revenue</div><div class="stat-val">'+fmt(list.reduce(function(a,s){return a+s.total;},0))+'</div></div>'+
'<div class="stat"><div class="stat-lbl">Today</div><div class="stat-val blue">'+fmt(todayRev)+'</div><div class="stat-sub">'+todayList.length+' sales</div></div>'+
'<div class="stat"><div class="stat-lbl">Avg Ticket</div><div class="stat-val">'+(list.length?fmt(rev/list.length):'-')+'</div></div>'+
'<div class="stat red"><div class="stat-lbl">Refunds</div><div class="stat-val">'+refunds+'</div></div>';
if(!list.length){document.getElementById('salesBody').innerHTML='<tr><td colspan="8"><div class="empty"><span>📊</span><p>No sales yet</p></div></td></tr>';return;}
document.getElementById('salesBody').innerHTML=list.map(function(s){
return '<tr>'+
'<td class="mono" style="color:var(--accent)">#'+s.id+'</td>'+
'<td style="font-size:10px;color:var(--text2)">'+fmtDate(s.date)+'</td>'+
'<td>'+s.customer+'</td>'+
'<td style="font-size:10px;color:var(--text2)">'+s.cashier+'</td>'+
'<td><span style="font-size:10px;background:rgba(255,255,255,.06);color:var(--text2);padding:2px 6px;border-radius:4px">'+s.method+'</span></td>'+
'<td class="mono" style="color:var(--accent);font-weight:700">'+fmt(s.total)+'</td>'+
'<td>'+(s.refunded?'<span class="sb sb-out">Refunded</span>':'<span class="sb sb-ok">Done</span>')+'</td>'+
'<td><div class="tbl-actions">'+
'<button class="btn-ghost btn-sm" data-sid="'+s.id+'">Receipt</button>'+
(!s.refunded&&currentUser.perms.refunds?'<button class="btn-danger" data-refund="'+s.id+'">Refund</button>':'')+
'</div></td></tr>';
}).join('');
document.querySelectorAll('[data-sid]').forEach(function(b){b.addEventListener('click',function(){var s=sales.find(function(x){return x.id===parseInt(b.getAttribute('data-sid'));});if(s)showReceipt(s);});});
document.querySelectorAll('[data-refund]').forEach(function(b){b.addEventListener('click',function(){openRefund(parseInt(b.getAttribute('data-refund')));});});
}
document.getElementById('salesFilter').addEventListener('change',function(){buildSales();});
document.getElementById('exportSalesBtn').addEventListener('click',function(){
var csv=['#,Date,Customer,Cashier,Total,Method,Status'].concat(sales.map(function(s){return s.id+',"'+fmtDate(s.date)+'","'+s.customer+'","'+s.cashier+'",'+s.total+','+s.method+','+(s.refunded?'Refunded':'Completed');})).join('\n');
dlCSV(csv,'sales.csv');toast('Exported');
});

function openRefund(saleId){
var sale=sales.find(function(x){return x.id===saleId;});if(!sale||sale.refunded)return;
var html='<p style="font-size:12px;color:var(--text2);margin-bottom:10px">Refunding Sale #'+sale.id+' - <strong>'+sale.customer+'</strong></p>'+
'<div style="background:var(--bg3);border-radius:8px;padding:10px;margin-bottom:10px;">'+
'<div style="font-size:11px;font-weight:700;margin-bottom:6px">Select items to refund:</div>'+
sale.items.map(function(i,idx){
var lp=i.finalPrice||i.price*i.qty;
return '<div style="display:flex;align-items:center;gap:7px;padding:4px 0;border-bottom:1px solid var(--border);">'+
'<input type="checkbox" id="ri-'+idx+'" checked style="width:16px;height:16px;">'+
'<label for="ri-'+idx+'" style="flex:1;font-size:12px;">'+i.icon+' '+i.name+' ×'+i.qty+'</label>'+
'<span class="mono" style="font-size:11px;color:var(--accent)">'+fmt(lp)+'</span></div>';
}).join('')+'</div>'+
'<div class="fg"><label class="fl">Refund Reason</label><input class="fi" id="refundReason" placeholder="Customer complaint, wrong item..."></div>'+
'<button class="btn-main" id="confirmRefundBtn" style="background:var(--accent2)">Process Refund</button>';
document.getElementById('refundBody').innerHTML=html;
document.getElementById('confirmRefundBtn').addEventListener('click',function(){
var reason=document.getElementById('refundReason').value.trim();if(!reason){toast('Reason required','err');return;}
var selectedIdx=[];sale.items.forEach(function(item,idx){var cb=document.getElementById('ri-'+idx);if(cb&&cb.checked)selectedIdx.push(idx);});
if(!selectedIdx.length){toast('Select at least one item','err');return;}
// Return stock
selectedIdx.forEach(function(idx){
var item=sale.items[idx];var p=products.find(function(x){return x.id===item.pid;});
if(p&&p.stock>0){var before=p.stock;p.stock+=item.qty;stockHistory.unshift({time:new Date(),product:p.name,before:before,after:p.stock,change:item.qty,reason:'Refund #'+saleId+': '+reason,by:currentUser.name});}
});
sale.refunded=true;sale.refundReason=reason;sale.refundDate=new Date();
closeM('mRefund');buildSales();buildInv();
toast('✅ Refund processed for Sale #'+saleId,'ok');
});
openM('mRefund');
}

// ═══ ANALYTICS ═══
function buildAnalytics(){
var days=parseInt(document.getElementById('analyticsFilter').value)||7;
var now=new Date();
var filtered=days===999?sales:sales.filter(function(s){
var cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-days);return s.date>=cutoff;
});
var rev=filtered.reduce(function(a,s){return a+s.total;},0);
var avgT=filtered.length?rev/filtered.length:0;
document.getElementById('analyticsStats').innerHTML=
'<div class="stat"><div class="stat-lbl">Revenue</div><div class="stat-val">'+fmt(rev)+'</div></div>'+
'<div class="stat blue"><div class="stat-lbl">Sales</div><div class="stat-val">'+filtered.length+'</div></div>'+
'<div class="stat green"><div class="stat-lbl">Avg Ticket</div><div class="stat-val">'+fmt(avgT)+'</div></div>'+
'<div class="stat purple"><div class="stat-lbl">Members</div><div class="stat-val">'+members.length+'</div></div>';
// Revenue by day
var dayMap={};for (var i = Math.min(days, 14) - 1; i >= 0; i--) {var d=new Date(now);d.setDate(d.getDate()-i);dayMap[fmtDateShort(d)]=0;}
filtered.forEach(function(s){var k=fmtDateShort(s.date);if(dayMap[k]!==undefined)dayMap[k]+=s.total;});
drawChart('chartRevenue',Object.keys(dayMap),Object.values(dayMap),'bar','Revenue','rgba(245,166,35,0.7)');
// Top products
var prodMap={};filtered.forEach(function(s){s.items.forEach(function(i){if(!prodMap[i.name])prodMap[i.name]=0;var lp=i.finalPrice||i.price*i.qty;prodMap[i.name]+=lp;});});
var topProds=Object.entries(prodMap).sort(function(a,b){return b[1]-a[1];}).slice(0,6);
drawChart('chartProducts',topProds.map(function(x){return x[0];}),topProds.map(function(x){return x[1];}), 'bar','Revenue','rgba(52,152,219,0.7)');
// By category
var catMap={};filtered.forEach(function(s){s.items.forEach(function(i){var p=products.find(function(x){return x.id===i.pid;});var cat=p?p.cat:'Other';if(!catMap[cat])catMap[cat]=0;catMap[cat]+=i.finalPrice||i.price*i.qty;});});
var colors=['rgba(245,166,35,.7)','rgba(52,152,219,.7)','rgba(46,204,113,.7)','rgba(232,82,58,.7)','rgba(155,89,182,.7)','rgba(26,188,156,.7)'];
drawChart('chartCats',Object.keys(catMap),Object.values(catMap),'doughnut','By Category',colors.slice(0,Object.keys(catMap).length));
// By staff
var staffMap={};filtered.forEach(function(s){if(!staffMap[s.cashier])staffMap[s.cashier]=0;staffMap[s.cashier]+=s.total;});
drawChart('chartStaff',Object.keys(staffMap),Object.values(staffMap),'bar','By Staff','rgba(155,89,182,0.7)');
}
document.getElementById('analyticsFilter').addEventListener('change',function(){buildAnalytics();});

function drawChart(canvasId,labels,data,type,label,color){
var ctx=document.getElementById(canvasId);if(!ctx)return;
if(charts[canvasId])charts[canvasId].destroy();
charts[canvasId]=new Chart(ctx,{
type:type,
data:{labels:labels,datasets:[{label:label,data:data,backgroundColor:Array.isArray(color)?color:color,borderColor:Array.isArray(color)?color:color,borderWidth:1,borderRadius:type==='bar'?4:0}]},
options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==='doughnut',labels:{color:'#8B90A4',font:{size:10}}}},scales:type!=='doughnut'?{x:{ticks:{color:'#5A5F72',font:{size:9}},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#5A5F72',font:{size:9}},grid:{color:'rgba(255,255,255,.04)'},beginAtZero:true}}:{}}
});
}

// ═══ KDS ═══
function buildKDS(){
var open=kdsOrders.filter(function(k){return k.status!=='done';});
document.getElementById('kdsCount').textContent=open.length+' active order(s)';
document.getElementById('kdsDot').style.display=open.length?'block':'none';
if(!open.length){document.getElementById('kdsGrid').innerHTML='<div class="empty"><span>🍳</span><p>No pending orders</p></div>';return;}
document.getElementById('kdsGrid').innerHTML=open.map(function(k){
var elapsed=Math.floor((Date.now()-k.time.getTime())/1000);
return '<div class="kds-card '+k.status+'">'+
'<div class="kds-hdr"><div class="kds-ticket">'+k.ticketName+'</div><div class="kds-time" id="kds-t-'+k.id+'">'+fmtTime(elapsed)+'</div></div>'+
'<div class="kds-cust">👤 '+k.customer+'</div>'+
k.items.map(function(i){return '<div class="kds-item'+(i.done?' done':'')+'">'+
'<span>'+i.icon+' '+i.name+(i.mods&&i.mods.length?' - '+i.mods.map(function(m){return m.name;}).join(', '):'')+'</span>'+
'<input type="checkbox" '+(i.done?'checked':'')+' data-kdsid="'+k.id+'" data-itemcid="'+i.cid+'">'+
'</div>';}).join('')+
'<div class="kds-actions">'+
(k.status==='new'?'<button class="kds-btn kds-progress" data-kdsid="'+k.id+'">In Progress</button>':'')+
'<button class="kds-btn kds-bump" data-bump="'+k.id+'">✓ Done</button>'+
'</div>'+
'</div>';
}).join('');
document.querySelectorAll('[data-kdsid].kds-btn').forEach(function(b){b.addEventListener('click',function(){var k=kdsOrders.find(function(x){return x.id===b.getAttribute('data-kdsid');});if(k)k.status='in-progress';buildKDS();});});
document.querySelectorAll('[data-bump]').forEach(function(b){b.addEventListener('click',function(){var k=kdsOrders.find(function(x){return x.id===b.getAttribute('data-bump');});if(k)k.status='done';buildKDS();toast('Order bumped','ok');});});
document.querySelectorAll('[data-itemcid]').forEach(function(cb){cb.addEventListener('change',function(){var k=kdsOrders.find(function(x){return x.id===cb.getAttribute('data-kdsid');});if(!k)return;var item=k.items.find(function(i){return i.cid===cb.getAttribute('data-itemcid');});if(item)item.done=cb.checked;buildKDS();});});
}
setInterval(function(){kdsOrders.forEach(function(k){if(k.status==='done')return;var el=document.getElementById('kds-t-'+k.id);if(el)el.textContent=fmtTime(Math.floor((Date.now()-k.time.getTime())/1000));});},1000);

// ═══ MEMBERS ═══
var TIER_CLS={Platinum:'t-plat',Gold:'t-gold',Silver:'t-silv','Walk-in':'t-walk'};
function buildMembers(){
if(!members.length){document.getElementById('memGrid').innerHTML='<div class="empty"><span>👥</span><p>No members</p></div>';return;}
document.getElementById('memGrid').innerHTML=members.map(function(m){
var initials=m.name.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase();
return '<div class="mem">'+
'<div class="mem-top"><div class="mem-av">'+initials+'</div>'+
'<div><div class="mem-name">'+m.name+'</div><div class="mem-id">'+m.id+' · '+m.phone+'</div>'+
'<span class="tier-badge '+(TIER_CLS[m.tier]||'t-walk')+'">'+m.tier+'</span></div></div>'+
'<div class="mem-stats">'+
'<div class="ms"><div class="ms-val">'+m.pts.toLocaleString()+'</div><div class="ms-lbl">Points</div></div>'+
'<div class="ms"><div class="ms-val">'+m.visits+'</div><div class="ms-lbl">Visits</div></div>'+
'<div class="ms"><div class="ms-val">'+fmt(m.spent).split('.')[0]+'</div><div class="ms-lbl">Spent</div></div>'+
'</div>'+
'<div class="mem-pts">'+
'<span>'+m.pts.toLocaleString()+' pts = '+fmt(m.pts/cfg.loyaltyRedeemRate)+'</span>'+
'<button class="redeem-btn" data-mid="'+m.id+'">History</button>'+
'</div>'+
'</div>';
}).join('');
document.querySelectorAll('[data-mid]').forEach(function(b){b.addEventListener('click',function(){showMemHistory(b.getAttribute('data-mid'));});});
refreshMemDl();
}

function showMemHistory(mid){
var m=members.find(function(x){return x.id===mid;});if(!m)return;
var memSales=sales.filter(function(s){return s.customer.toLowerCase().includes(m.name.toLowerCase());});
document.getElementById('memHistTitle').innerHTML='📋 '+m.name+' <button class="modal-close" data-close="mMemberHistory">✕</button>';
document.querySelector('#memHistTitle .modal-close').addEventListener('click',function(){closeM('mMemberHistory');});
var html='<div style="background:var(--bg3);border-radius:9px;padding:12px;margin-bottom:12px;">'+
'<div style="font-size:12px;font-weight:700;margin-bottom:4px">'+m.tier+' Member</div>'+
'<div style="font-size:12px;color:var(--text2)">'+m.pts.toLocaleString()+' pts · '+m.visits+' visits · Total spent: '+fmt(m.spent)+'</div>'+
'</div>'+
'<div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px">PURCHASE HISTORY</div>'+
(memSales.length?memSales.map(function(s){
return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;">'+
'<span>#'+s.id+' · '+fmtDate(s.date)+'</span><span class="mono" style="color:var(--accent)">'+fmt(s.total)+'</span></div>';
}).join(''):'<div style="color:var(--text3);font-size:11px">No purchases recorded yet.</div>')+
(m.redeemHistory.length?'<div style="font-size:11px;font-weight:700;color:var(--text2);margin-top:10px;margin-bottom:6px">POINTS REDEMPTIONS</div>'+
m.redeemHistory.map(function(r){return '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;"><span>'+fmtDate(r.date)+' · -'+r.pts+' pts</span><span style="color:var(--purple)">-'+fmt(r.disc)+'</span></div>';}).join(''):'');
document.getElementById('memHistBody').innerHTML=html;
openM('mMemberHistory');
}

function refreshMemDl(){
var dl=members.map(function(m){return '<option value="'+m.name+'">';}).join('');
var d=document.getElementById('memDl');if(d)d.innerHTML=dl;
var d2=document.getElementById('memDl2');if(d2)d2.innerHTML=dl;
}
document.getElementById('addMemberBtn').addEventListener('click',function(){openM('mAddMember');});
document.getElementById('saveMemberBtn').addEventListener('click',function(){
var name=document.getElementById('mName').value.trim();if(!name){toast('Name required','err');return;}
var id='M'+String(members.length+100).padStart(3,'0');
members.push({id:id,name:name,phone:document.getElementById('mPhone').value,email:document.getElementById('mEmail').value,tier:document.getElementById('mTier').value,pts:0,visits:0,spent:0,redeemHistory:[]});
closeM('mAddMember');buildMembers();toast('✅ Member added','ok');
['mName','mPhone','mEmail'].forEach(function(id){document.getElementById(id).value='';});
});

// ═══ GIFT CARDS ═══
function buildGiftCards(){
if(!giftCards.length){document.getElementById('gcGrid').innerHTML='<div class="empty"><span>🎟</span><p>No gift cards issued</p></div>';return;}
document.getElementById('gcGrid').innerHTML=giftCards.map(function(gc){
return '<div class="gc-card">'+
'<div class="gc-code">'+gc.code+'</div>'+
'<div class="gc-bal">'+fmt(gc.balance)+'</div>'+
'<div class="gc-status">'+(gc.active?'✅ Active':'❌ Used/Expired')+(gc.customer?' · '+gc.customer:'')+'</div>'+
'<div style="font-size:10px;color:var(--text3);margin-top:4px">Issued: '+fmtDate(gc.issued)+'</div>'+
'</div>';
}).join('');
}
document.getElementById('issueGCBtn').addEventListener('click',function(){openM('mIssueGC');});
document.getElementById('saveGCBtn').addEventListener('click',function(){
var amount=parseFloat(document.getElementById('gcAmount').value)||0;
if(amount<=0){toast('Enter valid amount','err');return;}
giftCards.unshift({id:'GC'+Date.now(),code:gcCode(),balance:amount,issued:new Date(),customer:document.getElementById('gcCustomer').value||'',active:true});
closeM('mIssueGC');buildGiftCards();toast('🎟 Gift card issued: '+fmt(amount),'ok');
document.getElementById('gcAmount').value='';document.getElementById('gcCustomer').value='';
});

// ═══ PURCHASE ORDERS ═══
var poItems=[];
function buildPOs(){
if(!purchaseOrders.length){document.getElementById('poGrid').innerHTML='<div class="empty"><span>📋</span><p>No purchase orders</p></div>';return;}
document.getElementById('poGrid').innerHTML=purchaseOrders.map(function(po){
return '<div class="po-card">'+
'<div class="po-hdr"><div class="po-id">PO-'+po.id+'</div><span class="sb '+(po.status==='received'?'sb-ok':po.status==='pending'?'sb-low':'sb-blue')+'">'+po.status+'</span></div>'+
'<div class="po-supplier">📦 '+po.supplier+'</div>'+
'<div class="po-items-list">'+po.items.map(function(i){return '<div class="po-item"><span>'+i.name+' ×'+i.qty+'</span><span class="mono">'+fmt(i.cost*i.qty)+'</span></div>';}).join('')+'</div>'+
'<div class="po-total">'+fmt(po.total)+'</div>'+
(po.status!=='received'?'<div style="margin-top:8px;display:flex;gap:5px;"><button class="btn-green" data-receive="'+po.id+'">✓ Receive</button><button class="btn-danger" data-del-po="'+po.id+'">Cancel</button></div>':'')+
'</div>';
}).join('');
document.querySelectorAll('[data-receive]').forEach(function(b){b.addEventListener('click',function(){receivePO(parseInt(b.getAttribute('data-receive')));});});
document.querySelectorAll('[data-del-po]').forEach(function(b){b.addEventListener('click',function(){purchaseOrders=purchaseOrders.filter(function(p){return p.id!==parseInt(b.getAttribute('data-del-po'));});buildPOs();toast('PO cancelled');});});
}
document.getElementById('addPOBtn').addEventListener('click',function(){
poItems=[];renderPOItems();openM('mAddPO');
});
document.getElementById('addPOItemBtn').addEventListener('click',function(){
poItems.push({pid:'',name:'',qty:1,cost:0});renderPOItems();
});
function renderPOItems(){
document.getElementById('poItemsWrap').innerHTML=poItems.map(function(item,i){
return '<div style="display:flex;gap:5px;margin-bottom:5px;">'+
'<select class="fs" style="flex:2;" onchange="poItems['+i+'].pid=this.value;var p='+JSON.stringify(products.map(function(p){return{id:p.id,n:p.name,c:p.cost};})).replace(/"/g,"'")+'.find(x=>x.id==this.value);if(p){poItems['+i+'].name=p.n;poItems['+i+'].cost=p.c;}">'+
'<option value="">- Product -</option>'+products.map(function(p){return '<option value="'+p.id+'"'+(item.pid==p.id?' selected':'')+'>'+p.name+'</option>';}).join('')+
'</select>'+
'<input class="fi" type="number" placeholder="Qty" value="'+item.qty+'" style="width:55px;" onchange="poItems['+i+'].qty=parseInt(this.value)||1;">'+
'<input class="fi" type="number" placeholder="Cost" value="'+item.cost+'" style="width:75px;" onchange="poItems['+i+'].cost=parseFloat(this.value)||0;">'+
'<button class="btn-danger" onclick="poItems.splice('+i+',1);renderPOItems();">✕</button>'+
'</div>';
}).join('');
}
document.getElementById('savePOBtn').addEventListener('click',function(){
var supplier=document.getElementById('poSupplier').value.trim();if(!supplier){toast('Supplier required','err');return;}
if(!poItems.length){toast('Add at least one item','err');return;}
var namedItems=poItems.filter(function(i){return i.name;});
if(!namedItems.length){toast('Select products','err');return;}
var total=namedItems.reduce(function(a,i){return a+i.cost*i.qty;},0);
purchaseOrders.unshift({id:poId++,supplier:supplier,items:namedItems,total:total,status:'pending',date:new Date()});
closeM('mAddPO');buildPOs();toast('📋 Purchase order created','ok');
document.getElementById('poSupplier').value='';
});
function receivePO(id){
var po=purchaseOrders.find(function(x){return x.id===id;});if(!po)return;
po.items.forEach(function(item){
var p=products.find(function(x){return x.id==item.pid;});
if(p){var before=p.stock;p.stock+=item.qty;stockHistory.unshift({time:new Date(),product:p.name,before:before,after:p.stock,change:item.qty,reason:'PO-'+id+' received',by:currentUser.name});}
});
po.status='received';po.receivedDate=new Date();buildPOs();buildInv();toast('✅ PO received & stock updated','ok');checkLowStock();
}

// ═══ USERS ═══
var ROLE_CLS={admin:'r-admin',manager:'r-manager',cashier:'r-cashier',viewer:'r-viewer'};
function buildUsers(){
document.getElementById('usersGrid').innerHTML=users.map(function(u){
var isAdmin=u.role==='admin';
var hrs=u.totalHours.toFixed(1);
return '<div class="ucard">'+
'<div class="ucard-top">'+
'<div class="ucard-av">'+u.av+'</div>'+
'<div style="flex:1;min-width:0;">'+
'<div class="ucard-name">'+u.name+'</div>'+
'<span class="role-badge '+(ROLE_CLS[u.role]||'r-cashier')+'">'+u.role+'</span>'+
'<div class="ucard-meta">'+hrs+'h worked</div>'+
'</div>'+
'<span class="clock-status '+(u.clockedIn?'clocked-in':'clocked-out')+'">'+(u.clockedIn?'● In':'○ Out')+'</span>'+
'</div>'+
'<div class="perm-grid" style="margin-bottom:9px;">'+
PERMS_LIST.map(function(perm){
var isOn=u.perms[perm.k];
return '<div class="perm-item">'+
'<button class="tog '+(isOn?'on':'off')+'" data-uid="'+u.id+'" data-perm="'+perm.k+'" '+(isAdmin?'disabled style="opacity:.4;cursor:default"':'')+'>'+
'</button><span style="font-size:9px;">'+perm.l+'</span></div>';
}).join('')+'</div>'+
'<div class="ucard-actions">'+
(!isAdmin?'<button class="btn-ghost btn-sm" data-edit-user="'+u.id+'">✏ Edit</button>':'')+
(!isAdmin?'<button class="btn-danger" data-del-user="'+u.id+'">🗑 Delete</button>':'')+
(isAdmin?'<span style="font-size:10px;color:var(--text3)">Full Admin Access</span>':'')+
'</div></div>';
}).join('');

document.querySelectorAll('.tog[data-perm]').forEach(function(btn){
if(btn.disabled)return;
btn.addEventListener('click',function(){
var u=users.find(function(x){return x.id===btn.getAttribute('data-uid');});if(!u||u.role==='admin')return;
var perm=btn.getAttribute('data-perm');u.perms[perm]=!u.perms[perm];
btn.classList.toggle('on');btn.classList.toggle('off');
toast(u.name+': '+perm+' '+(u.perms[perm]?'✅':'❌'));
});
});
document.querySelectorAll('[data-edit-user]').forEach(function(btn){
btn.addEventListener('click',function(){
var uid=btn.getAttribute('data-edit-user');var u=users.find(function(x){return x.id===uid;});if(!u)return;
document.getElementById('euId').value=u.id;document.getElementById('euName').value=u.name;
document.getElementById('euAv').value=u.av;document.getElementById('euPin').value='';document.getElementById('euRole').value=u.role;
document.getElementById('editUserPerms').innerHTML=PERMS_LIST.map(function(perm){
return '<div class="perm-item"><button class="tog '+(u.perms[perm.k]?'on':'off')+'" id="eu-'+perm.k+'"></button><span style="font-size:9px;">'+perm.l+'</span></div>';
}).join('');
openM('mEditUser');
});
});
document.querySelectorAll('[data-del-user]').forEach(function(btn){
btn.addEventListener('click',function(){
var uid=btn.getAttribute('data-del-user');var u=users.find(function(x){return x.id===uid;});
if(!confirm('Delete "'+u.name+'"?'))return;
users=users.filter(function(x){return x.id!==uid;});buildUsers();buildLoginUI();toast('User deleted');
});
});
}

document.getElementById('addUserBtn').addEventListener('click',function(){
if(!currentUser.perms.users){toast('No permission','err');return;}
var def=DEFAULT_PERMS[document.getElementById('uRole').value]||DEFAULT_PERMS.cashier;
document.getElementById('newUserPerms').innerHTML=PERMS_LIST.map(function(perm){
return '<div class="perm-item"><button class="tog '+(def[perm.k]?'on':'off')+'" id="np-'+perm.k+'"></button><span style="font-size:9px;">'+perm.l+'</span></div>';
}).join('');
openM('mAddUser');
});
document.getElementById('uRole').addEventListener('change',function(){
var def=DEFAULT_PERMS[this.value]||DEFAULT_PERMS.cashier;
PERMS_LIST.forEach(function(perm){var b=document.getElementById('np-'+perm.k);if(b)b.className='tog '+(def[perm.k]?'on':'off');});
});
document.getElementById('saveUserBtn').addEventListener('click',function(){
var name=document.getElementById('uName').value.trim();var pin=document.getElementById('uPin').value;
if(!name||!pin){toast('Name and PIN required','err');return;}
if(pin.length<4){toast('PIN must be 4-6 digits','err');return;}
var perms={};PERMS_LIST.forEach(function(perm){var b=document.getElementById('np-'+perm.k);perms[perm.k]=b?b.classList.contains('on'):false;});
users.push({id:'U'+Date.now(),name:name,av:document.getElementById('uAv').value||'👤',role:document.getElementById('uRole').value,pin:pin,perms:perms,clockedIn:false,clockInTime:null,totalHours:0});
closeM('mAddUser');buildUsers();buildLoginUI();toast('✅ '+name+' added','ok');
['uName','uAv','uPin'].forEach(function(id){document.getElementById(id).value='';});
});
document.getElementById('saveEditUserBtn').addEventListener('click',function(){
var uid=document.getElementById('euId').value;var u=users.find(function(x){return x.id===uid;});if(!u)return;
var name=document.getElementById('euName').value.trim();if(!name){toast('Name required','err');return;}
u.name=name;u.av=document.getElementById('euAv').value||u.av;u.role=document.getElementById('euRole').value;
var newPin=document.getElementById('euPin').value;if(newPin){if(newPin.length<4){toast('PIN min 4 digits','err');return;}u.pin=newPin;}
PERMS_LIST.forEach(function(perm){var b=document.getElementById('eu-'+perm.k);if(b)u.perms[perm.k]=b.classList.contains('on');});
closeM('mEditUser');buildUsers();buildLoginUI();toast('✅ '+name+' updated','ok');
});

function buildClockLog(){
var body=document.getElementById('clockBody');if(!body)return;
var log=[];
var ins=clockEvents.filter(function(e){return e.type==='in';});
ins.forEach(function(inEv){
var outEv=clockEvents.find(function(e){return e.type==='out'&&e.userId===inEv.userId&&e.time>inEv.time;});
var hrs=outEv?((outEv.time-inEv.time)/3600000).toFixed(2):'Active';
log.push({name:inEv.name,inTime:inEv.time,outTime:outEv?outEv.time:null,hrs:hrs});
});
body.innerHTML=log.slice(0,30).map(function(l){
return '<tr><td>'+l.name+'</td><td style="font-size:10px">'+fmtDate(l.inTime)+'</td>'+
'<td style="font-size:10px">'+(l.outTime?fmtDate(l.outTime):'<span style="color:var(--green)">Still In</span>')+'</td>'+
'<td class="mono">'+(l.hrs==='Active'?'<span style="color:var(--green)">Active</span>':l.hrs+'h')+'</td></tr>';
}).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:12px">No clock events yet</td></tr>';
}

// ═══ SHIFT (C4-A) ═══
function buildShiftReport(){
var body=document.getElementById('shiftReportBody');if(!body)return;
if(!currentShift){body.innerHTML='<div class="empty"><span>⏱</span><p>No active shift</p></div>';return;}
var shiftSales=sales.filter(function(s){return currentShift.sales.includes(s.id);});
var shiftRev=shiftSales.reduce(function(a,s){return a+s.total;},0);
var byMethod={};shiftSales.forEach(function(s){if(!byMethod[s.method])byMethod[s.method]=0;byMethod[s.method]+=s.total;});
var elapsed=Math.floor((Date.now()-currentShift.openTime.getTime())/1000);
body.innerHTML='<div class="sec-hdr"><div class="sec-title">⏱ Current Shift Report</div>'+
'<div class="flex-gap"><button class="btn-ghost" id="printShiftBtn">🖨 Print</button><button class="btn-danger" id="closeShiftBtn">Close Shift</button></div></div>'+
'<div class="z-report">'+
'<div class="z-hdr"><div class="z-logo">Arena<span>Pro</span></div><div style="font-size:11px;color:var(--text2)">Shift Report</div></div>'+
'<div class="z-section">SHIFT INFO</div>'+
'<div class="z-row"><span>Opened by</span><span>'+currentShift.openedBy+'</span></div>'+
'<div class="z-row"><span>Open Time</span><span>'+fmtDate(currentShift.openTime)+'</span></div>'+
'<div class="z-row"><span>Duration</span><span>'+fmtTime(elapsed)+'</span></div>'+
'<div class="z-row"><span>Opening Float</span><span>'+fmt(currentShift.openingFloat)+'</span></div>'+
'<div class="z-section">SALES SUMMARY</div>'+
'<div class="z-row"><span>Total Transactions</span><span>'+shiftSales.length+'</span></div>'+
'<div class="z-row"><span>Total Revenue</span><span>'+fmt(shiftRev)+'</span></div>'+
'<div class="z-section">BY PAYMENT METHOD</div>'+
Object.entries(byMethod).map(function(e){return '<div class="z-row"><span>'+e[0].toUpperCase()+'</span><span>'+fmt(e[1])+'</span></div>';}).join('')+
'<div class="z-section">CASH POSITION</div>'+
'<div class="z-row"><span>Opening Float</span><span>'+fmt(currentShift.openingFloat)+'</span></div>'+
'<div class="z-row"><span>Cash Sales</span><span>'+fmt(byMethod.cash||0)+'</span></div>'+
'<div class="z-row z-total"><span>Expected Cash</span><span>'+fmt(currentShift.openingFloat+(byMethod.cash||0))+'</span></div>'+
'</div>';
document.getElementById('printShiftBtn').addEventListener('click',function(){window.print();});
document.getElementById('closeShiftBtn').addEventListener('click',function(){openCloseShift();});
}

function openCloseShift(){
var shiftSales=currentShift?sales.filter(function(s){return currentShift.sales.includes(s.id);}):[];
var shiftRev=shiftSales.reduce(function(a,s){return a+s.total;},0);
var cashSales=shiftSales.reduce(function(a,s){return a+(s.method==='cash'?s.total:0);},0);
var expectedCash=(currentShift?currentShift.openingFloat:0)+cashSales;
document.getElementById('closeShiftBody').innerHTML=
'<div style="background:var(--bg3);border-radius:9px;padding:12px;margin-bottom:12px;">'+
'<div style="font-size:12px;font-weight:700;margin-bottom:4px">Shift Summary</div>'+
'<div style="font-size:11px;color:var(--text2)">'+shiftSales.length+' transactions · '+fmt(shiftRev)+' total revenue</div>'+
'<div style="font-size:11px;color:var(--text2)">Expected cash in drawer: '+fmt(expectedCash)+'</div></div>'+
'<div class="fg"><label class="fl">Actual Cash in Drawer</label>'+
'<input class="fi" type="number" id="closingCash" placeholder="Count your cash..." inputmode="decimal"></div>'+
'<div id="cashVariance" style="font-size:12px;margin-bottom:10px;"></div>'+
'<div class="fg"><label class="fl">Closing Notes</label><input class="fi" id="closingNotes" placeholder="Optional notes..."></div>'+
'<button class="btn-main" id="confirmCloseShiftBtn">Close Shift & Logout</button>';
document.getElementById('closingCash').addEventListener('input',function(){
var actual=parseFloat(this.value)||0;var variance=actual-expectedCash;
var el=document.getElementById('cashVariance');
if(Math.abs(variance)<0.01)el.innerHTML='<span style="color:var(--green)">✅ Cash balanced</span>';
else if(variance<0)el.innerHTML='<span style="color:var(--accent2)">⚠️ Short: '+fmt(Math.abs(variance))+'</span>';
else el.innerHTML='<span style="color:var(--accent)">⬆ Over: '+fmt(variance)+'</span>';
});
document.getElementById('confirmCloseShiftBtn').addEventListener('click',function(){
var closingCash=parseFloat(document.getElementById('closingCash').value)||0;
currentShift.closedTime=new Date();currentShift.closingCash=closingCash;currentShift.closingNotes=document.getElementById('closingNotes').value;
currentShift=null;
closeM('mCloseShift');doLogout();
});
openM('mCloseShift');
}

// ═══ DASHBOARD ═══
function buildDash(){
var now=new Date();
var todayRev=sales.filter(function(s){return s.date.toDateString()===now.toDateString();}).reduce(function(a,s){return a+s.total;},0);
var occCourts=courts.filter(function(c){return c.status==='occupied';});
var lowProds=products.filter(function(p){return p.stock>0&&p.stock<=p.low;});
var kdsOpen=kdsOrders.filter(function(k){return k.status!=='done';}).length;
document.getElementById('dashStats').innerHTML=
'<div class="stat"><div class="stat-lbl">Today Revenue</div><div class="stat-val">'+fmt(todayRev)+'</div></div>'+
'<div class="stat blue"><div class="stat-lbl">Total Sales</div><div class="stat-val">'+sales.length+'</div></div>'+
'<div class="stat green"><div class="stat-lbl">Active Courts</div><div class="stat-val">'+occCourts.length+'</div></div>'+
'<div class="stat purple"><div class="stat-lbl">Kitchen Orders</div><div class="stat-val">'+kdsOpen+'</div></div>';
document.getElementById('dashLive').innerHTML=
'<div class="live-card"><div class="live-title">🎯 Active Sessions ('+occCourts.length+')</div>'+
(occCourts.length?occCourts.map(function(c){return '<div class="live-row"><span>'+c.icon+' '+c.name+'</span><span id="ld-'+c.id+'" style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:var(--accent2)">'+fmtTime(Math.floor((Date.now()-c.start)/1000))+'</span></div>';}).join(''):'<div style="color:var(--text3);font-size:11px">None active</div>')+'</div>'+
'<div class="live-card"><div class="live-title">⚠️ Low Stock ('+lowProds.length+')</div>'+
(lowProds.length?lowProds.map(function(p){return '<div class="live-row"><span>'+p.icon+' '+p.name+'</span><span style="color:var(--accent);font-weight:700">'+p.stock+'</span></div>';}).join(''):'<div style="color:var(--green);font-size:11px">✅ All OK</div>')+
'</div>';
}
setInterval(function(){courts.forEach(function(c){if(c.status!=='occupied'||c.mode==='dining')return;var el=document.getElementById('ld-'+c.id);if(el)el.textContent=fmtTime(Math.floor((Date.now()-c.start)/1000));});},1000);

// ═══ LOW STOCK ═══
function checkLowStock(){
var low=products.filter(function(p){return p.stock>0&&p.stock<=p.low;});
document.getElementById('notifDot').style.display=low.length?'block':'none';
var bar=document.getElementById('alertBar');bar.style.display=low.length?'flex':'none';
if(low.length)document.getElementById('alertMsg').textContent='Low stock: '+low.map(function(p){return p.icon+p.name+' ('+p.stock+')';}).join(', ');
}
document.getElementById('notifBtn').addEventListener('click',function(){
var low=products.filter(function(p){return p.stock>0&&p.stock<=p.low;});
alert(low.length?'⚠️ Low Stock:\n'+low.map(function(p){return '• '+p.icon+' '+p.name+': '+p.stock;}).join('\n'):'✅ All stock OK');
});

// ═══ SETTINGS ═══
function buildSettingsPage(){
document.getElementById('sBizName').value=cfg.bizName;
document.getElementById('sBizAddr').value=cfg.bizAddr;
document.getElementById('sBizPhone').value=cfg.bizPhone;
document.getElementById('sTaxRate').value=cfg.taxRate;
document.getElementById('sDefCur').value=cfg.currency;
document.getElementById('sFooter').value=cfg.footer;
document.getElementById('sLowStock').value=cfg.lowStock;
document.getElementById('sLoyaltyEarn').value=cfg.loyaltyEarnRate;
document.getElementById('sLoyaltyRedeem').value=cfg.loyaltyRedeemRate;
buildCatManager();buildModGroupList();
}
function saveSettings(){
cfg.bizName=document.getElementById('sBizName').value;
cfg.bizAddr=document.getElementById('sBizAddr').value;
cfg.bizPhone=document.getElementById('sBizPhone').value;
cfg.taxRate=parseFloat(document.getElementById('sTaxRate').value)||10;
cfg.footer=document.getElementById('sFooter').value;
cfg.lowStock=parseInt(document.getElementById('sLowStock').value)||5;
cfg.currency=document.getElementById('sDefCur').value;
cfg.loyaltyEarnRate=parseFloat(document.getElementById('sLoyaltyEarn').value)||1;
cfg.loyaltyRedeemRate=parseFloat(document.getElementById('sLoyaltyRedeem').value)||100;
document.getElementById('curSel').value=cfg.currency;renderCartTotals();
toast('✅ Settings saved','ok');
}
document.getElementById('saveSettingsBtn').addEventListener('click',saveSettings);
document.getElementById('saveSettingsBtn2').addEventListener('click',saveSettings);

// Category manager (C8-C)
function buildCatManager(){
document.getElementById('catList').innerHTML=categories.map(function(c,i){
return '<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--border);">'+
'<span style="flex:1;font-size:12px;">'+(CAT_ICONS[c]||'📦')+' '+c+'</span>'+
'<button class="btn-danger" style="padding:2px 7px;font-size:10px;" onclick="deleteCategory(\''+c+'\')">Del</button>'+
'</div>';
}).join('');
}
function deleteCategory(name){
if(products.some(function(p){return p.cat===name;})){toast('Category has products - reassign first','err');return;}
if(!confirm('Delete category "'+name+'"?'))return;
categories=categories.filter(function(c){return c!==name;});buildCatManager();buildCats();toast('Category deleted');
}
document.getElementById('addCatBtn').addEventListener('click',function(){
var name=document.getElementById('newCatName').value.trim();if(!name){toast('Enter category name','err');return;}
if(categories.includes(name)){toast('Already exists','err');return;}
categories.push(name);document.getElementById('newCatName').value='';buildCatManager();buildCats();toast('Category added','ok');
});

// Modifier groups
function buildModGroupList(){
document.getElementById('modGroupList').innerHTML=modifierGroups.map(function(g){
return '<div style="background:var(--bg3);border-radius:8px;padding:8px 10px;margin-bottom:6px;">'+
'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'+
'<span style="font-size:12px;font-weight:700;">'+g.name+'</span>'+
'<button class="btn-danger" style="font-size:9px;padding:2px 6px;" onclick="deleteModGroup(\''+g.id+'\')">Del</button>'+
'</div>'+
'<div style="font-size:10px;color:var(--text2);">'+g.type+' · '+(g.required?'Required':'Optional')+'</div>'+
'<div style="font-size:10px;color:var(--text3);margin-top:2px;">'+g.options.map(function(o){return o.name+(o.price>0?' +'+fmt(o.price):'');}).join(', ')+'</div>'+
'</div>';
}).join('');
}
function deleteModGroup(id){
modifierGroups=modifierGroups.filter(function(g){return g.id!==id;});
products.forEach(function(p){if(p.modGroup===id)p.modGroup='';});
buildModGroupList();toast('Modifier group deleted');
}
document.getElementById('addModGroupBtn').addEventListener('click',function(){
document.getElementById('mgOptionsWrap').innerHTML='';openM('mAddModGroup');
});
document.getElementById('addMGOptionBtn').addEventListener('click',function(){
var wrap=document.getElementById('mgOptionsWrap');
var i=wrap.children.length;
var div=document.createElement('div');
div.style.cssText='display:flex;gap:5px;margin-bottom:5px;';
div.innerHTML='<input class="fi mg-opt-name" placeholder="Option name" style="flex:2;"><input class="fi mg-opt-price" placeholder="Price" type="number" style="width:80px;" inputmode="decimal"><button class="btn-danger" style="padding:0 8px;">✕</button>';
div.querySelector('.btn-danger').addEventListener('click',function(){div.remove();});
wrap.appendChild(div);
});
document.getElementById('saveMGBtn').addEventListener('click',function(){
var name=document.getElementById('mgName').value.trim();if(!name){toast('Name required','err');return;}
var opts=[];
document.querySelectorAll('#mgOptionsWrap > div').forEach(function(row){
var n=row.querySelector('.mg-opt-name').value.trim();var p=parseFloat(row.querySelector('.mg-opt-price').value)||0;
if(n)opts.push({id:'mo'+Date.now()+Math.random().toString(36).slice(2),name:n,price:p});
});
if(!opts.length){toast('Add at least one option','err');return;}
modifierGroups.push({id:'MG'+Date.now(),name:name,type:document.getElementById('mgType').value,required:document.getElementById('mgRequired').value==='1',options:opts});
closeM('mAddModGroup');buildModGroupList();toast('Modifier group added','ok');
document.getElementById('mgName').value='';document.getElementById('mgOptionsWrap').innerHTML='';
});

// ═══ UTILS ═══
function dlCSV(csv,fname){var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=fname;a.click();}

var liveCard=document.createElement('div');liveCard.className='live-card';

// ═══ BOOT ═══
buildLoginUI();

