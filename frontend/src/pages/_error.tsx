function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'#030712',color:'#f3f4f6'}}>
      <div style={{textAlign:'center'}}>
        <h1 style={{fontSize:'4rem',fontWeight:'bold'}}>{statusCode || 'Error'}</h1>
        <p style={{color:'#9ca3af',marginTop:'0.5rem'}}>
          {statusCode === 404 ? 'Page not found' : 'An error occurred'}
        </p>
        <a href="/" style={{color:'#818cf8',marginTop:'1rem',display:'inline-block'}}>Go home</a>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
