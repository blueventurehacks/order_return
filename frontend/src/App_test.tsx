import { useMemo, useState } from 'react'
import TopNav from './components/TopNav'

const useApiBase = () => {
  const base = useMemo(() => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', [])
  return base.replace(/\/$/, '')
}

// Types used for display
type ReturnItem = {
  sku: string
  quantity: number
  condition_note?: string
}

type ReturnRequest = {
  id: number
  order_id: number
  company_id: number
  reason?: string
  status: string
  rma_code: string
  items?: ReturnItem[]
}

type OrderRead = {
  id: number
  company_id: number
  customer_id: number
  order_number: string
  total_amount?: number
  currency: string
  return_status?: string | null
}

type OrdersListResponse = {
  items: OrderRead[]
  total: number
  limit: number
  offset: number
}

type FraudReview = {
  id: number
  return_request_id: number
  risk_score: number
  reviewed: boolean
}

export default function AppTest() {
  const API = useApiBase()

  // Output panes
  const [healthOut, setHealthOut] = useState('')
  const [seedOut, setSeedOut] = useState('')
  const [createOut, setCreateOut] = useState('')
  const [shipOut, setShipOut] = useState('')
  const [refundOut, setRefundOut] = useState('')
  const [createOrderOut, setCreateOrderOut] = useState('')

  // Data lists
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [orders, setOrders] = useState<OrderRead[]>([])
  const [ordersResponse, setOrdersResponse] = useState<OrdersListResponse | null>(null)
  const [fraudReviews, setFraudReviews] = useState<FraudReview[]>([])
  const [showFraudList, setShowFraudList] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [companyId, setCompanyId] = useState('1')
  const [orderId, setOrderId] = useState('1')
  const [reason, setReason] = useState('Too large')
  const [items, setItems] = useState('[{"sku":"TSHIRT-XL","quantity":1}]')

  const [listCompanyId, setListCompanyId] = useState('1')
  const [ordersCompanyId, setOrdersCompanyId] = useState('')

  const [rrId, setRrId] = useState('1')
  const [carrier, setCarrier] = useState('UPS')

  const [refundAmount, setRefundAmount] = useState('59.99')
  const [refundCurrency, setRefundCurrency] = useState('USD')

  const [orderCompanyId, setOrderCompanyId] = useState('1')
  const [customerId, setCustomerId] = useState('1')
  const [orderNumber, setOrderNumber] = useState('ORD-1001')
  const [totalAmount, setTotalAmount] = useState('0')
  const [orderCurrency, setOrderCurrency] = useState('USD')

  // Endpoint helpers
  async function health() {
    const r = await fetch(`${API}/health`)
    setHealthOut(JSON.stringify(await r.json(), null, 2))
  }

  async function seedSample() {
    const r = await fetch(`${API}/seed/sample`, { method: 'POST' })
    setSeedOut(JSON.stringify(await r.json(), null, 2))
  }

  async function createReturn() {
    let itemsJson: ReturnItem[] = []
    try {
      itemsJson = JSON.parse(items || '[]')
      if (!Array.isArray(itemsJson)) throw new Error('Items must be an array')
    } catch (e: any) {
      alert(e?.message || 'Items must be a valid JSON array')
      return
    }
    const r = await fetch(`${API}/returns/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: Number(companyId),
        order_id: Number(orderId),
        reason,
        items: itemsJson,
      }),
    })
    setCreateOut(JSON.stringify(await r.json(), null, 2))
  }

  async function listReturns() {
    const r = await fetch(`${API}/returns/company/${Number(listCompanyId)}`)
    const data: ReturnRequest[] = await r.json()
    setReturns(data)
  }

  async function createShipment() {
    const r = await fetch(`${API}/shipping/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ return_request_id: Number(rrId), carrier }),
    })
    setShipOut(JSON.stringify(await r.json(), null, 2))
  }

  async function refund() {
    const r = await fetch(`${API}/refunds/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        return_request_id: Number(rrId),
        amount: Number(refundAmount),
        currency: refundCurrency,
      }),
    })
    setRefundOut(JSON.stringify(await r.json(), null, 2))
  }

  async function createOrder() {
    const payload = {
      company_id: Number(orderCompanyId),
      customer_id: Number(customerId),
      order_number: orderNumber,
      total_amount: totalAmount === '' ? undefined : Number(totalAmount),
      currency: orderCurrency,
    }
    const r = await fetch(`${API}/orders/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await r.json()
    setCreateOrderOut(JSON.stringify(data, null, 2))
  }

  async function listOrders() {
    const qs = ordersCompanyId ? `?company_id=${Number(ordersCompanyId)}` : ''
    const r = await fetch(`${API}/orders${qs}`)
    const data: OrdersListResponse = await r.json()
    setOrdersResponse(data)
    setOrders(data.items)
  }

  const fetchFraudReviews = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API}/fraud/`)
      if (!response.ok) {
        throw new Error('Failed to fetch fraud reviews')
      }
      const data = await response.json()
      setFraudReviews(data)
      setShowFraudList(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>API Test Harness</h1>
          <p className="muted">Backend: <code>{API}</code></p>
        </div>
        <TopNav />
      </header>

      <section>
        <h2>Health</h2>
        <div className="form-row">
          <button onClick={health}>GET /health</button>
        </div>
        <pre>{healthOut}</pre>
      </section>

      <section>
        <h2>Seed Sample Data</h2>
        <div className="form-row">
          <button onClick={seedSample}>POST /seed/sample</button>
        </div>
        <pre>{seedOut}</pre>
      </section>
      <hr />
      <section>
        <h2>Create Return</h2>
        <div className="form-row">
          <label>Company ID <input value={companyId} onChange={e => setCompanyId(e.target.value)} /></label>
          <label>Order ID <input value={orderId} onChange={e => setOrderId(e.target.value)} /></label>
        </div>
        <div className="form-row">
          <label>Reason <input value={reason} onChange={e => setReason(e.target.value)} size={40} /></label>
        </div>
        <div className="form-row">
          <label>Items (JSON)
            <input value={items} onChange={e => setItems(e.target.value)} size={60} />
          </label>
        </div>
        <div className="form-row">
          <button onClick={createReturn}>POST /returns/</button>
        </div>
        <pre>{createOut}</pre>
      </section>

      <section>
        <h2>List Returns by Company</h2>
        <div className="form-row">
          <label>Company ID <input value={listCompanyId} onChange={e => setListCompanyId(e.target.value)} /></label>
          <button onClick={listReturns}>GET /returns/company/{listCompanyId}</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Order</th>
                <th>RMA</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(x => (
                <tr key={x.id}>
                  <td>{x.id}</td>
                  <td>{x.status}</td>
                  <td>{x.order_id}</td>
                  <td>{x.rma_code}</td>
                  <td title={x.reason}>{x.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <hr />
      <section>
        <h2>Create Order</h2>
        <div className="form-row">
          <label>Company ID <input value={orderCompanyId} onChange={e => setOrderCompanyId(e.target.value)} /></label>
          <label>Customer ID <input value={customerId} onChange={e => setCustomerId(e.target.value)} /></label>
        </div>
        <div className="form-row">
          <label>Order Number <input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} /></label>
          <label>Total Amount <input value={totalAmount} onChange={e => setTotalAmount(e.target.value)} /></label>
          <label>Currency <input value={orderCurrency} onChange={e => setOrderCurrency(e.target.value)} /></label>
        </div>
        <div className="form-row">
          <button onClick={createOrder}>POST /orders/</button>
        </div>
        <pre>{createOrderOut}</pre>
        <p className="muted">Note: This expects a backend endpoint POST /orders/. If your API doesn't expose it yet, the request will 404.</p>
      </section>

      <section>
        <h2>List Orders</h2>
        <div className="form-row">
          <label>Company ID (optional)
            <input value={ordersCompanyId} onChange={e => setOrdersCompanyId(e.target.value)} placeholder="leave blank for all" />
          </label>
          <button onClick={listOrders}>GET /orders</button>
        </div>
        {ordersResponse && (
          <div className="muted" style={{ margin: '10px 0' }}>
            Showing {orders.length} of {ordersResponse.total} orders
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Company</th>
                <th>Customer</th>
                <th>Order #</th>
                <th>Total</th>
                <th>Currency</th>
                <th>Return Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.company_id}</td>
                  <td>{o.customer_id}</td>
                  <td>{o.order_number}</td>
                  <td>{o.total_amount?.toFixed(2) ?? '—'}</td>
                  <td>{o.currency}</td>
                  <td>{o.return_status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <hr />
      <section>
        <h2>Fraud Reviews</h2>
        <div className="form-row">
          <button
            onClick={fetchFraudReviews}
            disabled={loading}
            style={{ marginBottom: '20px' }}
          >
            {loading ? 'Loading...' : 'View All Fraud Reviews'}
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        {showFraudList && (
          <div className="fraud-list">
            <h2>Fraud Reviews</h2>
            {fraudReviews.length === 0 ? (
              <p>No fraud reviews found.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Return ID</th>
                    <th>Risk Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fraudReviews.map(review => (
                    <tr key={review.id}>
                      <td>{review.id}</td>
                      <td>{review.return_request_id}</td>
                      <td>{review.risk_score}</td>
                      <td>{review.reviewed ? 'Reviewed' : 'Pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
      <hr />
      <section>
        <h2>Shipment and Refund</h2>
        <div className="form-row">
          <label>Return Request ID <input value={rrId} onChange={e => setRrId(e.target.value)} /></label>
          <label>Carrier <input value={carrier} onChange={e => setCarrier(e.target.value)} /></label>
          <button onClick={createShipment}>POST /shipping/</button>
        </div>
        <pre>{shipOut}</pre>
        <div className="form-row">
          <label>Amount <input value={refundAmount} onChange={e => setRefundAmount(e.target.value)} /></label>
          <label>Currency <input value={refundCurrency} onChange={e => setRefundCurrency(e.target.value)} /></label>
          <button onClick={refund}>POST /refunds/</button>
        </div>
        <pre>{refundOut}</pre>
      </section>

      <footer>
        <span className="muted">Tip: set VITE_API_BASE_URL in frontend/.env to point at a remote backend.</span>
      </footer>
    </div>
  )
}
