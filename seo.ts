const titles:Record<string,string>={home:'Comunidad Makers: conecta, aprende y construye',profile:'Mi perfil y actividad',admin:'Administración',metrics:'Indicadores',event:'Eventos',webinar:'Webinars',resource:'Aprendizaje',speaker:'Speakers',case:'Retos',solution:'Soluciones',project:'Proyectos',builder:'Builder cases',people:'Personas',post:'Comunidad'};
export function updateSeo(page:string,authenticated:boolean){
 const query=new URLSearchParams(location.search);
 const privateView=authenticated||page!=='home'||[...query.keys()].some(k=>k!=='page'&&!k.startsWith('utm_'))||!!location.hash;
 document.title=`Makers Fellowship by nextONE · ${titles[page]||'Comunidad Makers'}`;
 document.querySelector('meta[name="robots"]')?.setAttribute('content',privateView?'noindex, nofollow':'index, follow, max-image-preview:large');
}
