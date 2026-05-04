// controllers/clinicalReportsController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { ClinicalReportsService } from '../services/ClinicalReportsService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const generateLabReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    
    const report = await ClinicalReportsService.generateLabReport({ startDate: start, endDate: end });
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating lab report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const generateScanReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    
    const report = await ClinicalReportsService.generateScanReport({ startDate: start, endDate: end });
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating scan report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const generateProcedureReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    
    const report = await ClinicalReportsService.generateProcedureReport({ startDate: start, endDate: end });
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating procedure report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const generateMedicationReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    
    const report = await ClinicalReportsService.generateMedicationReport({ startDate: start, endDate: end });
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating medication report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const generateVitalsReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    
    const report = await ClinicalReportsService.generateVitalsReport({ startDate: start, endDate: end });
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating vitals report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};