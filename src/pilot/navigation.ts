const pages=new Set(['home','people','profile','metrics','admin','event','webinar','resource','speaker','case','solution','project','post','update']);
export function currentDestination(){const p=new URLSearchParams(location.search);return {page:pages.has(p.get('page')||'')?p.get('page')!:'home',content:/^[0-9a-f-]{36}$/i.test(p.get('content')||'')?p.get('content'):null};}
export function destination(page:string,content?:string|null){const url=new URL(location.href);url.searchParams.set('page',pages.has(page)?page:'home');if(content)url.searchParams.set('content',content);else url.searchParams.delete('content');url.hash='';return url;}
export function navigateTo(page:string,content?:string|null){history.pushState({},'',destination(page,content));}
