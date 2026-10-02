import './style.css';
import {CH,SG,T,compile,decode,exec,extraTests,fmt,makeSearch,okv,pj,runAll,runv,show} from '../core/index.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
$('ch').innerHTML=CH.map((c,i)=>`<option value=${i}>${c.id}</option>`).join('');
function load(i){tab(0);$('ch').value=i;const c=CH[i];$('src').value=c.src;$('sig').textContent=`${c.I} → ${c.O}`;go()}
function go(){const c=CH[$('ch').value],r=compile($('src').value,c.I,c.O);
 if(r.err){$('out').innerHTML=`<span class=err>${esc(r.err)}</span>`;return}
 const d=decode(r.bytes,c.I,c.O);let pass=0,det=[];
 for(const[i,o]of c.t){let v;try{v=runv(d,c.I,i)}catch(e){v='error'}const ok=fmt(v)==fmt(o);pass+=ok;det.push(`${fmt(i)}→${fmt(v)}${ok?'':' (want '+fmt(o)+')'}`)}
 $('out').innerHTML=r.costs.map(x=>`<span class=tok>${esc(x[0])} <b>${x[1].toFixed(2)}b</b></span>`).join('')+
 `<p><b style="color:var(--fg)">${r.bytes.length} bytes</b> (${r.bits.toFixed(1)} bits): <code>${r.bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ')||'(empty)'}</code><br>Decoded back: <code>${esc((d||[]).map(show).join(' '))}</code><br>Tests ${pass}/${c.t.length}: <small>${esc(det.join('; '))}</small></p>`}
const tab=d=>{if(!d&&!suiteDone){$('tb').innerHTML='<tr><td>Running suite…</tr>';setTimeout(suite,30)}$('pdev').hidden=!d;$('pch').hidden=d;$('tdev').className=d?'on':'';$('tch').className=d?'':'on'};$('tdev').onclick=()=>tab(1);$('tch').onclick=()=>tab(0);
let SR=null;
$('gs').onclick=()=>{if(SR){SR.stop=1;return}
 const ci=$('ch').value,c=CH[ci],cur=compile(c.src,c.I,c.O),tests=[...c.t,...extraTests(c,c.src)],S=makeSearch(c.I,c.O,tests),t0=Date.now(),LIMIT=90000;SR=S;$('gs').textContent='Stop search';
 const fin=()=>{SR=null;$('gs').textContent='Search for a shorter program';const sec=((Date.now()-t0)/1000).toFixed(0);
  if(S.best&&S.best.bytes<cur.bytes.length){$('gss').innerHTML=`Found a shorter program: <code>${esc(S.best.src)}</code> — ${S.best.bytes} bytes vs ${cur.bytes.length} (${sec}s, ${S.pushed} programs). <button id="gsl">Use it</button>`;$('gsl').onclick=()=>{$('src').value=S.best.src;go()}}
  else $('gss').textContent=`No shorter program found in ${sec}s (${S.pushed} programs tried${S.best?'; best found '+S.best.bytes+' bytes: '+S.best.src:''}). The search covers short programs well; longer ones need a person.`};
 const step=()=>{if(S.stop||S.done||Date.now()-t0>LIMIT||$('ch').value!=ci)return fin();S.step(150);
  $('gss').textContent=`Searching… ${((Date.now()-t0)/1000).toFixed(0)}s · ${S.pushed} programs · best so far: ${S.best?S.best.bytes+' bytes ('+S.best.src+')':'none yet'} · current ${cur.bytes.length} bytes`;setTimeout(step,0)};step()};
$('go').onclick=go;$('ch').onchange=e=>load(e.target.value);
$('tb').onclick=e=>{const tr=e.target.closest('tr[data-i]');if(tr)load(+tr.dataset.i)};
$('ver').textContent='v'+__KRAFT_VERSION__;
let suiteDone=0;function suite(){if(suiteDone)return;suiteDone=1;const rows=runAll();
$('tb').innerHTML='<tr><th>Challenge<th>Kraft bytes<th>CGCC best<th>tests<th>round-trip<th>dead%<th>distinct</tr>'+rows.map((x,i)=>x.err?`<tr><td>${x.c.id}<td colspan=6 class=err>${esc(x.err)}`:
 `<tr class=r data-i=${i}><td>${x.c.id}<td>${x.r.bytes.length}<td>${x.c.best??''}<td>${x.pass}/${x.c.t.length}<td>${x.rt?'ok':'FAIL'}<td>${x.st.dead.toFixed(0)}<td>${x.st.distinct.toFixed(2)}`).join('');}
