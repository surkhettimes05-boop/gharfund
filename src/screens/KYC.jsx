import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FileUploadField from '../components/FileUploadField.jsx'
import KycStatusBadge from '../components/KycStatusBadge.jsx'
import { getStoredSession } from '../lib/session.js'
import {
  KYC_DOCUMENT_TYPES,
  KYC_STATUS,
  getLatestKycSubmission,
  submitKyc,
  uploadKycFile,
} from '../services/kycService.js'

// ---------------------------------------------------------------------------
// Status-specific information panels
// ---------------------------------------------------------------------------
function KycPendingPanel({ submission }) {
  return (
    <section className="app-panel" aria-labelledby="kyc-title">
      <p className="eyebrow">Identity Verification</p>
      <h1 id="kyc-title" style={{ fontSize: '1.5rem' }}>
        Documents under review
      </h1>
      <div style={{ margin: '20px 0' }}>
        <KycStatusBadge status={KYC_STATUS.PENDING} />
      </div>
      <p className="lede">
        Your documents have been submitted and are being reviewed by our team. This
        typically takes 1–2 business days. You will be notified once your identity is
        confirmed.
      </p>
      {submission?.submitted_at ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
          Submitted:{' '}
          {new Date(submission.submitted_at).toLocaleDateString('en-NP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      ) : null}
      <div className="stack-actions" style={{ marginTop: 28 }}>
        <Link className="secondary-link secondary-link-block" to="/home">
          Back to home
        </Link>
      </div>
    </section>
  )
}

function KycVerifiedPanel() {
  return (
    <section className="app-panel" aria-labelledby="kyc-title">
      <p className="eyebrow">Identity Verification</p>
      <h1 id="kyc-title" style={{ fontSize: '1.5rem' }}>
        Identity verified ✓
      </h1>
      <div style={{ margin: '20px 0' }}>
        <KycStatusBadge status={KYC_STATUS.VERIFIED} />
      </div>
      <p className="lede">
        Your identity has been confirmed. You can now log transfers and execute
        remittances without restriction.
      </p>
      <div className="stack-actions" style={{ marginTop: 28 }}>
        <Link className="primary-link primary-link-block" to="/log-transfer">
          Log a transfer
        </Link>
        <Link className="secondary-link secondary-link-block" to="/home">
          Back to home
        </Link>
      </div>
    </section>
  )
}

function KycRejectedPanel({ submission, onResubmit }) {
  return (
    <section className="app-panel" aria-labelledby="kyc-title">
      <p className="eyebrow">Identity Verification</p>
      <h1 id="kyc-title" style={{ fontSize: '1.5rem' }}>
        Verification not approved
      </h1>
      <div style={{ margin: '20px 0' }}>
        <KycStatusBadge status={KYC_STATUS.REJECTED} />
      </div>
      {submission?.reviewer_note ? (
        <div
          className="summary-card"
          style={{ borderColor: '#fca5a5', background: '#fff5f5', marginBottom: 16 }}
        >
          <p className="summary-line" style={{ color: '#991b1b', fontWeight: 600 }}>
            Reviewer note
          </p>
          <p className="summary-line">{submission.reviewer_note}</p>
        </div>
      ) : (
        <p className="lede">
          Your documents could not be verified. Please resubmit with clear, unobstructed
          photos of your ID and selfie.
        </p>
      )}
      <div className="stack-actions" style={{ marginTop: 28 }}>
        <button className="primary-button" type="button" onClick={onResubmit}>
          Resubmit documents
        </button>
        <Link className="secondary-link secondary-link-block" to="/home">
          Back to home
        </Link>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main KYC submission form
// ---------------------------------------------------------------------------
function KycSubmitForm({ userId, onSubmitted }) {
  const [documentType, setDocumentType] = useState('')
  const [documentFile, setDocumentFile] = useState(null)
  const [selfieFile, setSelfieFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | uploading | submitting | done
  const [error, setError] = useState('')

  const canSubmit =
    documentType && documentFile && selfieFile && status === 'idle'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!documentType) {
      setError('Please select a document type.')
      return
    }
    if (!documentFile) {
      setError('Please upload a photo of your ID document.')
      return
    }
    if (!selfieFile) {
      setError('Please upload a selfie with your ID.')
      return
    }

    try {
      setStatus('uploading')

      const [documentPath, selfiePath] = await Promise.all([
        uploadKycFile(userId, 'document', documentFile),
        uploadKycFile(userId, 'selfie', selfieFile),
      ])

      setStatus('submitting')

      await submitKyc({ userId, documentType, documentPath, selfiePath })

      setStatus('done')
      onSubmitted()
    } catch (err) {
      setStatus('idle')
      setError(err.message || 'Submission failed. Please try again.')
    }
  }

  const isWorking = status === 'uploading' || status === 'submitting'

  return (
    <section className="app-panel" aria-labelledby="kyc-title">
      <p className="eyebrow">Identity Verification</p>
      <h1 id="kyc-title" style={{ fontSize: '1.5rem' }}>
        Verify your identity
      </h1>
      <p className="lede">
        To comply with regulations and unlock remittance, we need to verify your identity
        once. This is a one-time process.
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {/* Document type selector */}
        <label className="field-label" htmlFor="kyc-doc-type">
          Document type
        </label>
        <select
          id="kyc-doc-type"
          className="select-input"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          disabled={isWorking}
        >
          <option value="">Select document type</option>
          {KYC_DOCUMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Document upload */}
        <FileUploadField
          id="kyc-document"
          label="Photo of your ID document"
          hint="Both sides in one image if possible. Ensure all text is clearly readable."
          file={documentFile}
          onFile={setDocumentFile}
          disabled={isWorking}
        />

        {/* Selfie upload */}
        <FileUploadField
          id="kyc-selfie"
          label="Selfie holding your ID"
          hint="Hold your ID next to your face so both are clearly visible."
          file={selfieFile}
          onFile={setSelfieFile}
          disabled={isWorking}
        />

        {/* Progress label */}
        {isWorking ? (
          <p className="form-note" aria-live="polite">
            {status === 'uploading'
              ? '⬆ Uploading documents securely…'
              : '⏳ Submitting for review…'}
          </p>
        ) : null}

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          className="primary-button"
          type="submit"
          disabled={!canSubmit || isWorking}
        >
          {isWorking ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>

      <p
        style={{
          marginTop: 20,
          fontSize: '0.78rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
        }}
      >
        🔒 Your documents are stored securely and only reviewed by authorised team
        members. They are never shared with third parties.
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Root KYC screen — loads current status and branches to the right panel
// ---------------------------------------------------------------------------
export default function KYC() {
  const session = getStoredSession()
  const navigate = useNavigate()

  const [kycStatus, setKycStatus] = useState(null) // null = loading
  const [submission, setSubmission] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [forceForm, setForceForm] = useState(false)

  const userId = session?.supabaseUserId

  useEffect(() => {
    if (!userId) {
      navigate('/auth', { replace: true })
      return
    }

    let cancelled = false

    async function load() {
      try {
        const latest = await getLatestKycSubmission(userId)
        if (!cancelled) {
          setSubmission(latest)
          setKycStatus(latest?.status ?? KYC_STATUS.UNVERIFIED)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId, navigate])

  function handleSubmitted() {
    setKycStatus(KYC_STATUS.PENDING)
    setForceForm(false)
  }

  if (!userId) return null

  if (loadError) {
    return (
      <section className="app-panel" aria-labelledby="kyc-title">
        <p className="eyebrow">Identity Verification</p>
        <h1 id="kyc-title">Could not load KYC status</h1>
        <p className="form-error" role="alert">{loadError}</p>
        <Link className="secondary-link secondary-link-block" to="/home">
          Back to home
        </Link>
      </section>
    )
  }

  if (kycStatus === null) {
    return (
      <section className="app-panel" aria-labelledby="kyc-title">
        <p className="eyebrow">Identity Verification</p>
        <h1 id="kyc-title">Loading…</h1>
      </section>
    )
  }

  if (kycStatus === KYC_STATUS.VERIFIED) {
    return <KycVerifiedPanel />
  }

  if (kycStatus === KYC_STATUS.PENDING && !forceForm) {
    return <KycPendingPanel submission={submission} />
  }

  if (kycStatus === KYC_STATUS.REJECTED && !forceForm) {
    return (
      <KycRejectedPanel
        submission={submission}
        onResubmit={() => setForceForm(true)}
      />
    )
  }

  // unverified or forced resubmit
  return <KycSubmitForm userId={userId} onSubmitted={handleSubmitted} />
}
