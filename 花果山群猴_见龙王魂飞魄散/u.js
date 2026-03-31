const c=document.getElementById("c"),x=c.getContext("2d"),C=Math.cos,T=Math.tan,R=(r=0,g=0,b=0,a=1)=>`rgba(${Math.max(0,r)},${Math.max(0,g)},${Math.max(0,b)},${a})`
let f,i,w,火
function u(t) {
  x.save()
  with(x)for(i=800;i--;fillRect(~setTransform(i,0,0,i,880+i+3*i*C(i),700+2*i*C(i/400)),~rotate(i/6+t/2),2,2))fillStyle=R(i/5,i/4,i/3,.07)
  x.restore()
  f=(X,Y,n=0)=>X*X>4?n:f(2*X*Y-.7,T(Y*Y-X*X),n+1)
  for(i=w=2e3;i--;x.fillRect(i,t*60,1,火))
  x.fillStyle=R(火=f(i/w,t/28-.1)**1.6,火/6,0,.18)
}
x.fillStyle="#000"
x.fillRect(0,0,c.width,c.height)
requestAnimationFrame(function f(ms){u(ms/1e3),requestAnimationFrame(f)})
