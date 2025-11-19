import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, UserRole } from '@prisma/client';
const prisma = new PrismaClient();

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const { isActive, hasHead } = req.query;
    
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (hasHead === 'true') {
      where.headId = { not: null };
    } else if (hasHead === 'false') {
      where.headId = null;
    }

    const departments = await prisma.department.findMany({
      where,
      include: {
        head: {
          select: {
            id: true,
            fullName: true,
            role: true,
            email: true
          }
        },
        _count: {
          select: {
            users: true,
            appointments: {
              where: {
                appointmentDate: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: departments,
      count: departments.length
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching departments', 
      error: (error as Error).message 
    });
  }
};

export const getDepartmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        head: {
          select: {
            id: true,
            fullName: true,
            role: true,
            email: true,
            phone: true,
            specialization: true
          }
        },
        users: {
          select: {
            id: true,
            fullName: true,
            role: true,
            email: true,
            phone: true,
            isActive: true,
            specialization: true,
            createdAt: true
          },
          orderBy: { fullName: 'asc' }
        },
        appointments: {
          where: {
            appointmentDate: {
              gte: new Date()
            }
          },
          include: {
            patient: {
              select: {
                fullName: true,
                folderNumber: true,
                contact: true
              }
            },
            doctor: {
              select: {
                fullName: true,
                specialization: true
              }
            }
          },
          orderBy: {
            appointmentDate: 'asc'
          },
          take: 20
        },
        _count: {
          select: {
            users: true,
            appointments: true
          }
        }
      }
    });

    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: 'Department not found' 
      });
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching department', 
      error: (error as Error).message 
    });
  }
};

export const createDepartment = [
  body('name')
    .notEmpty().withMessage('Department name is required')
    .trim()
    .isLength({ min: 2 }).withMessage('Department name must be at least 2 characters'),
  body('description').optional().isString().trim(),
  body('headId').optional().isString(),
  body('color').optional().isString(),
  body('icon').optional().isString(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { name, description, headId, color, icon } = req.body;

      // Check for duplicate department name
      const existingDepartment = await prisma.department.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' }
        }
      });

      if (existingDepartment) {
        return res.status(400).json({ 
          success: false,
          message: 'A department with this name already exists' 
        });
      }

      // Validate head user if provided
      if (headId) {
        const headUser = await prisma.user.findUnique({
          where: { id: headId },
          select: { id: true, fullName: true, role: true }
        });

        if (!headUser) {
          return res.status(404).json({ 
            success: false,
            message: 'Head user not found' 
          });
        }

        // Optional: Validate that head user has appropriate role
        const allowedRoles: UserRole[] = ['admin', 'doctor'];
        if (!allowedRoles.includes(headUser.role)) {
          return res.status(400).json({
            success: false,
            message: 'Department head must be an admin or doctor'
          });
        }
      }

      const department = await prisma.department.create({
        data: {
          name: name.trim(),
          description: description?.trim(),
          headId,
          color: color || '#3B82F6', // Default blue color
          icon,
          isActive: true
        },
        include: {
          head: {
            select: {
              id: true,
              fullName: true,
              role: true,
              email: true
            }
          },
          _count: {
            select: {
              users: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        data: department
      });
    } catch (error) {
      console.error('Error creating department:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error creating department', 
        error: (error as Error).message 
      });
    }
  }
];

export const updateDepartment = [
  body('name')
    .optional()
    .notEmpty().withMessage('Department name cannot be empty')
    .trim()
    .isLength({ min: 2 }).withMessage('Department name must be at least 2 characters'),
  body('headId').optional().isString(),
  body('isActive').optional().isBoolean(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { id } = req.params;
      const updateData = { ...req.body };

      // Check if department exists
      const existingDepartment = await prisma.department.findUnique({
        where: { id }
      });

      if (!existingDepartment) {
        return res.status(404).json({ 
          success: false,
          message: 'Department not found' 
        });
      }

      // Check for duplicate name
      if (updateData.name) {
        const duplicateDepartment = await prisma.department.findFirst({
          where: {
            name: { equals: updateData.name, mode: 'insensitive' },
            id: { not: id }
          }
        });

        if (duplicateDepartment) {
          return res.status(400).json({ 
            success: false,
            message: 'Another department with this name already exists' 
          });
        }
        updateData.name = updateData.name.trim();
      }

      // Validate head user if provided
      if (updateData.headId !== undefined) {
        if (updateData.headId === null) {
          // Allow removing head
          updateData.headId = null;
        } else {
          const headUser = await prisma.user.findUnique({
            where: { id: updateData.headId },
            select: { id: true, fullName: true, role: true }
          });

          if (!headUser) {
            return res.status(404).json({ 
              success: false,
              message: 'Head user not found' 
            });
          }

          // Optional: Validate that head user has appropriate role
          const allowedRoles: UserRole[] = ['admin', 'doctor'];
          if (!allowedRoles.includes(headUser.role)) {
            return res.status(400).json({
              success: false,
              message: 'Department head must be an admin or doctor'
            });
          }
        }
      }

      // Handle description trimming
      if (updateData.description !== undefined) {
        updateData.description = updateData.description?.trim() || null;
      }

      const department = await prisma.department.update({
        where: { id },
        data: updateData,
        include: {
          head: {
            select: {
              id: true,
              fullName: true,
              role: true,
              email: true
            }
          },
          _count: {
            select: {
              users: true,
              appointments: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Department updated successfully',
        data: department
      });
    } catch (error) {
      console.error('Error updating department:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error updating department', 
        error: (error as Error).message 
      });
    }
  }
];

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            appointments: true
          }
        }
      }
    });

    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: 'Department not found' 
      });
    }

    if (department._count.users > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete department with assigned users. Please reassign users first.' 
      });
    }

    if (department._count.appointments > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete department with appointments. Please reassign or cancel appointments first.' 
      });
    }

    await prisma.department.delete({
      where: { id }
    });

    res.json({ 
      success: true,
      message: 'Department deleted successfully',
      data: {
        id: department.id,
        name: department.name
      }
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting department', 
      error: (error as Error).message 
    });
  }
};

