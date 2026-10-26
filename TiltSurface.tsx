import {useRef,useEffect,type ReactNode,type CSSProperties} from 'react';
export default function TiltSurface({children,className='',style}:{children:ReactNode;className?:string;style?:CSSProperties}){
 const ref=useRef<HTMLElement>(null),frame=useRef(0);
 useEffect(()=>()=>cancelAnimationFrame(frame.current),[]);
 const reset=()=>{cancelAnimationFrame(frame.current);ref.current?.style.setProperty('--tilt-x','0deg');ref.current?.style.setProperty('--tilt-y','0deg');};
 return <article ref={ref} className={'lift-surface '+className} style={style} onPointerMove={e=>{if(e.pointerType!=='mouse'||matchMedia('(prefers-reduced-motion: reduce)').matches||!matchMedia('(hover: hover)').matches)return;const el=e.currentTarget,rect=el.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width-.5,y=(e.clientY-rect.top)/rect.height-.5;cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>{el.style.setProperty('--tilt-x',(-y*5)+'deg');el.style.setProperty('--tilt-y',(x*5)+'deg');el.style.setProperty('--glow-x',((x+.5)*100)+'%');el.style.setProperty('--glow-y',((y+.5)*100)+'%');});}} onPointerLeave={reset}>{children}</article>;
}
