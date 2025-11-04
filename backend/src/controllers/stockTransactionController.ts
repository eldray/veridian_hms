import { Request, Response } from 'express';
import StockTransactionModel from '../models/StockTransaction';
import { body, validationResult } from 'express-validator';

export const getStockTransactions = async (req: Request, res: Response) => {
  const transactions = await StockTransactionModel.find().populate('stockItemId');
  res.json(transactions);
};

export const getStockTransactionById = async (req: Request, res: Response) => {
  const transaction = await StockTransactionModel.findById(req.params.id).populate('stockItemId');
  if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
  res.json(transaction);
};

export const createStockTransaction = [
  body('stockItemId').notEmpty(),
  body('transactionType').notEmpty(),
  body('quantity').isNumeric(),
  body('performedBy').notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const transaction = await StockTransactionModel.create(req.body);
    res.status(201).json(transaction);
  }
];

export const updateStockTransaction = [
  body('quantity').optional().isNumeric(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const transaction = await StockTransactionModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json(transaction);
  }
];
