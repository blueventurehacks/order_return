import { useEffect, useMemo, useState } from 'react'
// TopNav handles navigation; no direct Link imports needed here
import TopNav from './components/TopNav'
import Modal from './components/Modal'

const useApiBase = () => {
  const base = useMemo(() => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', [])
  return base.replace(/\/$/, '')
}

type ReturnItem = {
  sku: string
  quantity: number
  condition_note?: string
}

type ReturnItemForm = {
  sku: string
  quantity: string
  condition_note: string
}

type ReturnRequest = {
  id: number
  order_id: number
  company_id: number
  reason?: string
  status: string
  rma_code: string
  order_number?: string
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

export default function App() {
  const API = useApiBase()

  const [createOut, setCreateOut] = useState('')
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  // State for viewing items of a return/order
  const [itemsOpen, setItemsOpen] = useState(false)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState<string>('')
  const [itemsList, setItemsList] = useState<ReturnItem[]>([])
  const [itemsTitle, setItemsTitle] = useState<string>('Order Items')
  const [companyId, setCompanyId] = useState('1')
  const [orderId, setOrderId] = useState('1')
  const [reason, setReason] = useState('Too large')
  const [itemsForm, setItemsForm] = useState<ReturnItemForm[]>([
    { sku: '', quantity: '1', condition_note: 'Unopened' }
  ])
  const [errors, setErrors] = useState<{companyId?: string; orderId?: string; reason?: string; items?: string; itemsErrors?: Array<{sku?: string; quantity?: string; condition_note?: string}>}>({})
  const [submitting, setSubmitting] = useState(false)

  const [listCompanyId, setListCompanyId] = useState('1')
  const [showCreate, setShowCreate] = useState(false)

  const [orders, setOrders] = useState<OrderRead[]>([])
  const [ordersResponse, setOrdersResponse] = useState<OrdersListResponse | null>(null)
  const [ordersCompanyId, setOrdersCompanyId] = useState('')

  function resetForm() {
    setCompanyId('1')
    setOrderId('1')
    setReason('')
    setItemsForm([{ sku: '', quantity: '1', condition_note: 'Unopened' }])
    setCreateOut('')
    setErrors({})
  }

  function validateInputs(): ReturnItem[] | null {
    const newErrors: {companyId?: string; orderId?: string; reason?: string; items?: string; itemsErrors?: Array<{sku?: string; quantity?: string; condition_note?: string}>} = {}
    // companyId
    const cid = Number(companyId)
    if (!Number.isInteger(cid) || cid <= 0) newErrors.companyId = 'Company ID must be a positive integer.'
    // orderId
    const oid = Number(orderId)
    if (!Number.isInteger(oid) || oid <= 0) newErrors.orderId = 'Order ID must be a positive integer.'
    // reason optional; if provided, trim length
    if (reason && reason.trim().length > 256) newErrors.reason = 'Reason must be 256 characters or fewer.'
    // items list validation
    if (!Array.isArray(itemsForm) || itemsForm.length === 0) {
      newErrors.items = 'At least one item is required.'
      setErrors(newErrors)
      return null
    }
    const perItemErrors: Array<{sku?: string; quantity?: string; condition_note?: string}> = itemsForm.map(() => ({}))
    const itemsJson: ReturnItem[] = []
    itemsForm.forEach((it, idx) => {
      const rowErr: {sku?: string; quantity?: string; condition_note?: string} = {}
      if (!it.sku || it.sku.trim() === '') rowErr.sku = 'SKU is required.'
      const qn = Number(it.quantity)
      if (!Number.isInteger(qn) || qn <= 0) rowErr.quantity = 'Quantity must be a positive integer.'
      if (!['New', 'Unopened', 'Opened and Unused', 'Opened and Used', 'Damaged'].includes(it.condition_note)) {
        rowErr.condition_note = 'Invalid condition.'
      }
      perItemErrors[idx] = rowErr
      if (Object.keys(rowErr).length === 0) {
        itemsJson.push({ sku: it.sku.trim(), quantity: qn, condition_note: it.condition_note })
      }
    })
    if (perItemErrors.some(e => Object.keys(e).length > 0)) {
      newErrors.itemsErrors = perItemErrors
    }
    setErrors(newErrors)
    if (newErrors.items || newErrors.itemsErrors) return null
    return itemsJson
  }

  async function createReturn() {
    const itemsJson = validateInputs()
    if (!itemsJson) return
    setSubmitting(true)
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
    const data = await r.json()
    setCreateOut(JSON.stringify(data, null, 2))
    setShowCreate(false)
    // refresh list for the selected company
    listOrders()
    resetForm()
    setSubmitting(false)
  }

  function addItemRow() {
    setItemsForm(prev => [...prev, { sku: '', quantity: '1', condition_note: 'Unopened' }])
    setErrors(e => ({ ...e, items: undefined, itemsErrors: undefined }))
  }

  function removeItemRow(index: number) {
    setItemsForm(prev => prev.filter((_, i) => i !== index))
    setErrors(e => ({ ...e, items: undefined, itemsErrors: undefined }))
  }

  function updateItemField(index: number, field: keyof ReturnItemForm, value: string) {
    setItemsForm(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  async function listReturns() {
    const r = await fetch(`${API}/returns/company/${Number(listCompanyId)}`)
    const data = await r.json()
    setReturns(data)
  }

  async function statusAction(id: number, action: string) {
    const r = await fetch(`${API}/returns/${id}/${action}`, { method: 'PATCH' })
    if (!r.ok) {
      alert(`Status ${action} failed: ${r.status}`)
    }
    await listReturns()
  }

  async function openOrderItems(returnId: number, orderLabel: string) {
    setItemsTitle(`Order ${orderLabel} Items`)
    setItemsOpen(true)
    setItemsLoading(true)
    setItemsError('')
    try {
      const r = await fetch(`${API}/returns/${returnId}`)
      if (!r.ok) throw new Error(`Failed to load items: ${r.status}`)
      const data = await r.json()
      setItemsList((data && data.items) || [])
    } catch (e: any) {
      setItemsError(e?.message || 'Failed to load items')
    } finally {
      setItemsLoading(false)
    }
  }


  async function listOrders() {
    const qs = ordersCompanyId ? `?company_id=${Number(ordersCompanyId)}` : ''
    const r = await fetch(`${API}/orders${qs}`)
    const data: OrdersListResponse = await r.json()
    setOrdersResponse(data)
    setOrders(data.items)
  }

  useEffect(() => {
    listOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listCompanyId])

  return (
    <div className="container">
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h1>Return Orders</h1>
          <p className="muted">Backend: <code>{API}</code></p>
        </div>
        <TopNav />
      </header>

      <section>
        <h2>List Orders</h2>
        <div className="form-row">
          <div>
            <label>Company ID <input value={listCompanyId} onChange={e=>setListCompanyId(e.target.value)} /></label>
            <button onClick={listOrders} style={{marginLeft:8}}>Refresh</button>
          </div>
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
                <th>Order ID</th>
                <th>Company</th>
                <th>Customer</th>
                <th>Order #</th>
                <th>Total</th>
                <th>Currency</th>
                <th>Return Status</th>
                <th>Actions</th>
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
                  <td>
                    <button
                      onClick={() => {
                        setCompanyId(String(o.company_id))
                        setOrderId(String(o.id))
                        setShowCreate(true)
                      }}
                      disabled={!!o.return_status}
                      title={o.return_status ? 'Return already exists' : 'Create return'}
                    >
                      Return
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer>
        <span className="muted">Tip: set VITE_API_BASE_URL in frontend/.env to point at a remote backend.</span>
      </footer>

      <Modal title="Create Return" open={showCreate} onClose={()=>{ setShowCreate(false); setErrors({}) }}>
        <div className="form-row">
          <label>Company ID
            <input value={companyId} onChange={e=>setCompanyId(e.target.value)} />
            {errors.companyId && <div style={{color:'crimson', fontSize:12}}>{errors.companyId}</div>}
          </label>
        </div>
        <div className="form-row">
          <label>Order ID
            <input value={orderId} onChange={e=>setOrderId(e.target.value)} />
            {errors.orderId && <div style={{color:'crimson', fontSize:12}}>{errors.orderId}</div>}
          </label>
        </div>
        <div className="form-row">
          <label>Reason
            <input value={reason} onChange={e=>setReason(e.target.value)} size={40} />
            {errors.reason && <div style={{color:'crimson', fontSize:12}}>{errors.reason}</div>}
          </label>
        </div>
        <div className="form-row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <label>Items</label>
          <button type="button" onClick={addItemRow}>Add Item</button>
        </div>
        {errors.items && <div style={{color:'crimson'}}>{errors.items}</div>}
        {itemsForm.map((it, idx) => (
          <div key={idx} className="form-row" style={{alignItems:'flex-start'}}>
            <label>SKU
              <input value={it.sku} onChange={e=>updateItemField(idx, 'sku', e.target.value)} />
              {errors.itemsErrors?.[idx]?.sku && <div style={{color:'crimson', fontSize:12}}>{errors.itemsErrors[idx]!.sku}</div>}
            </label>
            <label>Quantity
              <input value={it.quantity} size={4} onChange={e=>updateItemField(idx, 'quantity', e.target.value)} />
              {errors.itemsErrors?.[idx]?.quantity && <div style={{color:'crimson', fontSize:12}}>{errors.itemsErrors[idx]!.quantity}</div>}
            </label>
            <label>Condition
              <select value={it.condition_note} onChange={e=>updateItemField(idx, 'condition_note', e.target.value)}>
                <option value="New">New</option>
                <option value="Unopened">Unopened</option>
                <option value="Opened and Unused">Opened and Unused</option>
                <option value="Opened and Used">Opened and Used</option>
                <option value="Damaged">Damaged</option>
              </select>
              {errors.itemsErrors?.[idx]?.condition_note && <div style={{color:'crimson', fontSize:12}}>{errors.itemsErrors[idx]!.condition_note}</div>}
            </label>
            <div style={{display:'flex', alignItems:'center', alignSelf:'center'}}>
              <button type="button" className="secondary" onClick={()=>removeItemRow(idx)} disabled={itemsForm.length === 1}>Remove</button>
            </div>
          </div>
        ))}
        <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:8}}>
          <button onClick={()=>setShowCreate(false)} className="secondary">Cancel</button>
          <button onClick={createReturn} disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</button>
        </div>
        {createOut && <pre style={{marginTop:12}}>{createOut}</pre>}
      </Modal>

      {/* Modal to display items for a selected order/return */}
      <Modal title={itemsTitle} open={itemsOpen} onClose={()=>setItemsOpen(false)}>
        {itemsLoading && <div>Loading…</div>}
        {itemsError && <div style={{color:'crimson'}}>Error: {itemsError}</div>}
        {!itemsLoading && !itemsError && (
          itemsList.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsList.map((it, i) => (
                    <tr key={i}>
                      <td>{it.sku}</td>
                      <td>{it.quantity}</td>
                      <td>{it.condition_note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="muted">No items found for this order.</div>
          )
        )}
      </Modal>


    </div>
  )
}
