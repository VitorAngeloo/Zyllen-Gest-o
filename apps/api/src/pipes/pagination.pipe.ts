import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { paginationSchema } from '@zyllen/shared';

export interface PaginationQuery {
    page: number;
    limit: number;
    skip: number;
    search?: string;
}

export class PaginationPipe implements PipeTransform<any, PaginationQuery> {
    transform(value: any, _metadata: ArgumentMetadata): PaginationQuery {
        const parsed = paginationSchema.parse(value);
        return {
            page: parsed.page,
            limit: parsed.limit,
            skip: (parsed.page - 1) * parsed.limit,
            search: parsed.search,
        };
    }
}
