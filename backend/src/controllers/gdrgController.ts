// controllers/gdrgController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getGDRGTariffs = async (req: Request, res: Response) => {
  try {
    const { category, isActive } = req.query;
    
    const where: any = {};
    if (category) where.category = category as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const tariffs = await prisma.gDRGTariff.findMany({
      where,
      orderBy: { gdrgCode: 'asc' }
    });

    res.json(tariffs);
  } catch (error) {
    console.error('Error fetching GDRG tariffs:', error);
    res.status(500).json({ 
      message: 'Error fetching GDRG tariffs', 
      error: (error as Error).message 
    });
  }
};

export const getGDRGByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    
    const tariff = await prisma.gDRGTariff.findUnique({
      where: { gdrgCode: code }
    });

    if (!tariff) {
      return res.status(404).json({ message: 'GDRG code not found' });
    }

    res.json(tariff);
  } catch (error) {
    console.error('Error fetching GDRG tariff:', error);
    res.status(500).json({ 
      message: 'Error fetching GDRG tariff', 
      error: (error as Error).message 
    });
  }
};