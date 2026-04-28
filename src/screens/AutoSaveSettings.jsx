import { useState, useEffect } from 'react'
import { LoadingState, ErrorState } from '../components'
import {
  getAutoSaveSettings,
  updateAutoSaveSettings,
  enableAutoSave,
  disableAutoSave,
} from '../services/autoSaveService'
import { supabase } from '../lib/supabase'

export default function AutoSaveSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Form state
  const [enabled, setEnabled] = useState(false)
  const [percentage, setPercentage] = useState(10)
  const [minAmount, setMinAmount] = useState(1000)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session?.user?.id) {
        throw new Error('No active session')
      }

      const userSettings = await getAutoSaveSettings(sessionData.session.user.id)
      setSettings(userSettings)

      setEnabled(userSettings.enabled || false)
      setPercentage(userSettings.percentage || 10)
      setMinAmount(userSettings.min_transfer_amount_npr || 1000)
    } catch (err) {
      console.error('Error loading auto-save settings:', err)
      setError(err?.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage('')

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session?.user?.id) {
        throw new Error('No active session')
      }

      const userId = sessionData.session.user.id

      if (enabled) {
        await enableAutoSave(userId, percentage, minAmount)
      } else {
        await disableAutoSave(userId)
      }

      setSettings({
        ...settings,
        enabled,
        percentage,
        min_transfer_amount_npr: minAmount,
      })

      setSuccessMessage(
        enabled
          ? `Auto-save enabled: ${percentage}% of transfers above ${minAmount} NPR`
          : 'Auto-save disabled'
      )

      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError(err?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState eyebrow="Auto-Save" title="Loading settings..." />

  if (error && !settings) return <ErrorState eyebrow="Auto-Save" error={error} onRetry={loadSettings} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white p-6 rounded-lg">
        <p className="text-sm font-semibold opacity-90">Automatic Savings</p>
        <h1 className="text-3xl font-bold mt-2">Auto-Save Settings</h1>
        <p className="text-sm mt-2 opacity-75">
          Automatically save a percentage of each transfer to your vault
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg">
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Enable Auto-Save</h2>
            <p className="text-sm text-gray-600 mt-1">
              Automatically deposit a portion of each remittance to your vault
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
              enabled ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Settings (shown only if enabled) */}
      {enabled && (
        <>
          {/* Percentage Slider */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <label className="block">
              <p className="text-sm font-bold text-gray-900 mb-2">
                Save Percentage: <span className="text-green-600">{percentage}%</span>
              </p>
              <input
                type="range"
                min="1"
                max="100"
                value={percentage}
                onChange={e => setPercentage(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">
                Example: If you transfer 10,000 NPR, {percentage}% ({Math.floor((10000 * percentage) / 100)} NPR) will be saved
              </p>
            </label>
          </div>

          {/* Minimum Transfer Amount */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <label className="block">
              <p className="text-sm font-bold text-gray-900 mb-2">
                Minimum Transfer to Trigger Auto-Save
              </p>
              <input
                type="number"
                value={minAmount}
                onChange={e => setMinAmount(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                Auto-save will only trigger for transfers of {minAmount} NPR or more
              </p>
            </label>
          </div>

          {/* Preview */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-green-900 mb-3">Your Settings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-800">Auto-Save Rate:</span>
                <span className="font-semibold text-green-900">{percentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-800">Minimum Amount:</span>
                <span className="font-semibold text-green-900">{minAmount.toLocaleString()} NPR</span>
              </div>
              <div className="border-t border-green-200 pt-2 mt-2">
                <p className="text-xs text-green-700">
                  When you send a remittance, {percentage}% of the amount will be automatically added to your vault.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {!enabled && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Enable auto-save to start automatically depositing a percentage of each transfer to your vault.
            This helps you build savings while sending money.
          </p>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-blue-900 mb-3">How Auto-Save Works</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>
            <strong>1. Send a Transfer:</strong> When you send money through the remittance service
          </li>
          <li>
            <strong>2. Automatic Deposit:</strong> A percentage is automatically added to your vault
          </li>
          <li>
            <strong>3. Build Savings:</strong> Your savings grow with every remittance transfer
          </li>
          <li>
            <strong>4. Request Withdrawal:</strong> Withdraw your savings anytime with no fees
          </li>
        </ul>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
