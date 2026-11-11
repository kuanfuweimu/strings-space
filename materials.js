(function(root){
  'use strict';
  const ranges={metal:[0,1],roughness:[.08,1],anisotropy:[-.9,.9],specular:[0,2],env:[0,3],envAngle:[0,360],envWidth:[.03,.5],warmth:[-1,1],emission:[0,2],bloom:[0,2.5],width:[.4,3],materialLegacy:[0,1]};
  const chrome={metal:1,roughness:.2,anisotropy:.15,specular:1,env:1.3,envAngle:28,envWidth:.12,warmth:-.15,emission:.12,bloom:.25,width:1.35,materialLegacy:0};
  const presets={
    chrome:{name:'抛光铬',values:{...chrome}},
    brushed:{name:'拉丝钢',values:{...chrome,roughness:.38,anisotropy:.78,env:1.45,envWidth:.18,emission:.05,bloom:.15}},
    titanium:{name:'暗钛',values:{...chrome,roughness:.3,anisotropy:.35,env:.72,specular:.8,warmth:-.55,emission:.03,bloom:.12}},
    original:{name:'原版对照',values:{...chrome,metal:1,emission:1,bloom:1,width:1,materialLegacy:1}}
  };
  function sanitize(values){
    const clean={};
    if(!values || typeof values!=='object') return clean;
    for(const [key,[min,max]] of Object.entries(ranges)){
      const value=values[key];
      if(typeof value==='number' && Number.isFinite(value)) clean[key]=Math.max(min,Math.min(max,value));
    }
    return clean;
  }
  function identify(values){
    return Object.keys(presets).find(id=>Object.entries(presets[id].values).every(([key,v])=>Math.abs(values[key]-v)<.005))||'custom';
  }
  const api={ranges,presets,sanitize,identify,defaults:{...chrome}};
  root.StringsMaterials=api;
  if(typeof module!=='undefined') module.exports=api;
})(globalThis);
