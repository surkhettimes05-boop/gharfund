export default function MonthGrid({ months, selectedMonthKey, onSelectMonth }) {
  return (
    <div className="dashboard-card">
      <p className="card-label">This year</p>
      <div className="month-grid">
        {months.map((month) => {
          const isSelected = month.monthKey === selectedMonthKey
          const statusIcon =
            month.status === 'confirmed' ? '✅' : month.status === 'pending' ? '🔄' : '⚪'

          return (
            <button
              key={month.monthKey}
              type="button"
              className={`month-grid-button${isSelected ? ' month-grid-button-active' : ''}`}
              onClick={() => onSelectMonth(month.monthKey)}
            >
              <span className="month-grid-icon" aria-hidden="true">
                {statusIcon}
              </span>
              <span>{month.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
