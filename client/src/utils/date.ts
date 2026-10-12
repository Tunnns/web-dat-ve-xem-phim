export interface DayOption {
  iso: string
  dayName: string
  dateNum: string
  label: string
}

export function getUpcomingDays(count: number = 7): DayOption[] {
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const today = new Date()

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    const dayOfWeek = d.getDay()
    const dayName = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : dayNames[dayOfWeek]
    const dateNum = `${d.getDate()}/${d.getMonth() + 1}`
    const label = `${dayName} (${dateNum})`

    return {
      iso,
      dayName,
      dateNum,
      label,
    }
  })
}
