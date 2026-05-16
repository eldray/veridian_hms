/**
 * Base Repository for Enterprise Architecture
 * Provides common database operations using Prisma
 */

import { PrismaClient } from '@prisma/client';

export interface FindManyOptions<T> {
  where?: T;
  orderBy?: any;
  skip?: number;
  take?: number;
  include?: any;
  select?: any;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class BaseRepository<Model, CreateDTO, UpdateDTO> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  /**
   * Get the model delegate from Prisma client
   */
  protected getModel(): any {
    return (this.prisma as any)[this.modelName];
  }

  /**
   * Find a record by ID
   */
  async findById(id: string, include?: any): Promise<Model | null> {
    return this.getModel().findUnique({
      where: { id },
      include
    });
  }

  /**
   * Find many records with options
   */
  async findMany(options: FindManyOptions<any> = {}): Promise<Model[]> {
    const { where, orderBy, skip, take, include, select } = options;
    
    return this.getModel().findMany({
      where,
      orderBy,
      skip,
      take,
      include,
      select
    });
  }

  /**
   * Find many records with pagination
   */
  async findManyWithPagination(
    options: FindManyOptions<any> & { page?: number; limit?: number } = {}
  ): Promise<PaginationResult<Model>> {
    const { page = 1, limit = 10, ...findManyOptions } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.getModel().findMany({
        ...findManyOptions,
        skip,
        take: limit
      }),
      this.getModel().count({
        where: findManyOptions.where
      })
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Create a new record
   */
  async create(data: CreateDTO): Promise<Model> {
    return this.getModel().create({
      data
    });
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: UpdateDTO): Promise<Model> {
    return this.getModel().update({
      where: { id },
      data
    });
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<Model> {
    return this.getModel().delete({
      where: { id }
    });
  }

  /**
   * Count records
   */
  async count(where?: any): Promise<number> {
    return this.getModel().count({ where });
  }

  /**
   * Check if a record exists
   */
  async exists(where: any): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Find first record matching criteria
   */
  async findFirst(where: any, include?: any): Promise<Model | null> {
    return this.getModel().findFirst({
      where,
      include
    });
  }

  /**
   * Execute operations in a transaction
   */
  async transaction<T>(fn: (tx: Omit<BaseRepository<Model, CreateDTO, UpdateDTO>, 'transaction'>) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const txRepo = Object.create(Object.getPrototypeOf(this));
      txRepo.prisma = tx;
      txRepo.modelName = this.modelName;
      return fn(txRepo);
    });
  }
}
