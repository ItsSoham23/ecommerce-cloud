const { Op } = require('sequelize');
const Product = require('../models/Product');

// Frequency to run the cleanup (ms). Default: 1 minute.
const DEFAULT_INTERVAL_MS = parseInt(process.env.RESERVATION_CLEANUP_INTERVAL_MS || '60000', 10);

async function clearExpiredReservations() {
  try {
    const now = new Date();
    const [affectedCount] = await Product.update(
      { reservedByOrderId: null, reservedUntil: null },
      { where: { reservedUntil: { [Op.lt]: now } } }
    );
    if (affectedCount && affectedCount > 0) {
      console.log(`expireReservations: cleared ${affectedCount} expired reservation(s)`);
    }
  } catch (err) {
    console.error('expireReservations: failed to clear expired reservations', err && err.message ? err.message : err);
  }
}

let intervalHandle = null;

function start(intervalMs = DEFAULT_INTERVAL_MS) {
  // Run immediately once, then on interval
  clearExpiredReservations();
  intervalHandle = setInterval(clearExpiredReservations, intervalMs);
  // In environments where the process may be stopped, do not keep the interval
  // from preventing graceful termination — allow clearing on SIGINT/SIGTERM.
  const stop = () => {
    if (intervalHandle) clearInterval(intervalHandle);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  console.log(`expireReservations: started (interval=${intervalMs}ms)`);
}

module.exports = { start, clearExpiredReservations };
