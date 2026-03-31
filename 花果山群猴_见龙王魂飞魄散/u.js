const c=document.getElementById("c"),x=c.getContext("2d"),l=Object.assign(document.createElement("canvas"),{width:c.width,height:c.height}),y=l.getContext("2d"),C=Math.cos,T=Math.tan,R=(r=0,g=0,b=0,a=1)=>`rgba(${Math.max(0,r)},${Math.max(0,g)},${Math.max(0,b)},${a})`
let f,i,j,w,火,a
function v() {
  f=(X,Y,n=0)=>X*X>4?n:f(2*X*Y-.7,T(Y*Y-X*X),n+1)
  for(j=0;j<l.height;j+=2)for(i=0,w=l.width;i<w;i+=2)火=f(i/w,j/1680-.1)**1.6,火>11e2&&(y.fillStyle=R(160+火/30,200+火/18,255,.08),y.fillRect(i,j,2,2+火/900))
}
function u(t) {
  x.fillStyle="#000"
  x.fillRect(0,0,c.width,c.height)
  x.save()
  with(x)for(i=800;i--;fillRect(~setTransform(i,0,0,i,880+i+3*i*C(i),700+2*i*C(i/400)),~rotate(i/6+t/2),2,2))fillStyle=R(i/5,i/4,i/3,.05)
  x.restore()
  x.save()
  x.globalCompositeOperation="screen"
  x.globalAlpha=a=.02+.78*Math.max(0,Math.sin(t*3))**10
  x.drawImage(l,0,0)
  x.restore()
}
v()
requestAnimationFrame(function f(ms){u(ms/1e3),requestAnimationFrame(f)})
