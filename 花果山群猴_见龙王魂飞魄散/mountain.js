const C=Math.cos
function mountain(t) {
  x.save()
  with(x)for(i=800;i--;fillRect(~setTransform(i,0,0,i,880+i+3*i*C(i),700+2*i*C(i/400)),~rotate(i/6+t/2),2,2))fillStyle=R(i/5,i/4,i/3,.07)
  x.restore()
}
