import mongoose, { Schema } from 'mongoose';
import type { StockTransaction } from '../types';

const stockTransactionSchema = new Schema<StockTransaction>({
  stockItemId: { type: Schema.Types.ObjectId, ref: 'StockItem', required: true },
  transactionType: { type: String, required: true },
  quantity: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  reference: String,
  notes: String,
  transactionDate: { type: Date, default: Date.now },
  performedBy: { type: String, required: true },
});

export default mongoose.model('StockTransaction', stockTransactionSchema);
