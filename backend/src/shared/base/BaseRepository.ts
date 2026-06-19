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
   * ✅ PRODUCTION FIX: Get model delegate, optionally using a transaction client
   */
  protected getModel(tx?: any): any {
    return tx ? tx[this.modelName] : (this.prisma as any)[this.modelName];
  }

  async findById(id: string, include?: any, tx?: any): Promise<Model | null> {
    return this.getModel(tx).findUnique({ where: { id }, include });
  }

  async findMany(options: FindManyOptions<any> = {}, tx?: any): Promise<Model[]> {
    const { where, orderBy, skip, take, include, select } = options;
    return this.getModel(tx).findMany({ where, orderBy, skip, take, include, select });
  }

  async findManyWithPagination(
    options: FindManyOptions<any> & { page?: number; limit?: number } = {},
    tx?: any
  ): Promise<PaginationResult<Model>> {
    const { page = 1, limit = 10, ...findManyOptions } = options;
    const skip = (page - 1) * limit;
    const model = this.getModel(tx);

    const [data, total] = await Promise.all([
      model.findMany({ ...findManyOptions, skip, take: limit }),
      model.count({ where: findManyOptions.where })
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data: CreateDTO, tx?: any): Promise<Model> {
    return this.getModel(tx).create({ data });
  }

  async update(id: string, data: UpdateDTO, tx?: any): Promise<Model> {
    return this.getModel(tx).update({ where: { id }, data });
  }

  async delete(id: string, tx?: any): Promise<Model> {
    return this.getModel(tx).delete({ where: { id } });
  }

  async count(where?: any, tx?: any): Promise<number> {
    return this.getModel(tx).count({ where });
  }

  async exists(where: any, tx?: any): Promise<boolean> {
    const count = await this.count(where, tx);
    return count > 0;
  }

  async findFirst(where: any, include?: any, tx?: any): Promise<Model | null> {
    return this.getModel(tx).findFirst({ where, include });
  }

  /**
   * ✅ PRODUCTION FIX: Safe, thread-safe transaction wrapper
   * Usage: await this.repo.transaction(async (tx) => { await this.repo.create(data, tx); })
   */
  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return fn(tx);
    });
  }
}