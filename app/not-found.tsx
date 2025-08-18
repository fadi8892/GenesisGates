export default function NotFound() {
  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#fff'}}>
      <div style={{textAlign:'center',maxWidth:480,padding:24}}>
        <h1 style={{fontSize:24,fontWeight:700,marginBottom:8}}>Page not found</h1>
        <p style={{color:'#6b7280',marginBottom:16}}>The page you’re looking for doesn’t exist.</p>
        <a href="/" style={{display:'inline-block',background:'#000',color:'#fff',padding:'8px 16px',borderRadius:6,textDecoration:'none'}}>Go Home</a>
      </div>
    </div>
  );
}
