const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function setup(width=390){
  class Element {
    constructor(){this.listeners={};this.attrs={};this.style={};this.dataset={};this.hidden=false;}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
    fire(type,event={}){for(const fn of this.listeners[type]||[])fn({target:this,...event});}
    setAttribute(key,value){this.attrs[key]=value;}
    removeAttribute(key){delete this.attrs[key];}
    contains(target){return target===this;}
    getBoundingClientRect(){return {left:20,right:250,top:100,bottom:140,width:230,height:40};}
    closest(){return null;}
    querySelector(){return null;}
  }
  const entry=new Element();entry.dataset.eventCitation='《诡秘之主》一卷9–12、210章';
  const document=new Element(),window=new Element();let tip;
  document.querySelector=()=>null;
  document.querySelectorAll=()=>[entry];
  document.createRange=()=>({selectNodeContents(){},getClientRects(){return [{left:20,right:250,top:100,bottom:140,width:230,height:40}];}});
  document.createElement=()=>new Element();document.body={append:el=>tip=el};
  let now=0,id=0;const timers=new Map();
  vm.runInNewContext(fs.readFileSync('source/js/timeline.js','utf8'),{document,window,innerWidth:width,innerHeight:844,
    setTimeout:(fn,delay)=>{timers.set(++id,{fn,time:now+delay});return id;},clearTimeout:id=>timers.delete(id)});
  function tick(ms){now+=ms;for(const [id,t]of [...timers])if(t.time<=now){timers.delete(id);t.fn();}}
  return {entry,document,window,tip,tick};
}
test('source is hidden until 600ms hover; short visits never show it',()=>{
  const {entry,tip,tick}=setup();assert.ok(tip.hidden);
  entry.fire('pointerenter',{pointerType:'mouse'});tick(599);assert.ok(tip.hidden);
  entry.fire('pointerleave');tick(1000);assert.ok(tip.hidden);
  entry.fire('pointerenter',{pointerType:'mouse'});tick(600);assert.equal(tip.hidden,false);
  assert.equal(tip.textContent,entry.dataset.eventCitation);
});
test('pointer can enter tooltip; Escape cancels and closes',()=>{
  const {entry,tip,tick,document}=setup();entry.fire('pointerenter',{pointerType:'mouse'});tick(600);
  entry.fire('pointerleave');tip.fire('pointerenter');tick(200);assert.equal(tip.hidden,false);
  document.fire('keydown',{key:'Escape'});assert.ok(tip.hidden);assert.equal(entry.attrs['aria-describedby'],undefined);
  entry.fire('focusin');document.fire('keydown',{key:'Escape'});tick(600);assert.ok(tip.hidden);
});
test('keyboard focus and touch work without intercepting navigation links',()=>{
  const {entry,tip,tick,document}=setup();entry.fire('focusin');tick(600);assert.equal(entry.attrs['aria-describedby'],tip.id);
  document.fire('keydown',{key:'Escape'});
  entry.fire('pointerup',{pointerType:'touch',target:{closest:()=>({})}});assert.ok(tip.hidden);
  entry.fire('pointerup',{pointerType:'touch'});assert.equal(tip.hidden,false);
  document.fire('pointerdown',{target:{}});assert.ok(tip.hidden);
});

test('narrow viewport places tooltip below paragraph, clear of the date heading',()=>{
  const {entry,tip,tick}=setup();
  entry.fire('pointerenter',{pointerType:'mouse'});tick(600);
  assert.equal(tip.style.left,'20px');
  assert.equal(tip.style.top,'146px');
});

test('wide viewport places tooltip outside the text on its right, without covering either',()=>{
  const {entry,tip,tick}=setup(1200);
  entry.fire('pointerenter',{pointerType:'mouse'});tick(600);
  assert.equal(tip.style.left,'262px');
  assert.equal(tip.style.top,'100px');
  assert.ok(parseFloat(tip.style.left)>entry.getBoundingClientRect().right);
});
