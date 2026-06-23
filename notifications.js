// =============================================
//  NOTIFICATION ENGINE
//  Smart nudges for Indian return windows
// =============================================

const NotificationEngine = (() => {

  // Nudge schedule: days BEFORE deadline
  const NUDGE_SCHEDULE = [30, 14, 7, 3, 1];
  const QUICK_COMMERCE_NUDGE_HOURS = [23, 12, 6, 2]; // hours before midnight

  let permissionGranted = false;

  function checkPermission() {
    if (!('Notification' in window)) return false;
    permissionGranted = Notification.permission === 'granted';
    return permissionGranted;
  }

  async function requestPermission() {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    permissionGranted = result === 'granted';
    return permissionGranted;
  }

  function getDaysRemaining(deadline) {
    if (!deadline) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const d = new Date(deadline);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  }

  function getUrgencyTier(daysRemaining) {
    if (daysRemaining === null) return 'none';
    if (daysRemaining < 0) return 'expired';
    if (daysRemaining === 0) return 'today';
    if (daysRemaining <= 1) return 'critical';
    if (daysRemaining <= 3) return 'urgent';
    if (daysRemaining <= 7) return 'soon';
    if (daysRemaining <= 30) return 'ok';
    return 'safe';
  }

  function getUrgencyLabel(daysRemaining) {
    if (daysRemaining === null) return '';
    if (daysRemaining < 0) return `Expired ${Math.abs(daysRemaining)}d ago`;
    if (daysRemaining === 0) return '⚠️ Today!';
    if (daysRemaining === 1) return '🔴 Tomorrow!';
    if (daysRemaining <= 3) return `🔴 ${daysRemaining} days left`;
    if (daysRemaining <= 7) return `🟠 ${daysRemaining} days left`;
    if (daysRemaining <= 30) return `🟡 ${daysRemaining} days left`;
    return `🟢 ${daysRemaining} days left`;
  }

  function fireNotification(title, body, tag) {
    if (!permissionGranted) return;
    try {
      const n = new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🧾</text></svg>',
        tag: tag || 'billsafe',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚠️</text></svg>',
        requireInteraction: true,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  }

  function checkAndNudge(receipts) {
    checkPermission();
    const nudges = [];

    for (const receipt of receipts) {
      // Check return deadline
      if (receipt.returnDeadline && !receipt.returnDismissed) {
        const days = getDaysRemaining(receipt.returnDeadline);
        if (days !== null && days >= 0 && days <= 30) {
          nudges.push({
            receiptId: receipt.id,
            storeName: receipt.storeName,
            type: 'return',
            daysRemaining: days,
            tier: getUrgencyTier(days),
          });

          // Fire browser notification if in nudge schedule
          if (NUDGE_SCHEDULE.includes(days) || days <= 1) {
            const msg = days === 0
              ? `TODAY is the last day to return from ${receipt.storeName}!`
              : days === 1
              ? `Tomorrow is the last day to return from ${receipt.storeName}!`
              : `${days} days left to return your purchase from ${receipt.storeName}`;
            fireNotification(`⚠️ Return Deadline: ${receipt.storeName}`, msg, `return-${receipt.id}`);
          }
        }
      }

      // Check warranty deadline
      if (receipt.warrantyDeadline && !receipt.warrantyDismissed) {
        const days = getDaysRemaining(receipt.warrantyDeadline);
        if (days !== null && days >= 0 && days <= 30) {
          nudges.push({
            receiptId: receipt.id,
            storeName: receipt.storeName,
            type: 'warranty',
            daysRemaining: days,
            tier: getUrgencyTier(days),
          });

          if (NUDGE_SCHEDULE.includes(days)) {
            fireNotification(
              `🔧 Warranty Expiring: ${receipt.storeName}`,
              `Warranty expires in ${days} days. File any claims now!`,
              `warranty-${receipt.id}`
            );
          }
        }
      }
    }

    return nudges;
  }

  function getAlertSummary(receipts) {
    const alerts = [];
    for (const receipt of receipts) {
      if (receipt.returnDeadline) {
        const days = getDaysRemaining(receipt.returnDeadline);
        if (days !== null && days >= 0 && days <= 7) {
          alerts.push({
            receipt,
            type: 'return',
            days,
            tier: getUrgencyTier(days),
            message: days === 0
              ? `Last day to return from ${receipt.storeName}!`
              : `Return deadline in ${days} day${days === 1 ? '' : 's'} — ${receipt.storeName}`
          });
        }
      }
      if (receipt.warrantyDeadline) {
        const days = getDaysRemaining(receipt.warrantyDeadline);
        if (days !== null && days >= 0 && days <= 30) {
          alerts.push({
            receipt,
            type: 'warranty',
            days,
            tier: getUrgencyTier(days),
            message: `Warranty expires in ${days} days — ${receipt.storeName}`
          });
        }
      }
    }
    return alerts.sort((a, b) => a.days - b.days);
  }

  return {
    checkPermission,
    requestPermission,
    getDaysRemaining,
    getUrgencyTier,
    getUrgencyLabel,
    checkAndNudge,
    getAlertSummary,
    fireNotification,
  };
})();
