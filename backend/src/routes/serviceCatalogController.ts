// controllers/serviceCatalogController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import ServiceCatalog from '../models/ServiceCatalog';

export const getServiceCatalog = async (req: Request, res: Response) => {
  try {
    const { 
      serviceType, 
      category, 
      search, 
      isActive,
      page = 1, 
      limit = 50 
    } = req.query;
    
    const filter: any = {};
    if (serviceType) filter.serviceType = serviceType;
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const services = await ServiceCatalog.find(filter)
      .populate('diagnosisId', 'name icdCode')
      .populate('labTestTemplateId', 'name code')
      .populate('procedureTemplateId', 'name code')
      .populate('stockItemId', 'name brand form')
      .populate('wardId', 'wardName wardType')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await ServiceCatalog.countDocuments(filter);

    res.json({
      services,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching service catalog:', error);
    res.status(500).json({ message: 'Error fetching service catalog', error });
  }
};

export const createServiceCatalogItem = [
  body('name').notEmpty().withMessage('Name is required'),
  body('code').notEmpty().withMessage('Code is required'),
  body('serviceType').isIn(['diagnosis', 'lab_test', 'procedure', 'medication', 'ward', 'consultation', 'other'])
    .withMessage('Valid service type is required'),
  body('cashPrice').isNumeric().withMessage('Cash price must be a number'),
  body('insurancePrice').isNumeric().withMessage('Insurance price must be a number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const serviceItem = await ServiceCatalog.create(req.body);
      const populatedItem = await ServiceCatalog.findById(serviceItem._id)
        .populate('diagnosisId', 'name icdCode')
        .populate('labTestTemplateId', 'name code')
        .populate('procedureTemplateId', 'name code')
        .populate('stockItemId', 'name brand form')
        .populate('wardId', 'wardName wardType');

      res.status(201).json(populatedItem);
    } catch (error) {
      console.error('Error creating service catalog item:', error);
      res.status(500).json({ message: 'Error creating service catalog item', error });
    }
  }
];

export const getServiceCatalogById = async (req: Request, res: Response) => {
  try {
    const serviceItem = await ServiceCatalog.findById(req.params.id)
      .populate('diagnosisId', 'name icdCode')
      .populate('labTestTemplateId', 'name code')
      .populate('procedureTemplateId', 'name code')
      .populate('stockItemId', 'name brand form')
      .populate('wardId', 'wardName wardType');

    if (!serviceItem) {
      return res.status(404).json({ message: 'Service catalog item not found' });
    }

    res.json(serviceItem);
  } catch (error) {
    console.error('Error fetching service catalog item:', error);
    res.status(500).json({ message: 'Error fetching service catalog item', error });
  }
};

export const updateServiceCatalogItem = async (req: Request, res: Response) => {
  try {
    const serviceItem = await ServiceCatalog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('diagnosisId', 'name icdCode')
    .populate('labTestTemplateId', 'name code')
    .populate('procedureTemplateId', 'name code')
    .populate('stockItemId', 'name brand form')
    .populate('wardId', 'wardName wardType');

    if (!serviceItem) {
      return res.status(404).json({ message: 'Service catalog item not found' });
    }

    res.json(serviceItem);
  } catch (error) {
    console.error('Error updating service catalog item:', error);
    res.status(500).json({ message: 'Error updating service catalog item', error });
  }
};

export const deleteServiceCatalogItem = async (req: Request, res: Response) => {
  try {
    const serviceItem = await ServiceCatalog.findByIdAndDelete(req.params.id);

    if (!serviceItem) {
      return res.status(404).json({ message: 'Service catalog item not found' });
    }

    res.json({ message: 'Service catalog item deleted successfully' });
  } catch (error) {
    console.error('Error deleting service catalog item:', error);
    res.status(500).json({ message: 'Error deleting service catalog item', error });
  }
};

// Get available categories and service types
export const getServiceMetadata = async (req: Request, res: Response) => {
  try {
    const categories = await ServiceCatalog.distinct('category');
    const serviceTypes = await ServiceCatalog.distinct('serviceType');
    
    res.json({
      categories: categories.filter(Boolean),
      serviceTypes: serviceTypes.filter(Boolean)
    });
  } catch (error) {
    console.error('Error fetching service metadata:', error);
    res.status(500).json({ message: 'Error fetching service metadata', error });
  }
};
