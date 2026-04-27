import { useRef, useState } from 'react'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
const ACCEPTED_LABEL = 'JPG, PNG, HEIC or WebP — max 10 MB'

/**
 * @param {{
 *   id: string,
 *   label: string,
 *   hint?: string,
 *   file: File|null,
 *   onFile: (file: File|null) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function FileUploadField({ id, label, hint, file, onFile, disabled = false }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [fieldError, setFieldError] = useState('')

  function handleChange(event) {
    const selected = event.target.files?.[0] ?? null
    setFieldError('')
    setPreview(null)

    if (!selected) {
      onFile(null)
      return
    }

    if (!ACCEPTED_MIME.includes(selected.type)) {
      setFieldError(`Unsupported file type. Use ${ACCEPTED_LABEL}.`)
      onFile(null)
      event.target.value = ''
      return
    }

    if (selected.size > MAX_BYTES) {
      setFieldError('File is too large. Maximum size is 10 MB.')
      onFile(null)
      event.target.value = ''
      return
    }

    const objectUrl = URL.createObjectURL(selected)
    setPreview(objectUrl)
    onFile(selected)
  }

  function handleRemove() {
    setPreview(null)
    setFieldError('')
    onFile(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <label
        className="field-label"
        htmlFor={id}
        style={{ display: 'block', marginBottom: 6 }}
      >
        {label}
      </label>

      {hint ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>
          {hint}
        </p>
      ) : null}

      {preview ? (
        <div style={{ marginBottom: 10, position: 'relative', display: 'inline-block' }}>
          <img
            src={preview}
            alt="Document preview"
            style={{
              width: '100%',
              maxWidth: 280,
              maxHeight: 180,
              objectFit: 'cover',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              display: 'block',
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            aria-label="Remove file"
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              background: 'rgba(0,0,0,0.55)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              width: 26,
              height: 26,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      ) : null}

      {!file ? (
        <label
          htmlFor={id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px 16px',
            border: `2px dashed ${fieldError ? '#fca5a5' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            background: fieldError ? '#fff5f5' : 'var(--color-bg-subtle)',
            color: 'var(--color-text-muted)',
            fontSize: '0.88rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            transition: 'border-color 0.15s',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '1.3rem' }}>📎</span>
          {file ? (file.name) : 'Tap to choose a photo or file'}
        </label>
      ) : null}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPTED_MIME.join(',')}
        onChange={handleChange}
        disabled={disabled}
        style={{ display: 'none' }}
        aria-describedby={fieldError ? `${id}-error` : undefined}
      />

      {!file ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
          {ACCEPTED_LABEL}
        </p>
      ) : null}

      {fieldError ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="form-error"
          style={{ marginTop: 4 }}
        >
          {fieldError}
        </p>
      ) : null}
    </div>
  )
}
