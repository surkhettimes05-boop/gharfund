import { useState } from 'react'
import { uploadKycDocument, setKycPending, getKycStatus } from '../services/kycService.js'
import { getStoredSession } from '../lib/session.js'

export default function KYC() {
  const session = getStoredSession()
  const [idFile, setIdFile] = useState(null)
  const [selfieFile, setSelfieFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [kycStatus, setKycStatus] = useState('unverified')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function fetchKycStatus() {
    if (!session?.supabaseUserId) return
    try {
      const status = await getKycStatus(session.supabaseUserId)
      setKycStatus(status)
    } catch (e) {
      setError('Could not fetch KYC status')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('uploading')
    setError('')
    setSuccess('')
    try {
      if (!idFile || !selfieFile) {
        setError('Please upload both ID and selfie.')
        setStatus('idle')
        return
      }
      await uploadKycDocument(session.supabaseUserId, idFile, 'id')
      await uploadKycDocument(session.supabaseUserId, selfieFile, 'selfie')
      await setKycPending(session.supabaseUserId)
      setSuccess('Documents uploaded. Verification pending.')
      setStatus('idle')
      setKycStatus('pending')
    } catch (e) {
      setError(e.message || 'Upload failed')
      setStatus('idle')
    }
  }

  function handleFileChange(e, type) {
    const file = e.target.files[0]
    if (type === 'id') setIdFile(file)
    else setSelfieFile(file)
  }

  // Fetch status on mount
  useState(fetchKycStatus, [])

  return (
    <section className="app-panel" aria-labelledby="kyc-title">
      <h1 id="kyc-title">KYC Verification</h1>
      <p className="lede">Upload your ID and a selfie to verify your account.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field-label">Upload ID</label>
        <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'id')} />
        <label className="field-label">Upload Selfie</label>
        <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'selfie')} />
        <button className="primary-button" type="submit" disabled={status === 'uploading'}>
          {status === 'uploading' ? 'Uploading...' : 'Submit'}
        </button>
      </form>
      {kycStatus === 'pending' && <p className="form-note">Verification pending. Please wait for approval.</p>}
      {kycStatus === 'verified' && <p className="form-note">KYC complete. You are verified!</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="form-note">{success}</p>}
    </section>
  )
}
