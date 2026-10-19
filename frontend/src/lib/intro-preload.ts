type IntroAssets = { modulePreloads: string[]; model: string; landscape: string; brand: string; scene?: string };

/** Only the initial document owns this short-lived, pre-hydration handoff. */
export type IntroBoot = {
  frame?: HTMLIFrameElement;
  ready?: { type: "algolab:ready" };
  failed?: boolean;
  release: () => void;
};

declare global {
  interface Window { __algolabIntroBoot?: IntroBoot }
}

/** Static, trusted URLs only. Run during HTML parsing, before React hydration. */
export function introPreloadScript(assets: IntroAssets) {
  const data = JSON.stringify(assets).replaceAll("<", "\\u003c");
  return `(()=>{try{
    if(location.pathname!=="/"||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const preview=new URLSearchParams(location.search).get("intro")==="preview";
    const preference=localStorage.getItem("algolab:intro:preference");
    if(!preview&&(navigator.connection?.saveData||preference==="never"||(preference!=="always"&&localStorage.getItem("algolab:intro:seen")==="1")))return;
    const assets=${data};
    const add=(href,as)=>{if(document.querySelector('link[data-intro-preload][href="'+href+'"]'))return;const link=document.createElement("link");link.rel="preload";link.as=as;link.href=href;link.dataset.introPreload="";if(as!=="image"){link.crossOrigin="anonymous";link.fetchPriority="high";}document.head.appendChild(link);};
    assets.modulePreloads.forEach(href=>add(href,"script"));add(assets.model,"fetch");add(assets.landscape,"image");add(assets.brand,"image");
    if(!assets.scene||window.__algolabIntroBoot)return;
    let observer,timer;
    const boot={release:()=>{observer?.disconnect();clearTimeout(timer);window.removeEventListener("message",message);if(window.__algolabIntroBoot===boot)delete window.__algolabIntroBoot;}};
    function message(event){if(event.origin!==location.origin||event.source!==boot.frame?.contentWindow)return;if(event.data?.type==="algolab:ready")boot.ready={type:"algolab:ready"};if(event.data?.type==="algolab:error")boot.failed=true;}
    function attach(){const frame=document.querySelector("iframe[data-intro-scene]");if(!frame)return;observer?.disconnect();boot.frame=frame;const layer=frame.parentElement;layer?.setAttribute("data-enabled","");layer?.setAttribute("data-playing","");frame.src=assets.scene;}
    window.__algolabIntroBoot=boot;window.addEventListener("message",message);
    observer=new MutationObserver(attach);observer.observe(document.documentElement,{childList:true,subtree:true});attach();
    timer=setTimeout(()=>{boot.release();if(boot.frame?.isConnected){boot.frame.parentElement?.removeAttribute("data-enabled");boot.frame.parentElement?.removeAttribute("data-playing");}},20000);
  }catch{/* Storage or preloading unavailable: normal startup remains functional. */}})();`;
}
