const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const hex=(values:number[])=>'#'+values.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
export function luminance(color:string){const c=rgb(color).map(v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
export function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function mix(a:string,b:string,amount:number){const x=rgb(a),y=rgb(b);return hex(x.map((v,i)=>v*(1-amount)+y[i]*amount));}
/** Keep the chosen hue where possible, adjusting only its displayed brightness. */
export function readable(color:string,background:string,ratio=4.5){
 if(contrast(color,background)>=ratio)return color;
 const target=contrast('#ffffff',background)>contrast('#000000',background)?'#ffffff':'#000000';
 for(let i=1;i<=100;i++){const candidate=mix(color,target,i/100);if(contrast(candidate,background)>=ratio)return candidate;}
 return target;
}