const hexOf=b=>b.map(x=>x.toString(16).padStart(2,'0')).join(' ');
const parseHex=h=>{h=h.replace(/0x/gi,'').replace(/[^0-9a-f]/gi,'');if(h.length%2)h='0'+h;return(h.match(/../g)||[]).map(x=>parseInt(x,16))};
function runLines(toks,I,lines){const want=I.length==1?(I=='I'?'an integer':'a list of integers'):`a JSON array with one value per argument (${[...I].join(', ')})`;
 return lines.map(l=>{let v;try{v=pj(l)}catch(e){return `${esc(l)} → <span class=err>not valid JSON</span>`}
 if(!okv(v,I))return `${esc(l)} → <span class=err>expected ${want}</span>`;
 try{const st=exec(toks,I,I.length==1?[v]:v);return `${esc(l)} → <b>${esc(st.length==1?fmt(st[0]):'stack '+fmt(st))}</b>`}catch(e){return `${esc(l)} → <span class=err>runtime error</span>`}}).join('<br>')}
function dev(fromHex){const I=$('dI').value.trim().toUpperCase(),O=$('dO').value.trim().toUpperCase();let toks,bytes,info;
 if(!/^[ILSMW]{1,4}$/.test(I)||!/^([ILSMW]{1,4}|\*)$/.test(O)){$('dout').innerHTML='<span class=err>Types must be 1-4 of I/L/S/M/W (output may also be *).</span>';return}
 if(fromHex){bytes=parseHex($('dhex').value);toks=decode(bytes,I,O);
  if(!toks){$('dout').innerHTML='<span class=err>These bytes never reach a valid end for these types (only possible when the tail cannot close within limits).</span>';return}
  $('dsrc').value=toks.map(show).join(' ');info=`Decoded ${bytes.length} bytes to source above.`}
 else{const r=compile($('dsrc').value,I,O);if(r.err){$('dout').innerHTML=`<span class=err>${esc(r.err)}</span>`;return}
  toks=r.toks;bytes=r.bytes;$('dhex').value=hexOf(bytes);info=`${bytes.length} bytes (${r.bits.toFixed(1)} bits).`}
 try{location.hash=`${I}/${O}/${bytes.map(x=>x.toString(16).padStart(2,'0')).join('')}`}catch(e){}
 const lines=$('din').value.split('\n').map(x=>x.trim()).filter(x=>x);
 $('dout').innerHTML=`<p style="margin:0 0 6px">${info} <small>Bytecode is stored in the URL fragment, so the link is shareable.</small></p>`+(lines.length?runLines(toks,I,lines):'<small>Add inputs above to run the program.</small>')}
$('dgo').onclick=()=>dev(false);
document.addEventListener('keydown',e=>{if(e.key!='Enter'||!(e.ctrlKey||e.metaKey))return;const id=e.target.id;let f=null;
 if(id=='dhex')f=()=>dev(true);else if(['dsrc','din','dI','dO'].includes(id))f=()=>dev(false);else if(id=='src')f=go;
 if(f){e.preventDefault();f()}});$('dhx').onclick=()=>dev(true);
