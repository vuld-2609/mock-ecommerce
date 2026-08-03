export class MetaDto {
  total: number;
  page: number;
  limit: number;
  totalPage: number;

  constructor(meta: Pick<MetaDto, 'page' | 'limit' | 'total'>) {
    const { page, limit, total } = meta;

    this.total = total;
    this.limit = limit;
    this.page = page;
    this.totalPage = Math.ceil(total / limit);
  }
}
