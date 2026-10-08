/**
 * The Lightning shaders (WebGL 1 / GLSL ES 1.0), ported from the approved mockup
 * (fx-mockups/parts/lightning.html, written from scratch for Q39). Kept terse on purpose: these
 * strings ship as-is (tsup has no GLSL loader or minifier).
 *
 * One full-screen triangle (`p`, attribute 0) runs the fragment shader over every pixel. In `uv`
 * (height = 1, origin at the center) the bolt is a vertical fractal path: `path(y, seed)` sums six
 * octaves of value noise, whose lower three give the coarse route and all six the jagged one. The
 * distance to that path lights a white-hot core, a crimson glow and a haze; an optional branch
 * forks off at `Q.x` and stretches `Q.y` towards side `Q.z`. A vignette and a 1/255 dither finish it.
 *
 * Uniforms: `R` canvas size (px) · `X` bolt x in uv · `T` noise time · `S` route seed · `I` bolt
 * intensity · `B` branch intensity · `F` flash · `Q` branch [fork y, length, side] · `C0` core
 * (`--sk-text`) · `C1` glow (`--sk-accent`) · `C2` sky (`--sk-accent-deep`) · `BG` stage (`--sk-bg`),
 * colors as 0–1 RGB.
 */

/** Vertex shader: passes the full-screen triangle through. */
export const VERTEX = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'

/** Fragment shader: the bolt, branch, glow, haze and sky for one pixel. */
export const FRAGMENT = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 R;uniform float T,S,I,B,X,F;uniform vec3 C0,C1,C2,BG,Q;
float h(vec2 p){p=fract(p*vec2(5.3987,5.4421));p+=dot(p.yx,p+vec2(21.5351,14.3137));return fract(p.x*p.y*95.4337);}
float n(vec2 p,float k){vec2 i=floor(p),f=fract(p);f=mix(f,f*f*(3.-2.*f),vec2(k,1.));return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}
vec2 path(float y,float s){float v=0.,a=.5,f=2.3,c=0.;for(int k=0;k<6;k++){v+=a*(n(vec2(y*f,s+T*(.04+float(k*k)*.38)),0.)-.5);if(k==2)c=v;f*=2.07;a*=.56;}return vec2(c,v);}
void main(){
vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
float y=uv.y,e=.003,am=.36,x0=X+.11*y;
vec2 p0=path(y,S);
float sl=clamp(am*(path(y+e,S).y-p0.y)/e+.11,-6.,6.);
float dc=abs(uv.x-x0-am*p0.y),dx=abs(uv.x-x0-am*p0.x);
float d=max(dc/sqrt(1.+sl*sl),dc-abs(sl)*e);
float by=Q.x-y,bd=1.,bi=0.;
if(B>0.&&by>-.1&&by<Q.y){
float b=max(by,0.),r=smoothstep(0.,.08,b),sb=b-Q.y*.42;
vec2 pb=path(y*2.6,S+31.);
float bx=x0+am*mix(p0.y,p0.x,r)+Q.z*(b*.75+.2*r*pb.y);
float sx=bx-Q.z*sb*.95+smoothstep(0.,.04,sb)*am*1.4*(p0.y-p0.x);
bd=min(length(vec2(uv.x-bx,min(by,0.))),sb>0.?abs(uv.x-sx)*1.15:1.)*.8;
bi=B*1.3*(1.-smoothstep(0.,Q.y,by))*smoothstep(-.1,0.,by);
}
vec2 q=uv*vec2(1.4,2.2)+vec2(T*.015,-T*.04);
float hz=(n(q,1.)*.6+n(q*2.3+4.,1.)*.4)*(.15+exp(-abs(uv.x-X)*1.6))*(.4+.6*I)*(1.+F);
float top=exp(-length((uv-vec2(X+.055,.52))*vec2(.8,2.))*2.4)*(.25+.75*I)*(1.+F);
float g=I*(exp(-d*240.)*.9+.02/(dx+.02)*.5+exp(-dx*6.)*.24)+bi*(exp(-bd*200.)*.9+exp(-bd*24.)*.3);
vec3 col=BG+C2*(hz*.5+top*.55)+C1*g+mix(C1,C0,.4)*exp(-d*120.)*.45*I;
col=mix(col,C0,clamp(exp(-d*d*6e4/(I*I))*min(I*1.3,1.)+exp(-bd*bd*1.4e5)*bi,0.,1.));
col*=1.-.3*dot(uv*vec2(.45,1.),uv*vec2(.45,1.));
col+=(h(gl_FragCoord.xy+fract(T)*61.)-.5)/255.;
gl_FragColor=vec4(col,1.);
}`

/** Uniform names, in the order the renderer looks them up. */
export const UNIFORMS = ['R', 'X', 'T', 'S', 'I', 'B', 'F', 'Q', 'C0', 'C1', 'C2', 'BG'] as const

/** One uniform name. */
export type LightningUniform = (typeof UNIFORMS)[number]