$('dI').onchange=$('dO').onchange=()=>{$('dout').textContent=''};
$('dsrc').value='range { dup * } map sum';$('din').value='3\n10';
const DOC={'n':'push the last argument (works inside blocks)','m':'push the second-to-last argument','k':'push the third-to-last argument',
'dup':'copy top','swap':'swap top two','drop':'discard top','over':'copy second item to top (a b → a b a)','rot':'rotate three (a b c → b c a)','if':'c a b → a if c is truthy, else b',
'0':'push 0','1':'push 1','2':'push 2','10':'push 10',
'+':'add (vectorises over lists)','-':'subtract, second minus top (vectorises)','*':'multiply (vectorises)','/':'floor division, x/0 = 0 (vectorises)','div':'true division, x/0 = 0 (vectorises)','%':'non-negative modulo (vectorises)',
'dvd':'1 if second is divisible by top (vectorises)','=':'elementwise equality (use eql for whole lists)','<':'1 if second < top (vectorises)','>':'1 if second > top (vectorises)',
'min2':'smaller of two (vectorises)','max2':'larger of two (vectorises: two digit lists give lunar addition)','gcd':'greatest common divisor (vectorises)','pow':'second to the power top (vectorises)',
'ncr':'binomial coefficient n choose k (vectorises)','npr':'permutations P(n,k) (vectorises)',
'inc':'add 1','dec':'subtract 1','even':'1 if even','neg':'negate','abs':'absolute value','sq':'square','not':'1 if falsy','sign':'-1, 0 or 1','isqrt':'integer square root','sqrt':'square root','floor':'round down','ceil':'round up','round':'round to nearest',
'prime':'1 if prime','fact':'factorial','fib':'nth Fibonacci number (fib 0 = 0)','nthp':'nth prime (nthp 1 = 2)',
'range':'1..n (on a list: a range per element)','iota0':'0..n-1','rng':'inclusive a..b, counting down if b < a','primes':'primes up to n','divs':'divisors of n','pfac':'prime factors with multiplicity',
'digits':'decimal digits (vectorises)','undig':'digits back to a number','base':'digits of a in base b','ubase':'list of digits in base b back to a number',
'sum':'sum (of a list; row sums of a list of lists)','prod':'product (row-wise on lists of lists)','max':'largest element (row-wise on lists of lists)','min':'smallest element (row-wise on lists of lists)','all':'1 if every element is truthy (row-wise)','any':'1 if some element is truthy (row-wise)',
'cumsum':'running totals','deltas':'differences of neighbours','where':'1-based indices of truthy elements','grade':'1-based indices that would sort the list',
'len':'length of any list or string','rev':'reverse','sort':'sort (numbers, strings, lists lexicographically)','uniq':'remove duplicates, keep first','head':'first element (empty → 0, "" or [])','last':'last element','tail':'all but the first','init':'all but the last',
'cat':'concatenate two of the same kind','take':'first n','skip':'all but the first n','rotate':'rotate left by n','rep':'repeat n times','idx':'1-based element; with a list of indices, those elements',
'has':'contains element (strings: substring)','idxof':'1-based position, 0 if absent','count':'occurrences of element (strings: substring)','eql':'1 if equal as a whole','wrap':'[x]','pair':'[a, b]',
'lens':'length of each item','flat':'join a list of lists / list of strings into one','zip':'transpose rows and columns',
'sublists':'all contiguous slices','perms':'all permutations (up to 9 items)','powerset':'all subsequences (up to 20 items)','combs':'all k-combinations','windows':'overlapping slices of length k','chunks':'consecutive slices of length k',
'halves':'split into two halves','alt':'[even-position items, odd-position items]','group':'runs of equal neighbours','bins':'group equal values together, sorted by value','cart':'cartesian product (pairs; strings give 2-char strings)',
'ord':'code points','chr':'code points to a string','str':'number to decimal string (vectorises)','num':'parse a number (vectorises)','up':'upper-case','low':'lower-case',
'split':'split a string on a separator','join':'join strings with a separator','words':'split on whitespace','chars':'list of characters','alpha':'push "a..z"','ALPHA':'push "A..Z"','digs':'push "0..9"',
'5':'integer literal of any size (small numbers are cheapest); -5 means 5 neg','"txt"':'string literal: characters and 4,096 common English words are entropy-coded (Hello, World! is 8 bytes)','[1,2,3]':'integer list of any length, stored as count + base + fixed-width digits, so lookup tables are cheap','[[1],[2,3]]':'list-of-lists literal','["a","bc"]':'list-of-strings literal',
'{':'element block: list or string on top; inside, the stack is [element]','{2':'pair block: list on top; inside, the stack is [accumulator, element]','{x':'value block on any value; inside, the stack is [value]',
'} map':'element block → list of results (strings mapped to strings stay strings)','} filter':'keep elements whose result is truthy','} sortby':'stable sort by the integer result','} find':'first element with a truthy result','} count':'how many elements give a truthy result',
'} reduce':'fold the list with a pair block','} scan':'running fold','} first':'value block on an integer: smallest x ≥ it with a truthy result','} fix':'repeat the value block until the value stops changing',
'} trace':'repeat until a value repeats, collecting every value','} times':'with a count under the value: apply the value block that many times'};
const sg=(i,o)=>`${[...i].join(' ')||'∅'} → ${[...o].join(' ')||'∅'}`;
const RF=[['n','∅ → argument'],['m','∅ → argument'],['k','∅ → argument'],...Object.keys(T).map(k=>[k,SG(k).map(([i,o])=>sg(i,o)).join(' · ')]),['5','∅ → I'],['"txt"','∅ → S'],['[1,2,3]','∅ → L'],['[[1],[2,3]]','∅ → M'],['["a","bc"]','∅ → W'],
 ['{','L/M/S/W → opens [element]'],['{2','L/M/S/W → opens [element element]'],['{x','any → opens [value]'],['} map','[I/L/S] → list of results'],['} filter','[I] → same kind'],['} sortby','[I] → same kind'],['} find','[I] → element'],['} count','[I] → I'],
 ['} reduce','[element] → element'],['} scan','[element] → same kind'],['} first','I, [I] → I'],['} fix','x, [x] → x'],['} trace','x, [x] → list of x'],['} times','I x, [x] → x']];
$('ref').innerHTML='<tr><th>Token<th>Types (I number · S string · L list · M list of lists · W list of strings)<th>What it does</tr>'+RF.map(([k,e])=>`<tr><td><a href="#" data-t="${esc(k)}" style="color:var(--ac)">${esc(k)}</a><td style="white-space:normal;font-size:12px">${esc(e)}<td style="white-space:normal">${esc(DOC[k]||'')}`).join('');
$('ref').onclick=e=>{const t=e.target.dataset?.t;if(!t)return;e.preventDefault();const a=$('dsrc');a.value=(a.value.trim()+' '+t).trim();a.focus()};
$('ch').value=6;$('src').value=CH[6].src;$('sig').textContent='I → I';go();tab(1);
const m=/^#([ILSMW]{1,4})\/([ILSMW]{1,4}|\*)\/([0-9a-f]*)$/.exec(location.hash)||/^#([IL])([IL*])\.([0-9a-f]*)$/.exec(location.hash);if(m){$('dI').value=m[1];$('dO').value=m[2];$('dhex').value=m[3];dev(true)}