export const getDepartmentUsers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, isActive } = req.query;

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: 'Department not found' 
      });
    }

    const where: any = {
      departmentId: id
    };

    if (role) where.role = role as UserRole;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        role: true,
        email: true,
        phone: true,
        specialization: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { fullName: 'asc' }
    });

    res.json({
      success: true,
      data: {
        department,
        users,
        count: users.length
      }
    });
  } catch (error) {
    console.error('Error fetching department users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching department users', 
      error: (error as Error).message 
    });
  }
};

export const assignUserToDepartment = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isString(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { id } = req.params;
      const { userId } = req.body;

      // Verify department exists
      const department = await prisma.department.findUnique({
        where: { id }
      });

      if (!department) {
        return res.status(404).json({ 
          success: false,
          message: 'Department not found' 
        });
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      // Check if user is already in a department
      if (user.departmentId) {
        return res.status(400).json({ 
          success: false,
          message: 'User is already assigned to a department. Please remove them first.' 
        });
      }

      // Assign user to department
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { departmentId: id },
        select: {
          id: true,
          fullName: true,
          role: true,
          email: true,
          department: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'User assigned to department successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Error assigning user to department:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error assigning user to department', 
        error: (error as Error).message 
      });
    }
  }
];

export const removeUserFromDepartment = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isString(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { id } = req.params;
      const { userId } = req.body;

      // Verify user exists and is in this department
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          departmentId: id
        }
      });

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found in this department' 
        });
      }

      // Remove user from department
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { departmentId: null },
        select: {
          id: true,
          fullName: true,
          role: true,
          email: true
        }
      });

      res.json({
        success: true,
        message: 'User removed from department successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Error removing user from department:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error removing user from department', 
        error: (error as Error).message 
      });
    }
  }
];

export const getDepartmentStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: 'Department not found' 
      });
    }

    const [
      userCount,
      activeUserCount,
      todayAppointments,
      upcomingAppointments,
      usersByRole
    ] = await Promise.all([
      // Total users in department
      prisma.user.count({
        where: { departmentId: id }
      }),
      // Active users in department
      prisma.user.count({
        where: { 
          departmentId: id,
          isActive: true
        }
      }),
      // Today's appointments
      prisma.appointment.count({
        where: {
          departmentId: id,
          appointmentDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      // Upcoming appointments (next 7 days)
      prisma.appointment.count({
        where: {
          departmentId: id,
          appointmentDate: {
            gte: new Date(),
            lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      // Users grouped by role
      prisma.user.groupBy({
        by: ['role'],
        where: { departmentId: id },
        _count: true
      })
    ]);

    const stats = {
      department,
      users: {
        total: userCount,
        active: activeUserCount,
        byRole: usersByRole
      },
      appointments: {
        today: todayAppointments,
        upcoming: upcomingAppointments
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching department statistics', 
      error: (error as Error).message 
    });
  }
};

export const bulkUpdateDepartments = [
  body('departments')
    .isArray().withMessage('Departments must be an array')
    .notEmpty().withMessage('Departments array cannot be empty'),
  body('departments.*.id')
    .notEmpty().withMessage('Department ID is required'),
  body('departments.*.isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { departments } = req.body;

      const results = await prisma.$transaction(
        departments.map((dept: any) =>
          prisma.department.update({
            where: { id: dept.id },
            data: {
              isActive: dept.isActive,
              ...(dept.color && { color: dept.color }),
              ...(dept.icon && { icon: dept.icon })
            },
            select: {
              id: true,
              name: true,
              isActive: true,
              color: true,
              icon: true
            }
          })
        )
      );

      res.json({
        success: true,
        message: `Successfully updated ${results.length} departments`,
        data: results
      });
    } catch (error) {
      console.error('Error in bulk department update:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error updating departments', 
        error: (error as Error).message 
      });
    }
  }
];