class TimeUtils {
  now() {
    return Date.now();
  }

  toUnix(date) {
    return Math.floor(date.getTime() / 1000);
  }

  fromUnix(timestamp) {
    return new Date(timestamp * 1000);
  }

  addHours(date, hours) {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  addDays(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  formatTimestamp(timestamp, format = 'full') {
    const date = new Date(timestamp);
    
    switch (format) {
      case 'date':
        return date.toLocaleDateString();
      case 'time':
        return date.toLocaleTimeString();
      case 'relative':
        return this.getRelativeTime(timestamp);
      case 'discord':
        return `<t:${Math.floor(timestamp / 1000)}:F>`;
      case 'full':
      default:
        return date.toLocaleString();
    }
  }

  getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  isExpired(timestamp) {
    return Date.now() > timestamp;
  }

  getStartOfDay(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }

  getEndOfDay(date = new Date()) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
  }

  getTimeUntil(targetTimestamp) {
    const diff = targetTimestamp - Date.now();
    return diff > 0 ? this.formatDuration(diff) : 'Expired';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new TimeUtils();
