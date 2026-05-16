import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { BedRepository } from './BedRepository';
import { BedService } from './BedService';
import { BedController } from './BedController';

const prisma = new PrismaClient();
const bedRepository = new BedRepository(prisma);
const bedService = new BedService(bedRepository);
const bedController = new BedController(bedService);

const router = Router();

// GET /api/beds - Get all beds with optional filtering
router.get('/', (req, res) => bedController.getBeds(req, res));

// GET /api/beds/:id - Get bed by ID
router.get('/:id', (req, res) => bedController.getBedById(req, res));

// POST /api/beds - Create a new bed
router.post('/', (req, res) => bedController.createBed(req, res));

// PUT /api/beds/:id - Update a bed
router.put('/:id', (req, res) => bedController.updateBed(req, res));

// DELETE /api/beds/:id - Delete a bed
router.delete('/:id', (req, res) => bedController.deleteBed(req, res));

export default router;
