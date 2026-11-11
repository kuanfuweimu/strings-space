(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Reduce a stratified sample of LIVE HEADS, not a predicted emitter trajectory.
  const shader=(rows,segments)=>`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uS; uniform int uActive;
out vec4 o;
void main(){
  vec3 sum=vec3(0.); float weight=0.;
  int count=min(uActive,192);
  for(int j=0;j<192;j++){
    if(j>=count) break;
    int id=int((float(j)+.5)*float(uActive)/float(count));
    vec4 h=texelFetch(uS,ivec2((id/${rows})*${segments},id%${rows}),0);
    if(h.w<.08 || any(isnan(h)) || any(isinf(h)) || length(h.xyz)>12.) continue;
    float w=smoothstep(.08,.7,h.w)*mix(.25,1.,smoothstep(.7,4.,h.w));
    sum+=h.xyz*w; weight+=w;
  }
  o=vec4(sum/max(weight,.00001),weight);
}`;
  class FocusRig {
    constructor(){ this.focus=[0,0,0]; this.target=[0,0,0]; this.offset=[0,0,0]; this.blend=0; this.age=99; this.valid=false; }
    receive(sample){
      if(sample && sample[3]>.01 && Array.from(sample).every(Number.isFinite)){
        this.target=[clamp(sample[0],-4,4),clamp(sample[1],-1.4,4),clamp(sample[2],-4,4)];
        this.age=0; this.valid=true;
      }
    }
    invalidate(){ this.age=99; this.valid=false; }
    step(dt,enabled,strength,smooth,base){
      dt=clamp(dt,0,.1); this.age+=dt;
      const available=enabled && this.valid && this.age<1.5;
      this.blend+=((available?1:0)-this.blend)*(1-Math.exp(-dt*3/.2));
      const k=1-Math.exp(-dt/Math.max(.1,smooth));
      if(available) for(let i=0;i<3;i++) this.focus[i]+=(this.target[i]-this.focus[i])*k;
      for(let i=0;i<3;i++) this.offset[i]=(this.focus[i]-base[i])*this.blend*clamp(strength,0,1);
      return this.offset;
    }
  }
  class GPUTracker {
    constructor(gl,makeTarget,makeProgram,vertex,rows,segments){
      this.gl=gl; this.target=makeTarget(1,1,gl.RGBA32F,gl.RGBA,gl.FLOAT,gl.NEAREST);
      this.program=makeProgram(vertex,shader(rows,segments));
      this.pbo=gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER,this.pbo);
      gl.bufferData(gl.PIXEL_PACK_BUFFER,16,gl.STREAM_READ); gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);
      this.data=new Float32Array(4); this.pending=null; this.timer=1; this.wait=0; this.failed=false;
    }
    cancel(){ if(this.pending){ this.gl.deleteSync(this.pending); this.pending=null; } }
    sample(texture,active,dt,enabled,offline=false){
      const gl=this.gl; this.timer+=dt;
      if(!enabled || active===0){ this.cancel(); return null; }
      if(this.failed || gl.isContextLost()) return null;
      let result=null;
      if(this.pending){
        this.wait+=dt;
        const status=gl.clientWaitSync(this.pending,0,0); // Poll, never block the render thread.
        if(status===gl.WAIT_FAILED){ this.cancel(); this.failed=true; return null; }
        if(status===gl.ALREADY_SIGNALED || status===gl.CONDITION_SATISFIED){
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER,this.pbo); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER,0,this.data);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null); this.cancel(); result=this.data.slice();
        }else if(this.wait>2){ this.cancel(); this.failed=true; return null; }
      }
      if(this.timer<.1 || this.pending) return result;
      this.timer=0;
      gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
      gl.bindFramebuffer(gl.FRAMEBUFFER,this.target.f); gl.viewport(0,0,1,1);
      gl.useProgram(this.program.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.uniform1i(this.program.u.uS,0); gl.uniform1i(this.program.u.uActive,active);
      gl.drawArrays(gl.TRIANGLES,0,3);
      if(offline){
        gl.readPixels(0,0,1,1,gl.RGBA,gl.FLOAT,this.data); return this.data.slice();
      }
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER,this.pbo); gl.readPixels(0,0,1,1,gl.RGBA,gl.FLOAT,0);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);
      this.pending=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0); this.wait=0; gl.flush();
      if(!this.pending) this.failed=true;
      return result;
    }
  }
  const api={shader,FocusRig,GPUTracker};
  root.StringsTracking=api;
  if(typeof module!=='undefined') module.exports=api;
})(globalThis);
