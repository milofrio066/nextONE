// Cada logo existe para fondo oscuro y claro; brand.css muestra solo el del tema activo.
function ThemedLogo({name,className}:{name:string;className:string}){
 return <><img className={`${className} on-dark`} src={`/brand/${name}-on-dark.png`} alt=""/><img className={`${className} on-light`} src={`/brand/${name}-on-light.png`} alt=""/></>;
}
export default function BrandLockup(){
 return <span className="brand-lockup" aria-hidden="true">
  <span className="lockup-part"><ThemedLogo name="makers-mark" className="lockup-mark"/><ThemedLogo name="makers-word" className="lockup-word"/></span>
  <span className="lockup-by">by</span>
  <span className="lockup-part"><img className="lockup-mark lockup-symbol" src="/brand/nextone-symbol.png" alt=""/><ThemedLogo name="nextone-word" className="lockup-word lockup-next"/></span>
 </span>;
}
