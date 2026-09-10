export type ProjectOverlay={id:string;name?:string;repo:string;defaultBranch:string;framework?:string;projectPath?:string;gamePath?:string;productKind?:string;artStyle?:string;notes?:string;verifyPaths?:string[]};
const overlay=new Map<string,ProjectOverlay>();
export function setProjectOverlay(project:ProjectOverlay){overlay.set(project.id,project);return project;}
export function removeProjectOverlay(id:string){overlay.delete(id);}
export function getProjectOverlay(id:string){return overlay.get(id)??null;}
export function listProjectOverlays(){return[...overlay.values()];}
