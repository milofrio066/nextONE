export const layouts=['slides','timeline','hotspots','cards','checklist'] as const;
export type StoryLayout=typeof layouts[number];
export type StoryBlock={title:string;text:string};
export function decodeStory(body:string):{layout:StoryLayout|null;blocks:StoryBlock[];text:string}{
 const match=body.match(/^\[nextONE:(slides|timeline|hotspots|cards|checklist)\]\n/);
 const text=match?body.slice(match[0].length):body;
 return {layout:match?match[1] as StoryLayout:null,text,blocks:text.split(match?'\n\n---nextONE-block---\n\n':/\n\s*\n/).filter(s=>s.trim()).map(s=>{const [title,...rest]=(match?s:s.trim()).split('\n');return {title,text:rest.join('\n')};})};
}
export function encodeStory(layout:StoryLayout,blocks:StoryBlock[]){return '[nextONE:'+layout+']\n'+blocks.map(b=>b.title+'\n'+b.text).join('\n\n---nextONE-block---\n\n');}
export function storyExcerpt(body:string){const story=decodeStory(body);return story.layout?story.blocks.map(b=>b.title+'\n'+b.text).join('\n\n'):body;}
