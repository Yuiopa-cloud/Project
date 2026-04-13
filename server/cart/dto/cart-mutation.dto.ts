import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Required when the product has variants (size, color, …)',
  })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ description: 'Guest cart token from first GET /cart' })
  @IsOptional()
  @IsString()
  guestToken?: string;
}

export class SetCartQtyDto {
  @ApiProperty({ description: 'Cart line id from GET /cart → items[].id' })
  @IsString()
  cartItemId!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestToken?: string;
}

export class MergeCartDto {
  @ApiProperty()
  @IsString()
  guestToken!: string;
}
