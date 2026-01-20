//Logger per transazioni
const getDb = require("../db");

class TransactionLogger {
  //Helper per estrarre info dalla richiesta
  static extractRequestInfo(req) {
    return {
      ip:
        req.ip ||
        req.socket.remoteAddress ||
        req.headers["x-forwarded-for"] ||
        "unknown",
      userAgent: req.get("User-Agent") || "unknown",
    };
  }

  //INIZIA LOG TRANSAZIONE (quando inizia il processo)
  static async startTransaction(userId, paymentMethod, amount, req) {
    try {
      const db = await getDb();
      const { ip, userAgent } = this.extractRequestInfo(req);
      const transactionId = this.generateTransactionId();

      console.log(`[TransactionLogger] Tentativo inserimento: userId=${userId}, method=${paymentMethod}, amount=${amount}, ip=${ip}`);

      const result = await db.run(
        `
        INSERT INTO transaction_log (
          utente_id, transaction_id, payment_method, amount, 
          status, ip_address, user_agent, acquisto_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'processing', ?, ?, 0, datetime('now'), datetime('now'))
      `,
        [userId, transactionId, paymentMethod, amount, ip, userAgent]
      );

      console.log(
        `TRANSACTION START: ${transactionId} - ${paymentMethod} - €${amount} - User ${userId}`
      );

      return {
        logId: result.lastID,
        transactionId: transactionId,
      };
    } catch (error) {
      console.error("❌ [TransactionLogger] ERRORE start transaction:", error.message);
      console.error("Stack:", error.stack);
      console.error("SQL Error Code:", error.code);
      return null;
    }
  }

  //Aggiorna status transazione
  static async updateTransactionStatus(
    transactionId,
    status,
    errorMessage = null,
    acquistoId = null
  ) {
    try {
      const db = await getDb();

      await db.run(
        `
        UPDATE transaction_log 
        SET status = ?, acquisto_id = ?, updated_at = datetime('now')
        WHERE transaction_id = ?
      `,
        [status, acquistoId || 0, transactionId]
      );

      const statusEmoji = {
        processing: "⏳",
        completed: "✅",
        failed: "❌",
        refunded: "🔄",
      };

      console.log(
        `${
          statusEmoji[status] || "🔄"
        } TRANSACTION ${status.toUpperCase()}: ${transactionId}${
          errorMessage ? " - " + errorMessage : ""
        }`
      );
    } catch (error) {
      console.error("Errore update transaction status:", error);
    }
  }

  //Log transazione completata
  static async logCompletedTransaction(
    transactionId,
    acquistoId,
    details = {}
  ) {
    try {
      const db = await getDb();

      await db.run(
        `
        UPDATE transaction_log 
        SET status = 'completed', acquisto_id = ?, updated_at = datetime('now')
        WHERE transaction_id = ?
      `,
        [acquistoId, transactionId]
      );

      console.log(
        `TRANSACTION COMPLETED: ${transactionId} - Acquisto #${acquistoId}`
      );

      // Log dettagliato per debug
      if (details.items) {
        console.log(
          `Items: ${details.items
            .map((i) => `${i.quantita}x ${i.nome}`)
            .join(", ")}`
        );
      }
    } catch (error) {
      console.error("Errore log completed transaction:", error);
    }
  }

  //Log transazione fallita
  static async logFailedTransaction(
    transactionId,
    errorMessage,
  ) {
    try {
      const db = await getDb();

      await db.run(
        `
        UPDATE transaction_log 
        SET status = 'failed', updated_at = datetime('now')
        WHERE transaction_id = ?
      `,
        [transactionId]
      );

      console.log(`TRANSACTION FAILED: ${transactionId}`);
    } catch (error) {
      console.error("Errore log failed transaction:", error);
    }
  }

  //Genera ID transazione univoco
  static generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN_${timestamp}_${random}`;
  }

  //Ottieni transazioni per utente
  static async getTransactionsByUser(userId, limit = 10) {
    try {
      const db = await getDb();
      return await db.all(
        `
        SELECT 
          tl.*,
          ba.quantita,
          b.nome as biglietto_nome
        FROM transaction_log tl
        LEFT JOIN biglietti_acquistati ba ON tl.acquisto_id = ba.id
        LEFT JOIN biglietti b ON ba.biglietto_id = b.id
        WHERE tl.utente_id = ?
        ORDER BY tl.created_at DESC
        LIMIT ?
      `,
        [userId, limit]
      );
    } catch (error) {
      console.error("Errore get transactions by user:", error);
      return [];
    }
  }

  //Statistiche transazioni per admin
  static async getTransactionStats(days = 7) {
    try {
      const db = await getDb();

      const daysInt = Math.max(1, Math.min(365, parseInt(days) || 7));

      return await db.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status = 'completed' THEN amount END) as avg_transaction
      FROM transaction_log 
      WHERE created_at >= date('now', '-${daysInt} days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    } catch (error) {
      console.error("Errore get transaction stats:", error);
      return [];
    }
  }

  //Transazioni sospette (multiple fallite stesso IP)
  static async getSuspiciousTransactions(hours = 24) {
    try {
      const db = await getDb();

      const hoursInt = Math.max(1, Math.min(168, parseInt(hours) || 24));

      return await db.all(`
      SELECT 
        ip_address,
        COUNT(*) as failed_attempts,
        MAX(created_at) as last_attempt,
        GROUP_CONCAT(DISTINCT utente_id) as user_ids
      FROM transaction_log 
      WHERE status = 'failed' 
        AND created_at >= datetime('now', '-${hoursInt} hours')
      GROUP BY ip_address
      HAVING failed_attempts >= 3
      ORDER BY failed_attempts DESC, last_attempt DESC
    `);
    } catch (error) {
      console.error("Errore get suspicious transactions:", error);
      return [];
    }
  }
}

module.exports = TransactionLogger;
