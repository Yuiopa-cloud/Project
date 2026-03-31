import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Get()
  list(
    @Query('category') categorySlug?: string,
    @Query('q') q?: string,
    @Query('min') minPrice?: string,
    @Query('max') maxPrice?: string,
    @Query('sort') sort?: 'new' | 'price_asc' | 'price_desc' | 'popular',
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.products.list({
      categorySlug,
      q,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Public()
  @Get('search')
  search(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.products.suggestions(q ?? '', limit ? Number(limit) : 8);
  }

  @Public()
  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.products.bySlug(slug);
  }
}
