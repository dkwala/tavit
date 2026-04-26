type AlertPrefs = {
  alertDays: number[]
  emailEnabled: boolean
  whatsappEnabled: boolean
  whatsappNumber: string
} | null

type Deadline = {
  id: string
  returnType: string
  dueDate: string
  status: 'pending' | 'filed' | 'overdue'
  gstin: string
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return 'Not set'
  return `+91 ${digits.slice(-10, -7)}XX-XX${digits.slice(-2)}`
}

function nextAlert(deadlines: Deadline[], days: number[]) {
  const now = new Date()
  const upcoming = deadlines
    .filter(deadline => deadline.status !== 'filed')
    .map(deadline => ({ deadline, due: new Date(`${deadline.dueDate}T23:59:59`) }))
    .filter(item => item.due > now)
    .sort((a, b) => a.due.getTime() - b.due.getTime())

  for (const item of upcoming) {
    for (const day of [...days].sort((a, b) => b - a)) {
      const fireAt = new Date(item.due)
      fireAt.setDate(fireAt.getDate() - day)
      if (fireAt > now) {
        return {
          deadline: item.deadline,
          day,
          fireAt,
        }
      }
    }
  }

  return null
}

export default function AlertActivityPanel({
  deadlines,
  prefs,
}: {
  deadlines: Deadline[]
  prefs: AlertPrefs
}) {
  const days = prefs?.alertDays?.length ? prefs.alertDays : [7, 3, 1]
  const emailOn = prefs?.emailEnabled ?? true
  const whatsappOn = prefs?.whatsappEnabled ?? false
  const upcomingAlert = nextAlert(deadlines, days)
  const active = emailOn || whatsappOn

  return (
    <div style={{ background: '#fff', border: '0.5px solid #dde0cc', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e2118' }}>Alert Status</div>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 600,
          color: active ? '#3a6020' : '#9aa090',
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: active ? '#7ea860' : '#c8cdb8',
            boxShadow: active ? '0 0 0 3px rgba(126,168,96,0.14)' : 'none',
          }} />
          {active ? 'Active' : 'Off'}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{
          border: '0.5px solid #eaecda',
          borderRadius: 8,
          padding: '10px 12px',
          background: '#f8f9f4',
        }}>
          <div style={{ fontSize: 11, color: '#9aa090', marginBottom: 4 }}>Channels</div>
          <div style={{ fontSize: 12, color: '#1e2118', lineHeight: 1.5 }}>
            Email {emailOn ? 'on' : 'off'} . WhatsApp {whatsappOn ? 'on' : 'off'}
          </div>
          {whatsappOn && (
            <div style={{ fontSize: 11, color: '#6b7061', marginTop: 3 }}>
              {maskPhone(prefs?.whatsappNumber ?? '')}
            </div>
          )}
        </div>

        <div style={{
          border: '0.5px solid #eaecda',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          <div style={{ fontSize: 11, color: '#9aa090', marginBottom: 4 }}>Reminder days</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {days.map(day => (
              <span key={day} style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#5a7a3a',
                background: 'rgba(90,122,58,0.08)',
                border: '0.5px solid rgba(90,122,58,0.18)',
                borderRadius: 5,
                padding: '3px 7px',
              }}>
                {day}d before
              </span>
            ))}
          </div>
        </div>

        <div style={{
          border: '0.5px solid #eaecda',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          <div style={{ fontSize: 11, color: '#9aa090', marginBottom: 4 }}>Next scheduled check</div>
          <div style={{ fontSize: 12, color: '#1e2118', lineHeight: 1.45 }}>
            {upcomingAlert
              ? `${upcomingAlert.deadline.returnType} ${upcomingAlert.day}d reminder on ${upcomingAlert.fireAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
              : 'No pending reminders in the current schedule'}
          </div>
        </div>
      </div>
    </div>
  )
}
