import express from 'express';
import { tableController } from '../controllers/table.controller.js';

const router = express.Router();

/**
 * Public Customer Table Identification & Lookup
 * GET /api/tables/:id
 * Resolves an active dining table by MongoDB _id, normalized number, or tableNumber
 * for customer QR code scanning and dine-in flow without exposing private data.
 */
router.get('/:id', tableController.getTable);

export default router;
