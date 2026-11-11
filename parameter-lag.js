(function(root){
  'use strict';
  class ParameterLag {
    constructor(state,duration=.2){ this.state=state; this.target={...state}; this.duration=duration; }
    set(values){
      for(const [key,value] of Object.entries(values)){
        if(!Object.hasOwn(this.target,key)) continue;
        if(typeof this.target[key]==='boolean' && typeof value==='boolean') this.state[key]=this.target[key]=value;
        else if(typeof this.target[key]==='number' && typeof value==='number' && Number.isFinite(value)) this.target[key]=value;
      }
    }
    step(dt){
      // About 95% of a change in 0.2 s, independent of frame rate.
      const k=1-Math.exp(-Math.max(0,dt)*3/this.duration);
      for(const [key,value] of Object.entries(this.target)) if(typeof value==='number'){
        this.state[key]+=(value-this.state[key])*k;
        if(Math.abs(value-this.state[key])<1e-6) this.state[key]=value;
      }
    }
  }
  root.ParameterLag=ParameterLag;
  if(typeof module!=='undefined') module.exports=ParameterLag;
})(globalThis);
