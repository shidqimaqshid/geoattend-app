
export const getIndonesianDay = (date: Date): string => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
};

export const getFormattedDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const isTimeInRange = (timeRangeStr: string): boolean => {
  // Format "07:00 - 08:30"
  try {
    const [startStr, endStr] = timeRangeStr.split('-').map(s => s.trim());
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = startStr.split(':').map(Number);
    const [endHour, endMin] = endStr.split(':').map(Number);

    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;

    return currentMinutes >= startTotal && currentMinutes <= endTotal;
  } catch (e) {
    console.error("Error parsing time range", timeRangeStr);
    return false;
  }
};

export const isTimePast = (timeRangeStr: string): boolean => {
    // Returns true if current time > end time
    try {
        const parts = timeRangeStr.split('-');
        if (parts.length < 2) return false;
        
        const endStr = parts[1].trim();
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        const [endHour, endMin] = endStr.split(':').map(Number);
        const endTotal = endHour * 60 + endMin;

        return currentMinutes > endTotal;
    } catch (e) {
        return false;
    }
};

export const getCurrentTime = (): string => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};
