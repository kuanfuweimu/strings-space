const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../materials');
const {FocusRig,GPUTracker}=require('../growth-tracker');
const ParameterLag=require('../parameter-lag');

test('material presets are bounded, independent, and recognize the original comparison',()=>{
  for(const [id,p] of Object.entries(M.presets)){
    assert.deepEqual(M.sanitize(p.values),p.values);
    assert.equal(M.identify(p.values),id);
  }
  assert.equal(M.presets.original.values.materialLegacy,1);
  assert.equal(M.defaults.materialLegacy,0);
  assert.ok(M.defaults.emission<M.presets.original.values.emission);
  assert.ok(M.defaults.bloom<M.presets.original.values.bloom);
  assert.deepEqual(M.sanitize({roughness:-1,env:99,metal:NaN,dim:0}),{roughness:.08,env:3});
});

test('0.2 second lag reaches 95%, does not overshoot, and is frame-rate independent',()=>{
  const results=[];
  for(const fps of [30,60,120]){
    const state={value:0,dim:1,follow:false}; const lag=new ParameterLag(state);
    lag.set({value:1,dim:0,follow:true,unknown:5});
    assert.equal(state.value,0);assert.equal(state.follow,true);
    for(let i=0;i<fps*.2;i++) lag.step(1/fps);
    assert.ok(state.value>.95&&state.value<.951);assert.ok(state.dim>.049&&state.dim<.05);
    assert.equal(lag.target.unknown,undefined);results.push(state.value);
  }
  assert.ok(Math.max(...results)-Math.min(...results)<1e-12);
});

test('fast successive blackout toggles use desired state and camera/material changes share lag',()=>{
  const state={dim:1,roughness:.2,camD:1,auto:true};const lag=new ParameterLag(state);
  lag.set({dim:lag.target.dim<.01?1:0});lag.step(.01);
  lag.set({dim:lag.target.dim<.01?1:0});
  assert.equal(lag.target.dim,1);
  lag.set({roughness:.8,camD:2});lag.step(.05);
  assert.ok(state.roughness>.2&&state.roughness<.8);assert.ok(state.camD>1&&state.camD<2);
  lag.set({camD:Infinity,auto:0});assert.equal(lag.target.camD,2);assert.equal(lag.target.auto,true);
});

test('camera follows actual samples smoothly and returns to manual position when disabled',()=>{
  const rig=new FocusRig();const base=[0,0,0];
  rig.receive([2,1,-1,12]);const first=rig.step(1/60,true,.8,1.8,base).slice();
  assert.ok(first[0]>0&&first[0]<.01);
  for(let i=0;i<240;i++){if(i%6===0)rig.receive([2,1,-1,12]);rig.step(1/60,true,.8,1.8,base);}
  assert.ok(rig.offset[0]>1.3&&rig.offset[0]<1.6);
  const before=rig.offset[0];
  for(let i=0;i<12;i++)rig.step(1/60,false,.8,1.8,base);
  assert.ok(rig.offset[0]<before*.051);
});

test('empty, stale and invalid samples cannot pull the camera away; outliers are bounded',()=>{
  const rig=new FocusRig();rig.receive([NaN,0,0,12]);rig.receive([1,2,3,0]);
  assert.equal(rig.valid,false);
  rig.receive([100,100,-100,1]);assert.deepEqual(rig.target,[4,4,-4]);
  for(let i=0;i<300;i++)rig.step(1/60,true,1,.2,[0,0,0]);
  assert.ok(Math.hypot(...rig.offset)<.00001);
  rig.invalidate();assert.equal(rig.valid,false);
});

test('live GPU sampling uses a 16-byte async buffer and never waits for a busy fence',()=>{
  let calls=[],signaled=false;
  const gl=new Proxy({RGBA32F:1,RGBA:2,FLOAT:3,NEAREST:4,PIXEL_PACK_BUFFER:5,STREAM_READ:6,TIMEOUT_EXPIRED:7,ALREADY_SIGNALED:8,CONDITION_SATISFIED:9,WAIT_FAILED:10,
    isContextLost:()=>false,createBuffer:()=>({}),fenceSync:()=>({}),clientWaitSync:(...a)=>{calls.push(['wait',...a]);return signaled?8:7;},
    getBufferSubData:(target,offset,data)=>{calls.push(['read']);data.set([1,2,3,4]);}},
    {get:(o,k)=>k in o?o[k]:(...args)=>{calls.push([k,...args]);}});
  const tracker=new GPUTracker(gl,()=>({f:{}}),()=>({p:{},u:{uS:0,uActive:1}}),'',10000,128);
  assert.ok(calls.some(c=>c[0]==='bufferData'&&c[2]===16));
  assert.equal(tracker.sample({},12000,.1,true),null);
  assert.equal(tracker.sample({},12000,.016,true),null);
  assert.ok(!calls.some(c=>c[0]==='read'));assert.ok(calls.find(c=>c[0]==='wait')[3]===0);
  signaled=true;assert.deepEqual(Array.from(tracker.sample({},12000,.016,true)),[1,2,3,4]);
  calls=[];tracker.sample({},12000,.1,false);assert.ok(!calls.some(c=>c[0]==='drawArrays'));
});

test('HTML scripts parse and paused motion still updates materials and control lag',()=>{
  for(const file of ['index.html','control.html']){
    const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1],{filename:file});
    for(const match of html.matchAll(/<script src="([^"]+)"/g))assert.ok(fs.existsSync(path.join(__dirname,'..',match[1])));
  }
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.ok(html.indexOf('controls.step(dt); updateParameters(dt);')<html.indexOf('if(G.speed>0) stepSim'));
  assert.match(html,/fps\+=\(1\/elapsed-fps\)/);
  assert.match(html,/draw\(1\/fpsOut,true\)/);
});
