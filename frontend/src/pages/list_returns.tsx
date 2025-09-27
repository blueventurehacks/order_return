import { useEffect, useMemo, useState } from 'react'
// TopNav handles navigation; no direct Link imports needed here
import TopNav from '../components/TopNav'
import Modal from '../components/Modal'

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
  order_number?: string
  company_id: number
  reason?: string
  status: string
  rma_code: string
  has_fraud_review?: boolean
  fraud_reviewed?: boolean
}

type FraudReview = {
  id: number
  return_request_id: number
  risk_score: number
  notes?: string
  reviewed: boolean
  created_at: string
}

export default function ReturnsByCompany() {
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

  const [fraudReview, setFraudReview] = useState<{open: boolean, returnId?: number, notes: string, riskScore: number}>({
    open: false,
    notes: '',
    riskScore: 50
  });

  const [loading, setLoading] = useState(false)

  const [viewingReview, setViewingReview] = useState<number | null>(null);
  const [fraudDetails, setFraudDetails] = useState<FraudReview | null>(null);

  const [verificationOpen, setVerificationOpen] = useState(false);
  const [currentReturn, setCurrentReturn] = useState<ReturnRequest | null>(null);
  const [rmaInput, setRmaInput] = useState('');
  const [verificationError, setVerificationError] = useState('');

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
    listReturns()
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
    setLoading(true)
    try {
      const res = await fetch(`${API}/returns/company/${Number(listCompanyId)}`)
      if (!res.ok) throw new Error('Failed to fetch returns')
      let returns = await res.json()
      
      // Fetch fraud reviews
      const fraudRes = await fetch(`${API}/fraud/`)
      if (fraudRes.ok) {
        const fraudReviews = await fraudRes.json()
        // Add fraud review status to each return
        returns = returns.map((r: ReturnRequest) => {
          const review = fraudReviews.find((fr: FraudReview) => fr.return_request_id === r.id)
          return {
            ...r,
            has_fraud_review: !!review,
            fraud_reviewed: review?.reviewed || false
          }
        })
      }
      
      setReturns(returns)
    } catch (error) {
      console.error('Error fetching returns:', error)
      alert('Failed to load returns')
    } finally {
      setLoading(false)
    }
  }

  async function statusAction(id: number, action: string) {
    const r = await fetch(`${API}/returns/${id}/${action}`, { method: 'PATCH' })
    if (!r.ok) {
      alert(`Status ${action} failed: ${r.status}`)
    }
    await listReturns()
  }

  async function flagAsFraud(returnId: number) {
    setFraudReview({
      open: true,
      returnId,
      notes: '',
      riskScore: 50
    });
  }

  async function submitFraudReview() {
    if (!fraudReview.returnId) return;
    
    try {
      const response = await fetch(`${API}/fraud/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_request_id: fraudReview.returnId,
          risk_score: fraudReview.riskScore,
          notes: fraudReview.notes || undefined
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to flag return for fraud review: ${response.statusText}`);
      }
      
      // Refresh the returns list to show the updated status
      await listReturns();
      setFraudReview({...fraudReview, open: false});
      alert('Return has been flagged for fraud review');
    } catch (error: any) {
      console.error('Error flagging return for fraud review:', error);
      alert(error.message || 'Failed to flag return for fraud review');
    }
  }

  async function markReviewComplete(returnId: number) {
    if (!window.confirm('Mark this fraud review as completed?')) return;
    
    try {
      // First, find the fraud review ID for this return
      const reviewsResponse = await fetch(`${API}/fraud/`);
      if (!reviewsResponse.ok) throw new Error('Failed to fetch fraud reviews');
      
      const reviews = await reviewsResponse.json();
      const review = reviews.find((r: FraudReview) => r.return_request_id === returnId && !r.reviewed);
      
      if (!review) {
        throw new Error('No pending fraud review found for this return');
      }

      const response = await fetch(`${API}/fraud/${review.id}/mark-reviewed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to mark review as complete: ${response.statusText}`);
      }
      
      await listReturns();
      alert('Fraud review marked as completed');
    } catch (error: any) {
      console.error('Error completing fraud review:', error);
      alert(error.message || 'Failed to complete fraud review');
    }
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

  const viewFraudDetails = async (returnId: number) => {
    try {
      const response = await fetch(`${API}/fraud/`);
      if (!response.ok) throw new Error('Failed to fetch fraud reviews');
      const reviews = await response.json();
      const review = reviews.find((r: FraudReview) => r.return_request_id === returnId);
      if (review) {
        setFraudDetails(review);
        setViewingReview(returnId);
      } else {
        alert('No fraud review found for this return');
      }
    } catch (error) {
      console.error('Error fetching fraud details:', error);
      alert('Failed to load fraud details');
    }
  };

  const closeFraudModal = () => {
    setViewingReview(null);
    setFraudDetails(null);
  };

  const handleMarkComplete = async () => {
    if (!fraudDetails) return;
    
    try {
      const response = await fetch(`${API}/fraud/${fraudDetails.id}/mark-reviewed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to mark review as complete');
      
      // Update the local state to reflect the change
      setFraudDetails(prev => prev ? { ...prev, reviewed: true } : null);
      
      // Refresh the returns list to show updated status
      await listReturns();
      closeFraudModal();
    } catch (error) {
      console.error('Error marking review as complete:', error);
      alert('Failed to update review status');
    }
  };

  const handleVerifyReceived = (returnItem: ReturnRequest) => {
    setCurrentReturn(returnItem);
    setRmaInput('');
    setVerificationError('');
    setVerificationOpen(true);
  };

  const confirmVerification = async () => {
    if (currentReturn && rmaInput === currentReturn.rma_code) {
      try {
        await statusAction(currentReturn.id, 'received');
        // Refresh the returns list to show updated status
        await listReturns();
        setVerificationOpen(false);
      } catch (error) {
        console.error('Error during verification:', error);
        setVerificationError('An error occurred during verification. Please try again.');
      }
    } else {
      setVerificationError('Invalid RMA code. Please try again.');
    }
  };

  useEffect(() => {
    listReturns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listCompanyId])

  return (
    <div className="container">
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h1>Handle Returns</h1>
          <p className="muted">Backend: <code>{API}</code></p>
        </div>
        <TopNav />
      </header>

      <section>
        <div className="form-row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <label>Company ID <input value={listCompanyId} onChange={e=>setListCompanyId(e.target.value)} /></label>
            <button onClick={listReturns} style={{marginLeft:8}}>Refresh</button>
          </div>
          <button onClick={()=>{ setCompanyId(listCompanyId); setShowCreate(true) }}>Create Return</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
               {/* <th>ID</th> */}
                <th>Order Number</th>
                <th>Status</th>
                <th>RMA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(x => (
                <tr key={x.id}>
                {/*  <td>{x.id}</td> */}
                  
                  <td>
                    <button
                      onClick={() => openOrderItems(x.id, String(x.order_id))}
                      title="View items in this order"
                      style={{ background:'none', border:'none', color:'#0366d6', textDecoration:'underline', cursor:'pointer', padding:0 }}
                    >
                      {x.order_number}
                    </button>
                  </td>
                  <td>{x.status}</td>
                  <td>{x.rma_code ? x.rma_code.slice(0, -4) + 'x'.repeat(4) : ''}</td>
                  <td className="actions">
                    {x.has_fraud_review && !x.fraud_reviewed ? (
                      <button 
                        onClick={() => viewFraudDetails(x.id)}
                        style={{ backgroundColor: '#4caf50', color: 'white' }}
                        title={x.has_fraud_review 
                          ? x.fraud_reviewed 
                            ? 'View fraud review details' 
                            : 'View fraud review details'
                          : 'No fraud review available'}
                      >
                        View Fraud Review
                      </button>
                                           
                    ) : (
                      <>
                        <button 
                          onClick={()=>statusAction(x.id, 'approve')} 
                          disabled={x.status !== 'PENDING' || (x.has_fraud_review && !x.fraud_reviewed)}
                          title={x.has_fraud_review && !x.fraud_reviewed ? 'Complete fraud review first' : ''}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={()=>statusAction(x.id, 'deny')} 
                          disabled={x.status !== 'PENDING' || (x.has_fraud_review && !x.fraud_reviewed)}
                          title={x.has_fraud_review && !x.fraud_reviewed ? 'Complete fraud review first' : ''}
                        >
                          Deny
                        </button>
                        <button 
                          onClick={()=>handleVerifyReceived(x)} 
                          disabled={x.status !== 'APPROVED' || (x.has_fraud_review && !x.fraud_reviewed)}
                          title={x.has_fraud_review && !x.fraud_reviewed ? 'Complete fraud review first' : ''}
                        >
                          {x.status === 'RECEIVED' || x.status === 'REFUNDED' ? 'Received' : 'Verify Received'}
                        </button>
                        <button 
                          onClick={()=>statusAction(x.id, 'refunded')} 
                          disabled={x.status !== 'RECEIVED' || (x.has_fraud_review && !x.fraud_reviewed)}
                          title={x.has_fraud_review && !x.fraud_reviewed ? 'Complete fraud review first' : ''}
                        >
                          Refunded
                        </button>

                        {x.has_fraud_review && (
                          <button 
                            onClick={() => viewFraudDetails(x.id)}
                            disabled={!x.has_fraud_review}
                            style={{ 
                              marginLeft: '8px', 
                              backgroundColor: x.has_fraud_review 
                                ? x.fraud_reviewed 
                                  ? '#e0e0e0' 
                                  : '#fff3e0' 
                                : '#fff3e0'
                            }}
                            title={x.has_fraud_review 
                              ? x.fraud_reviewed 
                                ? 'View fraud review details'
                                : 'Review fraud details'
                              : 'No fraud review available'}
                          >
                            {x.fraud_reviewed ? 'View Fraud' : 'Review Fraud'}
                          </button>
                        )}
                        {!x.has_fraud_review && x.status === 'PENDING' && (
                          <button 
                            onClick={() => flagAsFraud(x.id)}
                            disabled={x.status !== 'PENDING'}
                            style={{ 
                              marginLeft: '8px', 
                              backgroundColor: '#fff3e0'
                            }}
                            title="Flag this return as potential fraud"
                          >
                            Flag as Fraud
                          </button>
                        )}
                        {!x.has_fraud_review && x.status !== 'PENDING' && (
                          <button 
                            onClick={() => viewFraudDetails(x.id)}
                            disabled={!x.has_fraud_review}
                            style={{ 
                              marginLeft: '8px', 
                              backgroundColor: x.has_fraud_review 
                                ? x.fraud_reviewed 
                                  ? '#e0e0e0' 
                                  : '#fff3e0' 
                                : '#fff3e0'
                            }}
                            title={'No fraud review available'}
                          >
                            'No Review'
                          </button>
                        )}
                      </>
                    )}
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

      <Modal 
        title="Create Return" 
        open={showCreate} 
        onClose={()=>{ setShowCreate(false); setErrors({}) }}
      >
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

      <Modal 
        title="Flag for Fraud Review" 
        open={fraudReview.open} 
        onClose={() => setFraudReview({...fraudReview, open: false})}
      >
        <div className="form-row">
          <label>
            Risk Score (0-100)
            <input 
              type="number" 
              min="0" 
              max="100" 
              value={fraudReview.riskScore} 
              onChange={e => setFraudReview({...fraudReview, riskScore: parseInt(e.target.value) || 0})} 
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Notes
            <textarea 
              value={fraudReview.notes}
              onChange={e => setFraudReview({...fraudReview, notes: e.target.value})}
              rows={4}
              style={{width: '100%'}}
            />
          </label>
        </div>
        <div className="form-row" style={{justifyContent: 'flex-end', gap: '8px'}}>
          <button onClick={() => setFraudReview({...fraudReview, open: false})}>Cancel</button>
          <button onClick={submitFraudReview} style={{backgroundColor: '#e53935', color: 'white'}}>
            Flag for Review
          </button>
        </div>
      </Modal>

      <Modal 
        title="Fraud Review Details" 
        open={!!viewingReview} 
        onClose={closeFraudModal}
      >
        {fraudDetails && (
          <div className="fraud-details">
            <div className="form-row">
              <div className="fraud-detail">
                <div className="fraud-detail-label">Risk Score:</div>
                <div className="fraud-detail-value">{fraudDetails.risk_score}</div>
              </div>
            </div>
            <div className="form-row">
              <div className="fraud-detail">
                <div className="fraud-detail-label">Notes:</div>
                <div className="fraud-detail-value">{fraudDetails.notes || '—'}</div>
              </div>
            </div>
            <div className="form-row">
              <div className="fraud-detail">
                <div className="fraud-detail-label">Status:</div>
                <div className="fraud-detail-value">
                  {fraudDetails.reviewed ? 'Reviewed' : 'Pending Review'}
                </div>
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: '20px' }}>
              <button onClick={closeFraudModal}>
                Close
              </button>
              {!fraudDetails.reviewed && (
                <button 
                  onClick={handleMarkComplete}
                  style={{ 
                    backgroundColor: '#4caf50', 
                    color: 'white',
                    marginLeft: '10px'
                  }}
                >
                  Mark as Complete
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal 
        open={verificationOpen} 
        onClose={() => setVerificationOpen(false)}
        title="Verify RMA Code"
      >
        <div style={{ padding: '1rem' }}>
          <p>Please enter the full RMA code to verify receipt of this return:</p>
          <input
            type="text"
            value={rmaInput}
            onChange={(e) => {
              setRmaInput(e.target.value);
              if (verificationError) setVerificationError('');
            }}
            style={{ width: '100%', padding: '8px', margin: '10px 0' }}
            placeholder="Enter RMA code"
            autoFocus
          />
          {verificationError && (
            <p style={{ color: 'red', margin: '5px 0' }}>{verificationError}</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button onClick={() => setVerificationOpen(false)}>Cancel</button>
            <button 
              onClick={confirmVerification}
              disabled={!rmaInput}
              style={{ backgroundColor: '#4CAF50', color: 'white' }}
            >
              Verify & Mark as Received
            </button>
          </div>
        </div>
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
