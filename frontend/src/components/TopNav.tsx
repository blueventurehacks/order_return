import { Link } from 'react-router-dom'

export default function TopNav() {
  return (
    <nav style={{display:'flex', gap:12}}>
      <Link to="/">Orders</Link>
      |
      <Link to="/returns">Returns</Link>
    </nav>
  )
}
